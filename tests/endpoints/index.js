import { spawn } from "child_process";
import { join } from "path";
import { Tests } from "./tests-list.js";
import chokidar from "chokidar";
import fs from "fs/promises";
import { datatypesWithInterval } from "../../src/lists.js";

const resultDir = join(import.meta.dirname, "result");

await fs.rm(resultDir, { recursive: true, force: true });
await fs.mkdir(resultDir);

const watcher = chokidar.watch(resultDir, { awaitWriteFinish: false });

for (const test of Tests) {
  const endpoint = `${test.product}_${test.dataType}_${test.date.length === 7
    ? "monthly"
    : "daily"
    }`;
  let proc;
  function run(dir, product, dataType, date, symbol, interval = "1h") {
    proc = spawn(
      "node",
      [
        "binance-fetch.js",
        "--date", date,
        "--product", product,
        "--data-type", dataType,
        "--symbols", symbol,
        "--intervals", interval,
        "--output-path", join(resultDir, dir),
        "--no-merge"
      ],
      { killSignal: "SIGKILL", cwd: "bin" }
    );
  }
  const expectedFilePath = new RegExp(
    join(
      resultDir,
      endpoint,
      `${test.symbol.toUpperCase()}-${datatypesWithInterval.includes(test.dataType)
        ? test.interval
        : test.dataType
      }-${test.date}(?:_UNVERIFIED)?\\.zip`
    )
  );
  const waitForFile = new Promise((resolve) => {
    const w = watcher.on("change", async (path) => {
      if (expectedFilePath.test(path)) {
        try {
          const file = await fs.readFile(path);
          if (file.length >= 4) {
            proc.kill();
            w.removeAllListeners();
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
        } catch { }
      }
    });
  });
  run(endpoint, ...Object.values(test));
  const success = await waitForFile;
  console.log(`${endpoint} ${success ? "OK" : "FAIL"}`);
}

watcher.close();

