// @ts-check

/**
 * One-time codemod: rewrites the `Transforms` named import in packages/engine/Specs to
 * import `FixedFrameTransforms` and/or `CelestialFrameTransforms` instead (whichever the
 * spec actually uses), and rewrites every `Transforms.<member>` access to `<Owner>.<member>`.
 *
 * Usage: node scripts/migrateTransformsSpecImports.js [--dry-run]
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { globby } from "globby";
import {
  buildTransformsMemberOwners,
  findNeededNamespaces,
  replaceNamespacedAccess,
  formatWithPrettier,
} from "./transformsMemberOwners.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const coreDir = join(repoRoot, "packages/engine/Source/Core");

const dryRun = process.argv.includes("--dry-run");

/** @param {string} str */
const bright = (str) => `\x1b[1m${str}\x1b[0m`;
/** @param {string} str */
const dim = (str) => `\x1b[2m${str}\x1b[0m`;
/** @param {string} str */
const yellow = (str) => `\x1b[33m${str}\x1b[0m`;
/** @param {string} str */
const green = (str) => `\x1b[32m${str}\x1b[0m`;

const owners = await buildTransformsMemberOwners(coreDir);

// Matches the `Transforms` entry of a multi-line named import list, e.g.:
//   import {
//     ...
//     Transforms,
//     ...
//   } from "../../index.js";
const namedImportLineRegex = /^([ \t]*)Transforms,[ \t]*$/m;

const files = await globby("packages/engine/Specs/**/*.js", {
  cwd: repoRoot,
  absolute: true,
});

let updatedCount = 0;
const skipped = [];

for (const file of files) {
  const original = await readFile(file, "utf-8");
  const importMatch = original.match(namedImportLineRegex);
  if (!importMatch) {
    continue;
  }

  // Scan the body only - the import line itself is just the identifier "Transforms," and
  // wouldn't be picked up as a `Transforms.<member>` access anyway, but skip it for clarity.
  const bodyWithoutImport = original.replace(importMatch[0], "");
  const { neededNamespaces, unknownMembers } = findNeededNamespaces(
    bodyWithoutImport,
    owners,
  );

  if (unknownMembers.length > 0) {
    skipped.push(
      `${relative(repoRoot, file)} (unrecognized members: ${unknownMembers.join(", ")})`,
    );
    continue;
  }

  if (neededNamespaces.length === 0) {
    skipped.push(
      `${relative(repoRoot, file)} (imported but no Transforms.<member> usage found)`,
    );
    continue;
  }

  const indent = importMatch[1];
  const newImportLines = neededNamespaces
    .map((namespace) => `${indent}${namespace},`)
    .join("\n");

  const updated = replaceNamespacedAccess(
    original.replace(namedImportLineRegex, newImportLines),
    owners,
  );

  const formatted = await formatWithPrettier(file, updated);
  if (!dryRun) {
    await writeFile(file, formatted);
  }
  updatedCount++;
  console.log(
    `${green("✓")} ${relative(repoRoot, file)} -> ${neededNamespaces.join(", ")}`,
  );
}

console.log();
if (skipped.length > 0) {
  console.log(
    bright(yellow(`Skipped ${skipped.length} file(s), needs manual review:`)),
  );
  for (const entry of skipped) {
    console.log(dim(`  ${entry}`));
  }
  console.log();
}
console.log(
  bright(`${dryRun ? "[dry-run] " : ""}Updated ${updatedCount} file(s).`),
);
