import { calculateBill } from './calculator.js';

const billSummary = document.getElementById('bill-summary');
const slider = document.getElementById('daily-slider');
const sliderValue = document.getElementById('slider-value');
const sliderMarker = document.getElementById('slider-marker');
const sliderBill = document.getElementById('slider-bill');
const historyList = document.getElementById('history-list');

export function renderBill(result) {
  if (!result) {
    billSummary.innerHTML = "<p>Error calculating bill.</p>";
    return;
  }
  const breakdown = result.slabBreakdown || [];
  let html = `
    <p>Usage: ${result.usageM3 || 0} m³ (${result.usageHm3 || 0} hm³)</p>
    <p>Gas Charges: Rs. ${result.gasCharges || 0}</p>
    <p>Fixed Charges: Rs. ${result.fixedCharges || 0}</p>
    <p>Total before GST: Rs. ${result.totalBeforeGST || 0}</p>
    <p>Total with GST: Rs. ${result.total || 0}</p>
    <h3>Slab Breakdown</h3>
    <ul>
      ${breakdown.length ? breakdown.map(s => `<li>${s.slab}: ${s.usage} hm³ × 3.72 (mmbtu/hm³) x Rs ${s.rate} = Rs ${s.amount}</li>`).join('') : '<li>No slabs applied</li>'}
    </ul>
  `;
  billSummary.innerHTML = html;
}

export function setupSlider(currentDailyAvg, totalConsumedM3, daysRemaining, userType) {
  slider.value = currentDailyAvg;
  sliderMarker.innerText = `Current Avg: ${currentDailyAvg.toFixed(2)} m³/day x ${daysRemaining} days remaining`;
  sliderValue.innerText = `${currentDailyAvg.toFixed(2)} m³/day`;

  slider.oninput = () => {
    const sliderUsage = parseFloat(slider.value);
    sliderValue.innerText = `${sliderUsage.toFixed(2)} m³/day`;
    try {
      const extrapolatedM3 = totalConsumedM3 + sliderUsage * daysRemaining;
      const billResult = calculateBill(userType, extrapolatedM3);
      const breakdown = billResult.slabBreakdown || [];
      sliderBill.innerHTML = `
        <p>Projected Usage: ${billResult.usageM3} m³</p>
        <p>Total Consumed So Far: ${totalConsumedM3.toFixed(2)} m³</p>
        <p>Projected Bill: Rs. ${billResult.total}</p>
        <h3>Slab Breakdown</h3>
        <ul>
          ${breakdown.length ? breakdown.map(s => `<li>${s.slab}: ${s.usage} hm³ × 3.72 (mmbtu/hm³) x Rs ${s.rate} = Rs ${s.amount}</li>`).join('') : '<li>No slabs applied</li>'}
        </ul>
        `;
    } catch (err) {
      sliderBill.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  };
}

export function saveHistory(entry) {
  let history = JSON.parse(localStorage.getItem('gasHistory') || '[]');
  history.unshift(entry);
  if (history.length > 10) history.pop();
  localStorage.setItem('gasHistory', JSON.stringify(history));
  renderHistory();
}

export function renderHistory() {
  let history = JSON.parse(localStorage.getItem('gasHistory') || '[]');
  historyList.innerHTML = '';
  history.forEach(h => {
    const li = document.createElement('li');
    li.textContent = `${h.prevDate} → ${h.currDate} | ${h.userType} | Bill: Rs ${h.total || 0}`;
    li.onclick = () => fillFormFromHistory(h);
    historyList.appendChild(li);
  });
}

function fillFormFromHistory(h) {
  document.getElementById('prev-date').value = h.prevDate;
  document.getElementById('prev-value').value = h.prevValue;
  document.getElementById('curr-date').value = h.currDate;
  document.getElementById('curr-value').value = h.currValue;
  document.getElementById('user-type').value = h.userType;
}
