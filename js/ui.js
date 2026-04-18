import { calculateBill } from './calculator.js';

/* ---------- Element refs ---------- */
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');

/* ---------- Formatters ---------- */
function fmt(n) {
  return Number(n).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------- Slab breakdown HTML ---------- */
function slabHTML(breakdown) {
  if (!breakdown || !breakdown.length) return '<div class="slab-row"><span>No slabs</span></div>';
  return breakdown.map(s =>
    `<div class="slab-row">
      <span>${s.slab}</span>
      <span>Rs ${fmt(s.amount)}</span>
    </div>`
  ).join('');
}

/* ---------- Render bill result ---------- */
export function renderBill(result, usageM3, days, dailyAvg) {
  const resultCard = document.getElementById('result-card');
  const whatifCard = document.getElementById('whatif-card');

  if (!result) {
    resultCard.classList.add('hidden');
    return;
  }

  // Usage summary
  document.getElementById('usage-display').textContent = `${fmt(usageM3)} m³`;
  document.getElementById('usage-sub').textContent =
    `${days} day${days !== 1 ? 's' : ''} · ${dailyAvg.toFixed(1)} m³/day average`;

  // Charges
  document.getElementById('r-gas').textContent = `Rs ${fmt(result.gasCharges)}`;
  document.getElementById('r-fixed').textContent = `Rs ${fmt(result.fixedCharges)}`;

  const gst = (parseFloat(result.total) - parseFloat(result.totalBeforeGST)).toFixed(0);
  document.getElementById('r-gst-label').textContent = `GST (17%)`;
  document.getElementById('r-gst').textContent = `Rs ${fmt(gst)}`;
  document.getElementById('r-total').textContent = `Rs ${fmt(result.total)}`;

  // Slab breakdown
  document.getElementById('slab-breakdown').innerHTML = slabHTML(result.slabBreakdown);

  resultCard.classList.remove('hidden');
  whatifCard.classList.remove('hidden');
}

/* ---------- Slab toggle ---------- */
export function setupSlabToggle() {
  const btn = document.getElementById('slab-toggle');
  const panel = document.getElementById('slab-breakdown');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    const open = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden', open);
    btn.textContent = open ? '▶ Show slab breakdown' : '▼ Hide slab breakdown';
  });

  const btn2 = document.getElementById('whatif-slab-toggle');
  const panel2 = document.getElementById('whatif-slab');
  if (!btn2 || !panel2) return;

  btn2.addEventListener('click', () => {
    const open = !panel2.classList.contains('hidden');
    panel2.classList.toggle('hidden', open);
    btn2.textContent = open ? '▶ Show slab breakdown' : '▼ Hide slab breakdown';
  });
}

/* ---------- What-if slider ---------- */
export function setupSlider(dailyAvg, totalConsumedM3, daysRemaining, userType) {
  const slider = document.getElementById('daily-slider');
  const numInput = document.getElementById('daily-input');
  const minusBtn = document.getElementById('minus-btn');
  const plusBtn = document.getElementById('plus-btn');
  const deltaBox = document.getElementById('delta-box');
  const whatifSlab = document.getElementById('whatif-slab');
  const whatifSlabToggle = document.getElementById('whatif-slab-toggle');
  const actualAvg = document.getElementById('actual-avg');

  actualAvg.textContent = `Your actual avg: ${dailyAvg.toFixed(1)} m³/day (fixed)`;

  // Set slider to actual avg as starting point
  slider.value = dailyAvg;
  numInput.value = dailyAvg.toFixed(1);

  // Get current bill for delta comparison
  const baseBill = parseFloat(
    calculateBill(userType, totalConsumedM3 + dailyAvg * daysRemaining).total
  );

  function update(val) {
    val = Math.max(0, Math.min(50, parseFloat(val) || 0));
    slider.value = val;
    numInput.value = val.toFixed(1);

    if (daysRemaining <= 0) {
      deltaBox.className = 'delta-box same';
      deltaBox.textContent = 'Billing period is complete.';
      return;
    }

    try {
      const projectedM3 = totalConsumedM3 + val * daysRemaining;
      const result = calculateBill(userType, projectedM3);
      const projectedBill = parseFloat(result.total);
      const diff = projectedBill - baseBill;
      const sign = diff > 0 ? '+' : '';

      deltaBox.className = diff > 0 ? 'delta-box up' : diff < 0 ? 'delta-box down' : 'delta-box same';
      deltaBox.textContent =
        `${val.toFixed(1)} m³/day · est. bill Rs ${fmt(projectedBill)} · ${sign}Rs ${fmt(Math.abs(diff))}`;

      whatifSlab.innerHTML = slabHTML(result.slabBreakdown);
      whatifSlabToggle.classList.remove('hidden');
    } catch (err) {
      deltaBox.className = 'delta-box';
      deltaBox.textContent = 'Error calculating.';
    }
  }

  slider.addEventListener('input', () => update(slider.value));
  numInput.addEventListener('input', () => update(numInput.value));
  minusBtn.addEventListener('click', () => update((parseFloat(numInput.value) - 0.5).toFixed(1)));
  plusBtn.addEventListener('click', () => update((parseFloat(numInput.value) + 0.5).toFixed(1)));

  update(dailyAvg);
}

/* ---------- History ---------- */
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

  if (!history.length) {
    historyEmpty.classList.remove('hidden');
    return;
  }

  historyEmpty.classList.add('hidden');
  history.forEach(h => {
    const li = document.createElement('li');
    const type = h.userType === 'protected' ? 'Protected' : 'Non-protected';
    li.textContent = `${fmtDate(h.prevDate)} → ${fmtDate(h.currDate)}  ·  ${type}  ·  Rs ${fmt(h.total)}`;
    li.addEventListener('click', () => fillFormFromHistory(h));
    historyList.appendChild(li);
  });
}

function fillFormFromHistory(h) {
  document.getElementById('prev-date').value = h.prevDate;
  document.getElementById('prev-value').value = h.prevValue;
  document.getElementById('curr-date').value = h.currDate;
  document.getElementById('curr-value').value = h.currValue;

  // Update toggle pill
  document.querySelectorAll('.toggle-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === h.userType);
  });

  // Re-render meters
  if (window.renderMeter) {
    window.renderMeter('prev-meter', h.prevValue);
    window.renderMeter('curr-meter', h.currValue);
  }
}
