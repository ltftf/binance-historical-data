import fs from "fs";
import { execSync } from "child_process";

const dir = import.meta.dirname + "/tests/endpoints/result";
const folders = fs.readdirSync(dir);

const headers = {};

for (const folder of folders) {
  const [product, dataType] = folder.split("_");
  const path = `${dir}/${folder}`;
  const file = fs.readdirSync(path)[0];
  const filePath = `${path}/${file}`;
  try {
    execSync(`7z x ${filePath} -o${path} > /dev/null 2>&1`);
  } catch { }
  const csvPath = filePath.replace(".zip", ".csv").replace("_UNVERIFIED", "");
  const header = fs.readFileSync(csvPath, { encoding: "ascii" }).split("\n")[0];
  headers[`${product}_${dataType}`] = /^\d/.test(header) ? "no header" : header;
}

console.log(headers);
// fs.writeFileSync(import.meta.dirname + "/headers.json", JSON.stringify(headers, null, 2));