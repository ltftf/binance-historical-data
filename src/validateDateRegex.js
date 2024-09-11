function getMonthValueList(){
  let monthValues = [];
  for (let i = 1; i <= 12; i++) {
    monthValues.push(i.toString().padStart(2, "0"));
  }
  return monthValues.join("|");
}
function getDayValueList(){
  let monthValues = [];
  for (let i = 1; i <= 31; i++) {
    monthValues.push(i.toString().padStart(2, "0"));
  }
  return monthValues.join("|");
}

const monthRegexStr = `20\\d{2}-(?:${getMonthValueList()})`;
export const byMonthRegex = new RegExp(`^${monthRegexStr}$`);
export const byDayRegex = new RegExp(`^${monthRegexStr}-(?:${getDayValueList()})$`);
