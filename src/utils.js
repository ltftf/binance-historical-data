import "./extendDate.js";
import crypto from "crypto";

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

export function getChecksum(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function getList(arr) {
  return arr.map((e) => `'${e}'`).join(", ");
}
