// @ts-check

import { transform } from "lebab";
import { glob, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pattern = process.argv[2];

if (!pattern) {
  console.error(`Usage: node ./scripts/lebab-batch.js "path/to/*.js"`);
  process.exit(2);
}

/** @param {string} str */
const bright = (str) => `\x1b[1m${str}\x1b[0m`;
/** @param {string} str */
const dim = (str) => `\x1b[2m${str}\x1b[0m`;
/** @param {string} str */
const red = (str) => `\x1b[31m${str}\x1b[0m`;
/** @param {string} str */
const green = (str) => `\x1b[32m${str}\x1b[0m`;

let pathsUpdated = 0;
const pathsWithConstructorTags = [];

console.log(bright(`Converting...\n`));

for await (const path of glob(resolve(__dirname, "..", pattern))) {
  console.log(dim(`  ${path}`));

  // Lowercase filenames are assumed to contain functions, not classes. If
  // properties are assigned to functions, lebab may assume they're classes.
  const pathBasename = basename(path);
  if (!pathBasename.match(/^[A-Z]/)) {
    continue;
  }

  const input = await readFile(path, "utf-8");

  const { code: output, warnings } =
    /** @type {{code: string, warnings: string[]}} */ (
      transform(input, ["class"])
    );

  if (warnings.length > 0) {
    console.warn(`Warnings encountered on ${path}, skipping.`, warnings);
    continue;
  }

  if (output.includes("@constructor")) {
    pathsWithConstructorTags.push(path);
  }

  await writeFile(path, output);

  pathsUpdated++;
}

if (pathsWithConstructorTags.length > 0) {
  console.warn(
    `\n${bright("WARNING:")} Detected "@constructor" JSDoc annotation in one or more paths; please manually update...

  ${dim(pathsWithConstructorTags.join("\n  "))}

${bright("Before")}

${red(`/**
 * Description of class.
 * @alias MyClass")}
 * @extends {MyParentClass}
 * @constructor
 * @param {string} name
 */`)}
function MyClass(name) {
  // ...
}

${bright("After")}

${green("/** Description of class. */")}
class MyClass extends MyParentClass {
  ${green(`/**
   * @param {string} name
   */`)}
  constructor(name) {

  }
}\n`,
  );
}

if (pathsUpdated === 0) {
  console.log(bright(`${red("X")} No files updated.`));
  process.exit(2);
} else {
  console.log(bright(`${green("✓")} Updated ${pathsUpdated} files.`));
}
