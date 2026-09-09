import { spawn } from "child_process";
import { join } from "path";
import { rm, mkdir, readdir, readFile } from "fs/promises";
import { Tests } from "./tests-list.js";

const resultDir = join(import.meta.dirname, "result");
const expectedDir = join(import.meta.dirname, "expected");

const TEST_NO_HEADER = false;

async function cleanResultDir() {
  await rm(resultDir, { force: true, recursive: true });
  await mkdir(resultDir);
}

function fetch(args) {
  return new Promise((resolve) => {
    const proc = spawn("node", args, { cwd: "bin" });
    for (const std of ["stdout", "stderr"]) {
      proc[std].on("data", (data) => console.log(`${data.toString().trim()}`));
    }
    proc.on("close", resolve);
  })
}

let passed = 0;

for (let i = 0; i < Tests.length; i++) {
  const test = Tests[i];
  const args = [
    "binance-fetch.js",
    "-d", ...test.date.split(" "),
    "-p", test.product,
    "-t", test.dataType,
    "-s", ...test.symbols.split(" "),
    "-o", resultDir,
    "-P", "32"
  ];
  if (test.intervals) {
    args.push("-i");
    args.push(...test.intervals.split(" "));
  }
  if (TEST_NO_HEADER) {
    args.push("--no-header");
  }
  console.log(`\nTest [${i + 1}/${Tests.length}]: ${args.join(" ")} `);
  await cleanResultDir();
  await fetch(args);
  const fetchedFiles = await readdir(resultDir);
  if (fetchedFiles.length !== test.expectedFiles) {
    console.log(`expected ${test.expectedFiles} files, got ${fetchedFiles.length}: `);
    for (const file of fetchedFiles) {
      console.log(file);
    }
    break;
  }
  let ok = true;
  for (const file of fetchedFiles) {
    const fetchedFile = await readFile(join(resultDir, file));
    let expectedFile = await readFile(join(expectedDir, file));
    if (TEST_NO_HEADER) {
      const i = expectedFile.findIndex(c => c === "\n".charCodeAt(0));
      expectedFile = expectedFile.subarray(i + 1);
    }
    if (!fetchedFile.equals(expectedFile)) {
      console.log(`!! ${file} did not pass`);
      ok = false;
    }
  }
  if (ok) {
    passed++;
  } else {
    break;
  }
}

console.log("\n" + (passed === Tests.length ? "All tests passed" : "Some tests failed"));