import { calculateBill } from './calculator.js';
import { renderBill, setupSlider, setupSlabToggle, saveHistory, renderHistory } from './ui.js';

/* ---------- State ---------- */
let userType = 'protected';
let lastCalcState = null; // store inputs so toggle can recalculate

/* ---------- Helpers ---------- */
function daysBetween(d1, d2) {
  return Math.max(
    Math.ceil((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24)),
    1
  );
}

function cleanReading(val) {
  return String(val).replace(/\D/g, '').slice(0, 5);
}

function formatReading(val) {
  return cleanReading(val).padStart(5, '0');
}

/* ---------- Meter Renderer ---------- */
export function renderMeter(id, value) {
  const container = document.getElementById(id);
  if (!container) return;

  const digits = formatReading(value).split('');
  container.innerHTML = '';

  digits.forEach(d => {
    const el = document.createElement('div');
    el.className = 'digit-box';
    el.textContent = d;
    container.appendChild(el);
  });

  const decimal = document.createElement('div');
  decimal.className = 'decimal-box';
  decimal.textContent = '.';
  container.appendChild(decimal);

  ['0', '0', '0'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'digit-box red';
    el.textContent = d;
    container.appendChild(el);
  });

  const unit = document.createElement('div');
  unit.className = 'unit-box';
  unit.textContent = 'm³';
  container.appendChild(unit);
}

window.renderMeter = renderMeter;

/* ---------- Core calculate function ---------- */
function runCalculation() {
  if (!lastCalcState) return;
  const { prevDate, currDate, prevValue, currValue } = lastCalcState;

  const usageM3 = currValue - prevValue;
  const days = daysBetween(prevDate, currDate);
  const dailyAvg = usageM3 / days;
  const daysRemaining = Math.max(30 - days, 0);

  // Always project to a full 30-day cycle at current daily rate
  const projectedM3 = dailyAvg * 30;
  const billResult = calculateBill(userType, projectedM3);

  renderBill(billResult, usageM3, days, dailyAvg);
  setupSlider(dailyAvg, usageM3, daysRemaining, userType);
  setupSlabToggle();
}

/* ---------- User type toggle ---------- */
document.querySelectorAll('.toggle-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    userType = btn.dataset.value;
    localStorage.setItem('userType', userType);
    runCalculation(); // recalculate if we already have results
  });
});

const savedType = localStorage.getItem('userType');
if (savedType) {
  userType = savedType;
  document.querySelectorAll('.toggle-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === savedType);
  });
}

/* ---------- Input handling ---------- */
['prev-value', 'curr-value'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => { el.value = cleanReading(el.value); });
  el.addEventListener('blur', () => {
    el.value = cleanReading(el.value);
    renderMeter(id.replace('value', 'meter'), el.value);
  });
});

/* ---------- Autofill ---------- */
function autofillDates() {
  const today = new Date();
  const currDateInput = document.getElementById('curr-date');
  if (currDateInput && !currDateInput.value) currDateInput.valueAsDate = today;

  const history = JSON.parse(localStorage.getItem('gasHistory') || '[]');
  if (!history.length) return;

  const lastPrevDate = new Date(history[0].prevDate);
  let autofillDate = new Date(today.getFullYear(), today.getMonth(), lastPrevDate.getDate() + 1);
  if (autofillDate > today) autofillDate.setMonth(autofillDate.getMonth() - 1);

  const prevDateInput = document.getElementById('prev-date');
  if (prevDateInput && !prevDateInput.value) prevDateInput.valueAsDate = autofillDate;
}

/* ---------- Calculate button ---------- */
document.getElementById('calc-btn').addEventListener('click', () => {
  try {
    const prevDate = document.getElementById('prev-date').value;
    const currDate = document.getElementById('curr-date').value;
    const prevValue = parseInt(cleanReading(document.getElementById('prev-value').value), 10);
    const currValue = parseInt(cleanReading(document.getElementById('curr-value').value), 10);

    if (!prevDate || !currDate) throw new Error('Please enter both dates.');
    if (isNaN(prevValue) || isNaN(currValue)) throw new Error('Please enter both meter readings.');
    if (currValue < prevValue) {
      if (!confirm('Current reading is lower than previous — continue anyway?')) return;
    }

    // Store state so toggle can recalculate
    lastCalcState = { prevDate, currDate, prevValue, currValue };
    runCalculation();

    const usageM3 = currValue - prevValue;
    const days = daysBetween(prevDate, currDate);
    const dailyAvg = usageM3 / days;
    const daysRemaining = Math.max(30 - days, 0);
    const projectedM3 = dailyAvg * 30;
    const billResult = calculateBill(userType, projectedM3);

    saveHistory({ prevDate, prevValue, currDate, currValue, userType, dailyAvg, total: billResult.total });
    document.getElementById('usage-card').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    alert(err.message);
  }
});

/* ---------- Init ---------- */
autofillDates();
renderHistory();
renderMeter('prev-meter', '');
renderMeter('curr-meter', '');
