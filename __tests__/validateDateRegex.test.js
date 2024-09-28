import { byDayRegex, byMonthRegex } from "../src/validateDateRegex";
import { describe, it, expect } from "vitest";

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
    it(val + " should be a valid month", () => {
      expect(byMonthRegex.test(val)).toBeTruthy();
    });
  }
  for (const val of validDays) {
    it(val + " should be a valid day", () => {
      expect(byDayRegex.test(val)).toBeTruthy();
    });
  }
  for (const val of invalidMonths) {
    it(val + " should not be a valid month", () => {
      expect(byMonthRegex.test(val)).toBeFalsy();
    });
  }
  for (const val of invalidDays) {
    it(val + " should not be a valid day", () => {
      expect(byDayRegex.test(val)).toBeFalsy();
    });
  }
});
