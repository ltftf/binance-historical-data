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

export function sortZips(zips) {
  zips.sort((a, b) => {
    const dates = [];
    for (const fileName of [a, b]) {
      const [, , ...date] = fileName.replace(".zip", "").split("-");
      dates.push(date.map(d => parseInt(d)));
    }
    for (let i = 0; i < dates[0].length; i++) {
      const dateA = dates[0][i];
      const dateB = dates[1][i];
      if (dateA !== dateB) {
        return dateA - dateB;
      }
    }
  });
}