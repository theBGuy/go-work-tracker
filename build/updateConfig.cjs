const fs = require('fs');
const file = require("../wails.json");

const vString = process.argv[2];
if (!vString || !vString.startsWith("v") || vString.split(".").length !== 3) {
  throw new Error("No version or invalid format. Please use v0.0.0 format.", vString);
}

console.log(`changing version to ${vString} and environment to production`)

const versionNum = `${vString}`.replace("v", "")
file.version = versionNum;
file.info.productVersion = versionNum;
file.info.environment = "production";

fs.writeFile("wails.json", JSON.stringify(file), function writeJSON(err) {
  if (err) return console.log(err);
  console.log(JSON.stringify(file, null, 2));
});