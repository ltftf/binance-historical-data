import fs, { constants } from "fs/promises";
import { createWriteStream } from "fs";
import logSymbols from "log-symbols";
import { Option, program } from "commander";
import { join, resolve } from "path";
import { generateDates, getList } from "./utils.js";
import { byDayRegex, byMonthRegex } from "./validateDateRegex.js";
import { IncorrectParamError } from "./customErrors.js";
import {
  datatypesWithInterval,
  futuresDailyDataTypes,
  futuresMonthlyDataTypes,
  intervalList,
  optionsDataTypes,
  products,
  spotDataTypes,
} from "./lists.js";
import ora from "ora";
import https from "https";
import crypto from "crypto";
import { PassThrough } from "stream";

program
  .option(
    "-d, --date <date...>",
    "date can be provided in one of two formats: 'YYYY-MM' to get monthly data; 'YYYY-MM-DD' to get daily data. To get data for a range provide two dates of the same format separated by a space (e.g., '2024-01 2024-08')"
  )
  .option("-p, --product <product>", "should be one of: " + getList(products))
  .option("-t, --data-type <type>", "data type (e.g., 'klines')")
  .option(
    "-s, --symbols <symbols...>",
    "one or more symbols separated by a space (e.g., 'btcusdt')"
  )
  .option(
    "-i, --intervals <intervals...>",
    "one or more intervals separated by a space. Accepted intervals: " +
      getList(intervalList)
  )
  .option(
    "-o, --output-path <path>",
    "path to save the data to. Current directory is used by default"
  )
  .addOption(
    new Option("-P, --parallel <num>", "number of files to download at a time")
      .argParser((val) => {
        const parsed = parseInt(val);
        if (!Number.isInteger(parsed) || parsed < 1) {
          throw new IncorrectParamError(
            "--parallel (-P) must be a number (1 or greater)"
          );
        }
        return parsed;
      })
      .default(5)
  )
  .option(
    "    --no-validate-params",
    "do not validate 'product', 'data type', 'symbols' and 'intervals'. Only use this if the API has changed"
  );

try {
  const params = program.parse().opts();

  /**
   * date validation
   */
  if (!params.date || !Array.isArray(params.date) || !params.date.length) {
    throw new IncorrectParamError("--date (-d) must be provided");
  }
  if (params.date.length > 2) {
    throw new IncorrectParamError(
      "only one or two date strings expected, received: " + getList(params.date)
    );
  }
  const [startDate, endDate] = params.date;
  let byDay = false;
  if (byDayRegex.test(startDate)) {
    byDay = true;
  } else if (!byMonthRegex.test(startDate)) {
    throw new IncorrectParamError(
      "incorrect start date: '" +
        startDate +
        "'. Accepted formats: monthly (YYYY-MM), daily (YYYY-MM-DD)"
    );
  }
  if (
    endDate &&
    (byDay ? !byDayRegex.test(endDate) : !byMonthRegex.test(endDate))
  ) {
    throw new IncorrectParamError(
      "incorrect end date: '" +
        endDate +
        "'. Both start and end date should either be in monthly (YYYY-MM) or daily (YYYY-MM-DD) format"
    );
  }
  if (endDate && +new Date(startDate) >= +new Date(endDate)) {
    throw new IncorrectParamError("end date should be greater than start date");
  }

  if (params.validateParams) {
    /**
     * product validation
     */
    if (!params.product || !products.includes(params.product)) {
      throw new IncorrectParamError(
        "--product (-p) should be one of: " + getList(products)
      );
    }

    /**
     * datatype validation
     */
    if (params.product === "spot") {
      if (!spotDataTypes.includes(params.dataType)) {
        throw new IncorrectParamError(
          "--data-type (-t) for 'spot' should be one of: " +
            getList(spotDataTypes)
        );
      }
    } else if (params.product === "option") {
      if (!optionsDataTypes.includes(params.dataType)) {
        throw new IncorrectParamError(
          "--data-type (-t) for 'option' should be one of: " +
            getList(optionsDataTypes)
        );
      }
      if (!byDay) {
        throw new IncorrectParamError(
          "only daily data is available for 'option'"
        );
      }
    } else {
      if (byDay && !futuresDailyDataTypes.includes(params.dataType)) {
        throw new IncorrectParamError(
          "--data-type (-t) for daily futures data ('usd-m' or 'coin-m') should be one of: " +
            getList(futuresDailyDataTypes)
        );
      }
      if (!byDay && !futuresMonthlyDataTypes.includes(params.dataType)) {
        throw new IncorrectParamError(
          "--data-type (-t) for monthly futures data ('usd-m' or 'coin-m') should be one of: " +
            getList(futuresMonthlyDataTypes)
        );
      }
    }

    /**
     * symbols validation
     */
    if (
      !params.symbols ||
      !Array.isArray(params.symbols) ||
      !params.symbols.length
    ) {
      throw new IncorrectParamError(
        "at least one symbol must be provided (e.g., 'btcusdt')"
      );
    }
    for (let i = 0; i < params.symbols.length; i++) {
      params.symbols[i] = params.symbols[i].toUpperCase();
    }

    /**
     * intervals validation
     */
    if (datatypesWithInterval.includes(params.dataType)) {
      if (
        !params.intervals ||
        !Array.isArray(params.intervals) ||
        !params.intervals.length
      ) {
        throw new IncorrectParamError(
          `at least one 'interval' must be provided for '${params.dataType}' data`
        );
      }
      const incorrectIntervals = [];
      for (const val of params.intervals) {
        if (!intervalList.includes(val)) {
          incorrectIntervals.push(val);
        }
      }
      if (incorrectIntervals.length) {
        throw new IncorrectParamError(
          "incorrect intervals provided: " +
            getList(incorrectIntervals) +
            ". Accepted intervals: " +
            getList(intervalList)
        );
      }
    } else {
      params.intervals = null;
    }
  }

  /**
   * output path validation
   */
  const outputPath = resolve(params.outputPath ?? ".");
  try {
    await fs.access(outputPath, constants.W_OK);
    if (!(await fs.lstat(outputPath)).isDirectory()) {
      throw new IncorrectParamError("--output-path (-o) should be a directory");
    }
  } catch (e) {
    if (e.code && e.code === "ENOENT") {
      console.log("Warning: output directory does not exist");
      try {
        const dir = await fs.mkdir(outputPath, { recursive: true });
        console.log("Created '" + dir + "'");
      } catch (er) {
        if (er.code && er.code === "EACCES") {
          throw new IncorrectParamError(
            "could not create directory '" + outputPath + "'. Permission denied"
          );
        } else {
          throw er;
        }
      }
    } else if (e.code && e.code === "EACCES") {
      throw new IncorrectParamError(
        "do not have permission to write to '" + outputPath + "'"
      );
    } else {
      throw e;
    }
  }

  /**
   * compose links for fetching data
   */
  const dates = generateDates(byDay, startDate, endDate);
  const urls = [];
  for (const symbol of params.symbols) {
    for (const interval of params.intervals ?? [null]) {
      for (const date of dates) {
        let url = "https://data.binance.vision/data";
        function addToPath(str) {
          url += "/" + str;
        }
        addToPath(
          params.product === "usd-m"
            ? "futures/um"
            : params.product === "coin-m"
            ? "futures/cm"
            : params.product
        );
        addToPath(byDay ? "daily" : "monthly");
        addToPath(params.dataType);
        addToPath(symbol);
        if (interval) {
          addToPath(interval);
          addToPath(`${symbol}-${interval}-${date}.zip`);
        } else {
          addToPath(`${symbol}-${params.dataType}-${date}.zip`);
        }
        urls.push(url);
      }
    }
  }

  /**
   * print progress to console
   */
  const requestCount = urls.length;
  const requestCountWidth = requestCount.toString().length;
  const progressCount = {
    success: 0,
    noData: 0,
    fail: 0,
    done: function () {
      return this.success + this.noData + this.fail;
    },
  };
  const spinner = ora();
  function printResult(symbol, name, error) {
    spinner.stop();
    if (symbol === logSymbols.success) {
      progressCount.success++;
    } else if (symbol === logSymbols.warning) {
      progressCount.noData++;
    } else {
      progressCount.fail++;
    }
    const doneCount = progressCount.done();
    console.log(
      `[${doneCount
        .toString()
        .padStart(requestCountWidth, " ")}/${requestCount}] ${name} ${symbol}${
        error ? " (" + error + ")" : ""
      }`
    );
    if (doneCount < requestCount) {
      spinner.start();
    }
  }

  /**
   * print result when all finished
   */
  const promises = [];
  let waitingToFinish = false;
  function waitToFinish() {
    if (!waitingToFinish) {
      waitingToFinish = true;
      Promise.all(promises).then(() => {
        let result = `Downloaded: ${progressCount.success}/${requestCount} files`;
        if (progressCount.noData) {
          result += `; not found: ${progressCount.noData}/${requestCount} files`;
        }
        if (progressCount.fail) {
          result += `; failed to complete: ${progressCount.fail}/${requestCount} files`;
        }
        console.log(result);
        if (progressCount.success === 0) {
          process.exitCode = 1;
        }
      });
    }
  }

  /**
   * fetch data from each link
   */
  function requestData(url) {
    const fileName = url.match(/[^/]*\.zip$/)[0];
    const fileVerified = join(outputPath, fileName);
    const fileUnverified = fileVerified.replace(/\.zip$/, "_UNVERIFIED.zip");

    const sha256 = crypto.createHash("sha256");

    function getChecksum() {
      return new Promise((resolve, reject) => {
        try {
          https
            .get(url + ".CHECKSUM", (res) => {
              let checksumText = "";
              res.on("error", reject);
              res.on("end", () => {
                const checksum = checksumText.slice(0, 64);
                if (/^[0-9a-f]{64}$/.test(checksum)) {
                  resolve(checksum);
                } else {
                  reject();
                }
              });
              res.on("data", (chunk) => {
                checksumText += chunk.toString();
              });
            })
            .on("error", reject);
        } catch (e) {
          reject(e);
        }
      });
    }

    return new Promise((resolve) => {
      try {
        https
          .get(url, (res) => {
            if (res.headers["content-type"].includes("xml")) {
              res.destroy();
              printResult(logSymbols.warning, fileName, "no data");
              return resolve();
            }

            res.on("error", (e) => {
              printResult(
                logSymbols.error,
                fileName,
                getErrorString("error while loading data", e)
              );
              resolve();
            });

            res.on("end", async () => {
              try {
                const checksum = await getChecksum();
                if (checksum === sha256.digest("hex")) {
                  await fs.rename(fileUnverified, fileVerified);
                  printResult(logSymbols.success, fileName);
                  resolve();
                } else {
                  printResult(
                    logSymbols.error,
                    fileName,
                    "checksum does not match"
                  );
                  resolve();
                }
              } catch (e) {
                printResult(
                  logSymbols.error,
                  fileName,
                  getErrorString("error fetching checksum", e)
                );
                resolve();
              }
            });

            res
              .pipe(
                new PassThrough().on("data", (chunk) => sha256.update(chunk))
              )
              .pipe(createWriteStream(fileUnverified));
          })
          .on("error", errorConnecting);
      } catch (e) {
        errorConnecting(e);
      }
      function errorConnecting(e) {
        printResult(
          logSymbols.error,
          fileName,
          getErrorString("error establishing connection", e)
        );
        resolve();
      }
      function getErrorString(text, e) {
        return text + (e.message ? ` [${e.message}]` : "");
      }
    });
  }

  async function addToQueue() {
    const promise = requestData(urls.shift());
    promises.push(promise);
    await promise;
    if (urls.length) {
      addToQueue();
    } else {
      waitToFinish();
    }
  }

  /**
   * program start
   */
  console.log(
    "Saving to '" +
      outputPath +
      "'" +
      "\nDownloading '" +
      params.dataType +
      "' " +
      (byDay ? "daily" : "monthly") +
      " data for " +
      params.symbols.length +
      " symbol(s)" +
      (params.intervals
        ? " and " + params.intervals.length + " interval(s)"
        : "") +
      "\nTotal number of files to load: " +
      requestCount
  );
  spinner.start();
  for (let _ = 0; _ < params.parallel && urls.length; _++) {
    addToQueue();
  }
} catch (e) {
  if (e.name && e.name === "IncorrectParamError") {
    console.log("Error: " + e.message);
    process.exitCode = 2;
  } else {
    console.log(
      e.message || e.stack || "An unexpected error occurred. Exiting.."
    );
    process.exitCode = 255;
  }
}
