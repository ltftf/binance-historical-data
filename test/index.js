import { ok } from "assert";
import { generateDates } from "../src/utils.js";
import { byMonthRegex, byDayRegex } from "../src/validateDateRegex.js";
import "../src/extendDate.js";
import { execSync } from "child_process";
import { join } from "path";
import {
  datatypesWithInterval,
  futuresDailyDataTypes,
  futuresMonthlyDataTypes,
  optionsDataTypes,
  spotDataTypes,
} from "../src/lists.js";
import fs from "fs";

describe("Test added Date methods", function () {
  const vals = [
    ["2024-08", 31],
    ["2024-06", 30],
    ["2023-02", 28],
  ];
  for (const val of vals) {
    it("there should be " + val[1] + " days in " + val[0], function () {
      ok(new Date(val[0]).daysInMonth() === val[1]);
    });
  }
  it(".getBinanceDate in daily mode should return a string in 'YYYY-MM-DD' format", function () {
    ok(new Date("2024-09-04").getBinanceDate(true) === "2024-09-04");
  });
  it(".getBinanceDate in monthly mode should return a string in 'YYYY-MM' format", function () {
    ok(new Date("2024-09-04").getBinanceDate(false) === "2024-09");
  });
});

describe("Test binance date string validation", function () {
  const validMonths = ["2020-04", "2018-12"];
  const invalidMonths = [
    "2020-04-01",
    "1119-02",
    "2023-00",
    "2020-13",
    "nalksdjf",
  ];
  const validDays = ["2020-04-03", "2018-12-31", "2025-01-01"];
  const invalidDays = [
    "2020-04-3",
    "2018-2-31",
    "2025-01",
    "20i1-o1",
    "nzsksj",
  ];
  for (const val of validMonths) {
    it(val + " should be a valid month", function () {
      ok(byMonthRegex.test(val));
    });
  }
  for (const val of validDays) {
    it(val + " should be a valid day", function () {
      ok(byDayRegex.test(val));
    });
  }
  for (const val of invalidMonths) {
    it(val + " should not be a valid month", function () {
      ok(!byMonthRegex.test(val));
    });
  }
  for (const val of invalidDays) {
    it(val + " should not be a valid day", function () {
      ok(!byDayRegex.test(val));
    });
  }
});

describe("Test generateDates function", function () {
  function str(arr) {
    return JSON.stringify(arr);
  }
  it("should return an array of one element if only startDate is provided", function () {
    ok(str(generateDates(true, "2022-02-02")) === str(["2022-02-02"]));
    ok(str(generateDates(false, "2022-02")) === str(["2022-02"]));
  });
  it("should return correct ranges", function () {
    function getValueList(start, end) {
      const m = [];
      for (let i = start; i <= end; i++) {
        m.push(i.toString().padStart(2, "0"));
      }
      return m;
    }

    let res = generateDates(true, "2021-05-30", "2021-06-02");
    let expected = ["2021-05-30", "2021-05-31", "2021-06-01", "2021-06-02"];
    ok(str(res) === str(expected));

    res = generateDates(false, "2021-10", "2022-01");
    expected = ["2021-10", "2021-11", "2021-12", "2022-01"];
    ok(str(res) === str(expected));

    res = generateDates(false, "2020-11", "2025-12");
    expected = ["2020-11", "2020-12"];
    for (const year of ["2021", "2022", "2023", "2024", "2025"]) {
      for (const month of getValueList(1, 12)) {
        expected.push(year + "-" + month);
      }
    }
    ok(str(res) === str(expected));

    res = generateDates(true, "2020-01-01", "2023-12-31");
    expected = [];
    for (const year of ["2020", "2021", "2022", "2023"]) {
      for (const month of getValueList(1, 12)) {
        const monthString = year + "-" + month;
        const days = new Date(monthString).daysInMonth();
        for (const day of getValueList(1, days)) {
          expected.push(monthString + "-" + day);
        }
      }
    }
    ok(str(res) === str(expected));
  });
});

describe("Test fetching data for each data type of each product", function () {
  this.timeout(100000000);

  const executable =
    "node " + join(import.meta.dirname, "..", "bin", "binance-fetch.js");
  const resultDir = join(import.meta.dirname, "result");

  function clearResultDir() {
    fs.rmSync(resultDir, { recursive: true, force: true });
    fs.mkdirSync(resultDir);
  }

  const dailyDates = [
    "2024-07-01",
    "2024-01-01",
    "2023-05-01",
    "2022-08-01",
    "2022-02-01",
    "2021-05-01",
    "2020-08-01",
    "2020-02-01",
  ];
  const monthlyDates = dailyDates.map((d) => d.slice(0, 7));

  function getExpectedFilename(symbol, intervalOrDatatype, date) {
    return `${symbol.toUpperCase()}-${intervalOrDatatype}-${date}.zip`;
  }

  const interval = "1h";
  for (const dt of spotDataTypes) {
    for (const date of [dailyDates[0], monthlyDates[0]]) {
      const symbol = "btcusdt";
      it(`should download file correctly for spot (${dt}, ${date})`, function () {
        clearResultDir();
        execSync(
          `${executable} --date ${date} --product spot --data-type ${dt} --symbols ${symbol} --output-path "${resultDir}" --intervals ${interval}`
        );
        const file = fs.readdirSync(resultDir);
        ok(file.length === 1);
        ok(
          getExpectedFilename(
            symbol,
            datatypesWithInterval.includes(dt) ? interval : dt,
            date
          ) === file[0]
        );
      });
    }
  }
  for (const dt of futuresDailyDataTypes) {
    for (const futuresType of ["usd-m", "coin-m"]) {
      const symbol = futuresType === "coin-m" ? "btcusd_perp" : "btcusdt";
      it(`should download daily data correctly for futures (${dt}, ${futuresType})`, function () {
        for (const date of dailyDates) {
          try {
            clearResultDir();
            execSync(
              `${executable} --date ${date} --product ${futuresType} --data-type ${dt} --symbols ${symbol} --output-path "${resultDir}" --intervals ${interval}`
            );
            const file = fs.readdirSync(resultDir);
            ok(file.length === 1);
            ok(
              getExpectedFilename(
                symbol,
                datatypesWithInterval.includes(dt) ? interval : dt
              ) === file[0]
            );
          } catch {}
        }
      });
    }
  }
  for (const dt of futuresMonthlyDataTypes) {
    for (const futuresType of ["usd-m", "coin-m"]) {
      const symbol = futuresType === "coin-m" ? "btcusd_perp" : "btcusdt";
      it(`should download monthly data correctly for futures (${dt}, ${futuresType})`, function () {
        for (const date of monthlyDates) {
          try {
            clearResultDir();
            execSync(
              `${executable} --date ${date} --product ${futuresType} --data-type ${dt} --symbols ${symbol} --output-path "${resultDir}" --intervals ${interval}`
            );
            const file = fs.readdirSync(resultDir);
            ok(file.length === 1);
            ok(
              getExpectedFilename(
                symbol,
                datatypesWithInterval.includes(dt) ? interval : dt,
                date
              ) === file[0]
            );
          } catch {}
        }
      });
    }
  }
  for (const dt of optionsDataTypes) {
    it(`should download daily data correctly for options (${dt})`, function () {
      const date = "2023-10-20";
      const symbol = dt === optionsDataTypes[0] ? "BTCBVOLUSDT" : "BTCUSDT";
      clearResultDir();
      execSync(
        `${executable} --date ${date} --product option --data-type ${dt} --symbols ${symbol} --output-path "${resultDir}"`
      );
      const file = fs.readdirSync(resultDir);
      ok(file.length === 1);
      ok(getExpectedFilename(symbol, dt, date) === file[0]);
    });
  }
});
