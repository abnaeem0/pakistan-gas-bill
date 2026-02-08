import { calculateBill } from './calculator.js';
import { renderBill, setupSlider, saveHistory, renderHistory } from './ui.js';

const form = document.getElementById('bill-form');

function daysBetween(d1, d2) {
  return Math.max(Math.ceil((new Date(d2) - new Date(d1)) / (1000*60*60*24)),1);
}

function computeUsage(prevDate, prevValue, currDate, currValue) {
  const usageM3 = currValue - prevValue;
  const days = daysBetween(prevDate, currDate);
  const dailyAvg = usageM3 / days;
  const projectedM3 = dailyAvg * 31; // 30-day projection
  return { usageM3, dailyAvg, projectedM3, days };
}

function autofillPrevDate() {
  
  // Prefill current date
  const today = new Date();
  const currDateInput = document.getElementById('curr-date');
  if (currDateInput) currDateInput.valueAsDate = today;

  // Set user type
  const userTypeInput = document.getElementById('user-type');
  if (userTypeInput) userTypeInput.value = 'nonProtected';


  const history = JSON.parse(localStorage.getItem('gasHistory') || '[]');
  if (!history.length) return;
  const lastPrevDate = new Date(history[0].prevDate);
  
  let autofillDate = new Date(today.getFullYear(), today.getMonth(), lastPrevDate.getDate() + 1);
  if (autofillDate > today) autofillDate.setMonth(autofillDate.getMonth() - 1);
  document.getElementById('prev-date').valueAsDate = autofillDate;

  
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    const prevDate = document.getElementById('prev-date').value;
    const prevValue = parseFloat(document.getElementById('prev-value').value);
    const currDate = document.getElementById('curr-date').value;
    const currValue = parseFloat(document.getElementById('curr-value').value);
    const userType = document.getElementById('user-type').value;

    if (!prevDate || !currDate) throw new Error("Please enter both dates.");
    if (isNaN(prevValue) || isNaN(currValue)) throw new Error("Please enter numeric readings.");
    if (currValue <= prevValue) throw new Error("Current reading must be higher than previous reading.");
    if (!['protected','nonProtected'].includes(userType)) throw new Error("Invalid user type.");

    const { usageM3, dailyAvg, projectedM3, days } = computeUsage(prevDate, prevValue, currDate, currValue);

    const billResult = calculateBill(userType, projectedM3);
    renderBill(billResult);

    setupSlider(dailyAvg, usageM3, Math.max(30 - days,0), userType);

    saveHistory({ prevDate, prevValue, currDate, currValue, userType, dailyAvg, total: billResult.total });

  } catch (err) {
    alert('Error: ' + err.message);
  }
});

autofillPrevDate();
renderHistory();
