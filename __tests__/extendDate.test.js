import "../src/extendDate.js";
import { describe, it, expect } from "vitest";

describe("Test added Date methods", function () {
  const vals = [
    ["2024-08", 31],
    ["2024-06", 30],
    ["2023-02", 28],
  ];
  for (const val of vals) {
    it("there should be " + val[1] + " days in " + val[0], () => {
      expect(new Date(val[0]).daysInMonth()).toBe(val[1]);
    });
  }
  it(".getBinanceDate in daily mode should return a string in 'YYYY-MM-DD' format", () => {
    expect(new Date("2024-09-04").getBinanceDate(true)).toBe("2024-09-04");
  });
  it(".getBinanceDate in monthly mode should return a string in 'YYYY-MM' format", () => {
    expect(new Date("2024-09-04").getBinanceDate(false)).toBe("2024-09");
  });
});
