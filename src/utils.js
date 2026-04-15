const units = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty"];

function wholeToWords(n) {
  if (isNaN(n) || n < 0 || n > 50) return '';
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  
  const digitUnits = n % 10;
  const digitTens = Math.floor(n / 10);
  
  return tens[digitTens] + (digitUnits !== 0 ? " " + units[digitUnits] : "");
}

export function numberToWords(num) {
  if (num === null || num === undefined || num === '') return '';
  const strVal = String(num).trim();
  const normalized = strVal.toUpperCase().replace(/[^A-Z]/g, '');
  if (normalized === 'AB' || normalized === 'ABSENT') return '-- Absent --';

  // Validate number format including decimals
  if (!/^\d+(\.\d+)?$/.test(strVal)) return '';
  
  const parts = strVal.split('.');
  const whole = parseInt(parts[0], 10);
  let words = wholeToWords(whole);
  if (!words) return '';
  
  if (parts.length > 1 && parts[1]) {
    words += " Point";
    for (let i = 0; i < parts[1].length; i++) {
        const digit = parseInt(parts[1][i], 10);
        words += " " + units[digit];
    }
  }
  
  return words;
}
