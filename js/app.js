import { calculateBill } from './calculator.js';
import { renderBill, setupSlider, saveHistory, renderHistory } from './ui.js';

const form = document.getElementById('bill-form');

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

function renderMeter(id, value) {
  const container = document.getElementById(id);
  if (!container) return;

  const digits = formatReading(value).split('');
  container.innerHTML = '';

  // 5 main digits
  digits.forEach(d => {
    const el = document.createElement('div');
    el.className = 'digit-box';
    el.textContent = d;
    container.appendChild(el);
  });

  // decimal separator
  const decimal = document.createElement('div');
  decimal.className = 'decimal-box';
  decimal.textContent = '.';
  container.appendChild(decimal);

  // 3 red digits (fixed visual)
  ['0', '0', '0'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'digit-box red';
    el.textContent = d;
    container.appendChild(el);
  });

  // unit
  const unit = document.createElement('div');
  unit.className = 'unit-box';
  unit.textContent = 'm³';
  container.appendChild(unit);
}

/* ---------- Usage Logic ---------- */

function computeUsage(prevDate, prevValue, currDate, currValue) {
  const usageM3 = currValue - prevValue;
  const days = daysBetween(prevDate, currDate);
  const dailyAvg = usageM3 / days;

  const projectedM3 = dailyAvg * days; // dynamic cycle

  return { usageM3, dailyAvg, projectedM3, days };
}

/* ---------- Autofill ---------- */

function autofillPrevDate() {
  const today = new Date();

  const currDateInput = document.getElementById('curr-date');
  if (currDateInput) currDateInput.valueAsDate = today;

  const userTypeInput = document.getElementById('user-type');
  if (userTypeInput) userTypeInput.value = 'nonProtected';

  const history = JSON.parse(localStorage.getItem('gasHistory') || '[]');
  if (!history.length) return;

  const lastPrevDate = new Date(history[0].prevDate);

  let autofillDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    lastPrevDate.getDate() + 1
  );

  if (autofillDate > today) {
    autofillDate.setMonth(autofillDate.getMonth() - 1);
  }

  document.getElementById('prev-date').valueAsDate = autofillDate;
}

/* ---------- Input Handling ---------- */

['prev-value', 'curr-value'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener('input', () => {
    el.value = cleanReading(el.value);
  });

  el.addEventListener('blur', () => {
    el.value = cleanReading(el.value);
    renderMeter(id.replace('value', 'meter'), el.value);
  });
});

/* ---------- Submit ---------- */

form.addEventListener('submit', (e) => {
  e.preventDefault();

  try {
    const prevDate = document.getElementById('prev-date').value;
    const currDate = document.getElementById('curr-date').value;

    const prevValue = parseInt(cleanReading(document.getElementById('prev-value').value), 10);
    const currValue = parseInt(cleanReading(document.getElementById('curr-value').value), 10);

    const userType = document.getElementById('user-type').value;

    if (!prevDate || !currDate) {
      throw new Error("Please enter both dates.");
    }

    if (isNaN(prevValue) || isNaN(currValue)) {
      throw new Error("Invalid readings.");
    }

    if (currValue < prevValue) {
      alert("Warning: current reading is lower than previous.");
    }

    const { usageM3, dailyAvg, projectedM3, days } =
      computeUsage(prevDate, prevValue, currDate, currValue);

    const billResult = calculateBill(userType, projectedM3);

    renderBill(billResult);
    setupSlider(dailyAvg, usageM3, Math.max(30 - days, 0), userType);

    saveHistory({
      prevDate,
      prevValue,
      currDate,
      currValue,
      userType,
      dailyAvg,
      total: billResult.total
    });

  } catch (err) {
    alert(err.message);
  }
});

/* ---------- Toggle Meter Mode ---------- */

const toggleBtn = document.getElementById('meter-toggle');

if (localStorage.getItem('meterMode') === 'on') {
  document.body.classList.add('meter-mode');
}

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('meter-mode');

    localStorage.setItem(
      'meterMode',
      document.body.classList.contains('meter-mode') ? 'on' : 'off'
    );
  });
}

/* ---------- Init ---------- */

autofillPrevDate();
renderHistory();

renderMeter('prev-meter', '');
renderMeter('curr-meter', '');
