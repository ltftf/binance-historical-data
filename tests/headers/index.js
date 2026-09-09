import {
  products,
  spotDataTypes,
  optionsDataTypes,
  usdMDailyDataTypes,
  coinMDailyDataTypes,
  futuresMonthlyDataTypes
} from "../../src/lists.js";
import { readFileSync } from "fs";

const headers = Object.keys(JSON.parse(
  readFileSync(import.meta.dirname + "/../../headers.json", "ascii")
));

const tests = [
  [products[0], spotDataTypes],
  [products[1], [...new Set([...usdMDailyDataTypes, ...futuresMonthlyDataTypes])]],
  [products[2], [...new Set([...coinMDailyDataTypes, ...futuresMonthlyDataTypes])]],
  [products[3], optionsDataTypes],

];

let count = 0;

for (const test of tests) {
  for (const dt of test[1]) {
    const prod_dt = `${test[0]}_${dt}`;
    if (!headers.includes(prod_dt)) {
      throw new Error("missing header " + prod_dt)
    }
    count++;
  }
}

if (count !== headers.length) {
  throw new Error("count is wrong");
}

console.log("OK");