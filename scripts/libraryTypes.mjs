// The library build's declarations as one folder (CS-835). `tsc -p
// tsconfig.lib.json` emits every package's declarations under
// `dist-lib/types/<package>/src/`, and where one package imports another
// by name (`@cesium/core`, `@cesium/frames/internal`) the emitted file
// keeps that name, which a consumer of `dist-lib` alone can't resolve. This
// rewrites each such name to a relative path to the emitted entry, so
// `dist-lib` stays what it was before the packages: one folder that needs
// nothing beside it. CS-612's per-package build replaces it.
//
//   node scripts/libraryTypes.mjs <dist-lib/types>
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** The packages whose names the declarations may import, and their entries. */
const PACKAGES = ["core", "time", "frames", "crs", "measure", "ui"];
const ENTRIES = { "": "index", "/internal": "internal" };

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [argument] = process.argv.slice(2);
// Only a folder inside the repository (the library build's own output).
const typesDir = argument ? resolve(argument) : "";
if (!argument || relative(repo, typesDir).split(sep)[0] === "..") {
  console.error(
    "usage: node scripts/libraryTypes.mjs <dist-lib/types>, a folder inside the repository",
  );
  process.exit(2);
}

/** Every `.d.ts` file under `dir`. */
function declarations(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return declarations(path);
    }
    return entry.name.endsWith(".d.ts") ? [path] : [];
  });
}

const NAME = new RegExp(
  `(["'])@cesium/(${PACKAGES.join("|")})(${Object.keys(ENTRIES)
    .filter(Boolean)
    .join("|")})?\\1`,
  "g",
);

/** The relative path from `file` to the entry `name` (and `subpath`) emits. */
function entryPath(file, name, subpath) {
  const target = join(typesDir, name, "src", `${ENTRIES[subpath]}.js`);
  const path = relative(dirname(file), target).split(sep).join("/");
  return path.startsWith(".") ? path : `./${path}`;
}

let files = 0;
let names = 0;
for (const file of declarations(typesDir)) {
  const text = readFileSync(file, "utf8");
  let out = "";
  let at = 0;
  for (const match of text.matchAll(NAME)) {
    const [whole, quote, name, subpath = ""] = match;
    out += `${text.slice(at, match.index)}${quote}${entryPath(file, name, subpath)}${quote}`;
    at = match.index + whole.length;
    names++;
  }
  if (at > 0) {
    writeFileSync(file, out + text.slice(at));
    files++;
  }
}
console.log(
  `libraryTypes: ${names} package names in ${files} declaration files now relative`,
);
