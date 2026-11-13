import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// inspired by code in https://github.com/streetsidesoftware/cspell/issues/3215
// this file just generates the word list file in this directory that contains
// all our dependecy package names

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const packageJsons = [
  path.join(__dirname, "../package.json"),
  path.join(__dirname, "../packages/engine/package.json"),
  path.join(__dirname, "../packages/widgets/package.json"),
];
const words = packageJsons.reduce((acc, packageJsonPath) => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  const packageNames = Object.keys(packageJson.dependencies ?? {}).concat(
    Object.keys(packageJson.devDependencies ?? {}),
  );
  // remove the @ org symbol and dashes to get just words in package names
  const setOfWords = packageNames
    .flatMap((name) => name.replace(/[@]/g, "").split(/\/|\-/))
    .map((word) => word.replace(".js", ""));
  setOfWords.forEach((word) => acc.add(word));
  return acc;
}, new Set());

// if https://github.com/streetsidesoftware/vscode-spell-checker/issues/3002
// ever gets addressed this can be used to auto-generate the list of package names
// to pass to cspell directly. Right now it works in the CLI but not in the extension
writeFileSync("./cspell-packages.txt", Array.from(words).join("\n"));
