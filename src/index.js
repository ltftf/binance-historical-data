import fs, { constants } from "fs/promises";
import logSymbols from "log-symbols";
import { Option, program } from "commander";
import { join, resolve } from "path";
import { generateDates, getChecksum, getList } from "./utils.js";
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
    new Option(
      "-P, --parallel <num>",
      "number of files to download at a time"
    )
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
  console.debug(params);

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
    checksumFail: 0,
    fetchFail: 0,
    done: function () {
      return this.success + this.noData + this.checksumFail + this.fetchFail;
    },
  };
  const spinner = ora();
  function printResult(symbol, name, error) {
    spinner.stop();
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
        let result = `\nDownloaded: ${progressCount.success}/${requestCount} files`;
        if (progressCount.noData) {
          result += `; not found: ${progressCount.noData}/${requestCount} files`;
        }
        if (progressCount.checksumFail) {
          result += `; checksum fail: ${progressCount.checksumFail}/${requestCount} files`;
        }
        if (progressCount.fetchFail) {
          result += `; failed to fetch: ${progressCount.fetchFail}/${requestCount} files`;
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
  async function requestData(url) {
    let fileName = url.match(/[^/]*\.zip$/)[0];
    let zip, checksumText;
    try {
      [zip, checksumText] = await Promise.all([
        new Promise((res, rej) => {
          fetch(url)
            .then((res) => res.arrayBuffer())
            .then((arrBuff) => res(Buffer.from(arrBuff)))
            .catch(rej);
        }),
        new Promise((res, rej) => {
          fetch(url + ".CHECKSUM")
            .then((res) => res.text())
            .then((sum) => res(sum))
            .catch(rej);
        }),
      ]);
    } catch (e) {
      progressCount.fetchFail++;
      console.debug(url);
      if (e instanceof TypeError) {
        printResult(logSymbols.error, fileName, "network error");
      } else {
        printResult(logSymbols.error, fileName, "error fetching data");
      }
    }

    if (zip && checksumText) {
      console.debug(url);
      const checksum = checksumText.slice(0, 64);
      if (!/^[0-9a-f]{64}$/.test(checksum)) {
        progressCount.noData++;
        printResult(logSymbols.warning, fileName, "no data");
      } else if (checksum !== getChecksum(zip)) {
        progressCount.checksumFail++;
        printResult(logSymbols.error, fileName, "checksum does not match");
      } else {
        try {
          await fs.writeFile(join(outputPath, fileName), zip);
          progressCount.success++;
          printResult(logSymbols.success, fileName);
        } catch (e) {
          progressCount.success++;
          printResult(logSymbols.error, fileName, "error saving on disk");
          throw e;
        }
      }
    }

    if (urls.length) {
      const promise = requestData(urls.shift());
      promises.push(promise);
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
    const promise = requestData(urls.shift());
    promises.push(promise);
  }
} catch (e) {
  if (e.name && e.name === "IncorrectParamError") {
    console.log("Error: " + e.message);
    process.exitCode = 2;
  } else {
    console.log(e);
    process.exitCode = 255;
  }
}
