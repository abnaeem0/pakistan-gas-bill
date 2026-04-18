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
  const usageCard = document.getElementById('usage-card');
  const resultCard = document.getElementById('result-card');
  const whatifCard = document.getElementById('whatif-card');

  if (!result) {
    usageCard.classList.add('hidden');
    resultCard.classList.add('hidden');
    return;
  }

  // Usage card
  document.getElementById('usage-display').textContent = `${fmt(usageM3)} m³`;
  document.getElementById('usage-sub').textContent =
    `${days} day${days !== 1 ? 's' : ''} · ${dailyAvg.toFixed(1)} m³/day average`;
  usageCard.classList.remove('hidden');

  // Bill card
  document.getElementById('r-gas').textContent = `Rs ${fmt(result.gasCharges)}`;
  document.getElementById('r-fixed').textContent = `Rs ${fmt(result.fixedCharges)}`;
  const gst = (parseFloat(result.total) - parseFloat(result.totalBeforeGST)).toFixed(0);
  document.getElementById('r-gst-label').textContent = `GST (17%)`;
  document.getElementById('r-gst').textContent = `Rs ${fmt(gst)}`;
  document.getElementById('r-total').textContent = `Rs ${fmt(result.total)}`;
  document.getElementById('slab-breakdown').innerHTML = slabHTML(result.slabBreakdown);
  resultCard.classList.remove('hidden');

  whatifCard.classList.remove('hidden');
}

/* ---------- Slab toggles ---------- */
export function setupSlabToggle() {
  [['slab-toggle', 'slab-breakdown'], ['whatif-slab-toggle', 'whatif-slab']].forEach(([btnId, panelId]) => {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    if (!btn || !panel) return;
    btn.classList.remove('hidden');
    // Reset state
    panel.classList.add('hidden');
    btn.textContent = '▶ Show slab breakdown';
    btn.onclick = () => {
      const open = !panel.classList.contains('hidden');
      panel.classList.toggle('hidden', open);
      btn.textContent = open ? '▶ Show slab breakdown' : '▼ Hide slab breakdown';
    };
  });
}

/* ---------- What-if slider ---------- */
export function setupSlider(dailyAvg, totalConsumedM3, daysRemaining, userType) {
  const slider = document.getElementById('daily-slider');
  const sliderVal = document.getElementById('slider-val');
  const minusBtn = document.getElementById('minus-btn');
  const plusBtn = document.getElementById('plus-btn');
  const deltaBox = document.getElementById('delta-box');
  const whatifSlab = document.getElementById('whatif-slab');
  const actualAvg = document.getElementById('actual-avg');

  actualAvg.textContent = `Your actual avg: ${dailyAvg.toFixed(1)} m³/day`;

  slider.value = dailyAvg;
  sliderVal.textContent = dailyAvg.toFixed(1);

  // Base bill at actual avg for delta comparison
  const baseBill = parseFloat(
    calculateBill(userType, totalConsumedM3 + dailyAvg * daysRemaining).total
  );

  function update(val) {
    val = Math.max(0, Math.min(50, Math.round(parseFloat(val) * 2) / 2)); // snap to 0.5
    slider.value = val;
    sliderVal.textContent = val.toFixed(1);

    if (daysRemaining <= 0) {
      deltaBox.className = 'delta-box same';
      deltaBox.textContent = 'Billing period complete — no days remaining.';
      return;
    }

    try {
      const projectedM3 = totalConsumedM3 + val * daysRemaining;
      const result = calculateBill(userType, projectedM3);
      const projectedBill = parseFloat(result.total);
      const diff = projectedBill - baseBill;
      const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
      const absDiff = Math.abs(diff);

      deltaBox.className = diff > 0 ? 'delta-box up' : diff < 0 ? 'delta-box down' : 'delta-box same';
      deltaBox.textContent = diff === 0
        ? `Same as current · est. bill Rs ${fmt(projectedBill)}`
        : `${val.toFixed(1)} m³/day · est. bill Rs ${fmt(projectedBill)} · ${sign}Rs ${fmt(absDiff)} vs current`;

      whatifSlab.innerHTML = slabHTML(result.slabBreakdown);
    } catch (err) {
      deltaBox.className = 'delta-box';
      deltaBox.textContent = 'Error calculating.';
    }
  }

  slider.addEventListener('input', () => update(slider.value));
  minusBtn.addEventListener('click', () => update(parseFloat(slider.value) - 0.5));
  plusBtn.addEventListener('click', () => update(parseFloat(slider.value) + 0.5));

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
  document.querySelectorAll('.toggle-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === h.userType);
  });
  if (window.renderMeter) {
    window.renderMeter('prev-meter', h.prevValue);
    window.renderMeter('curr-meter', h.currValue);
  }
}
