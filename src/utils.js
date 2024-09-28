import "./extendDate.js";

export function generateDates(byDay, startDate, endDate) {
  const dates = [startDate];
  if (endDate) {
    let lastDate = new Date(startDate);
    while (lastDate.getBinanceDate(byDay) !== endDate) {
      lastDate = new Date(
        +lastDate + 60000 * 60 * 24 * (byDay ? 1 : lastDate.daysInMonth())
      );
      dates.push(lastDate.getBinanceDate(byDay));
    }
  }
  return dates;
}

export function getList(arr) {
  return arr.map((e) => `'${e}'`).join(", ");
}
