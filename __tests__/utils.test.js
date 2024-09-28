import { generateDates } from "../src/utils";
import { describe, it, expect } from "vitest";

describe("Test generateDates function", () => {
  it("should return an array of one element if only startDate is provided", () => {
    expect(generateDates(true, "2022-02-02")).toEqual(["2022-02-02"]);
    expect(generateDates(false, "2022-02")).toEqual(["2022-02"]);
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
    expect(res).toEqual(expected);

    res = generateDates(false, "2021-10", "2022-01");
    expected = ["2021-10", "2021-11", "2021-12", "2022-01"];
    expect(res).toEqual(expected);

    res = generateDates(false, "2020-11", "2025-12");
    expected = ["2020-11", "2020-12"];
    for (const year of ["2021", "2022", "2023", "2024", "2025"]) {
      for (const month of getValueList(1, 12)) {
        expected.push(year + "-" + month);
      }
    }
    expect(res).toEqual(expected);

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
    expect(res).toEqual(expected);
  });
});
