import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { Tests } from "./binance-fetch-tests-list.js";
import chokidar from "chokidar";
import fs from "fs/promises";
import { beforeAll } from "vitest";
import { datatypesWithInterval } from "../src/lists.js";

const resultDir = join(import.meta.dirname, "binance-fetch-result");

beforeAll(async () => {
  const files = await fs.readdir(resultDir);
  for (const file of files) {
    await fs.rm(join(resultDir, file), { recursive: true, force: true });
  }
});

const execPromise = promisify(exec);

describe.concurrent(
  "Ensure that data for each data type of each product is accessed correctly",
  async () => {
    function run(dir, product, dataType, date, symbol, interval) {
      execPromise(
        `node ${join(
          import.meta.dirname,
          "..",
          "bin",
          "binance-fetch.js"
        )} --date ${date} --product ${product} --data-type ${dataType} --symbols ${symbol} --output-path "${join(
          resultDir,
          dir
        )}"${interval ? " --intervals " + interval : ""}`
      );
    }
    const watcher = chokidar.watch(resultDir, { awaitWriteFinish: false });
    for (const test of Tests) {
      const endpoint = `${test.product}_${test.dataType}_${
        test.date.length === 7 ? "monthly" : "daily"
      }`;
      it(endpoint, async () => {
        const expectedFilePath = new RegExp(
          join(
            resultDir,
            endpoint,
            `${test.symbol.toUpperCase()}-${
              datatypesWithInterval.includes(test.dataType)
                ? test.interval
                : test.dataType
            }-${test.date}(?:_UNVERIFIED)?\\.zip`
          )
        );
        const waitForFile = new Promise((resolve) => {
          watcher.on("change", async (path) => {
            if (path) {
              if (expectedFilePath.test(path)) {
                try {
                  const file = await fs.readFile(path);
                  if (file.length >= 4) {
                    if (
                      /**
                       * verify file signature (should be a ZIP)
                       * zip signature - '\x50\x4b\x03\x04'
                       */
                      Buffer.from([80, 75, 3, 4]).equals(file.subarray(0, 4))
                    ) {
                      resolve(true);
                    } else {
                      resolve(false);
                    }
                  }
                } catch {}
              }
            }
          });
        });
        run(endpoint, ...Object.values(test));
        expect(await waitForFile).toBeTruthy();
      });
    }
  }
);
