// @ts-check

/**
 * One-time codemod: rewrites `import Transforms from ".../Core/Transforms.js"` in
 * packages/engine/Source to import `FixedFrameTransforms` and/or `CelestialFrameTransforms`
 * instead (whichever the file actually uses), and rewrites every `Transforms.<member>` access
 * to `<Owner>.<member>`.
 *
 * Usage: node scripts/migrateTransformsSourceImports.js [--dry-run]
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
const transformsJsPath = join(coreDir, "Transforms.js");

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

// Matches only the default import of the binding named exactly "Transforms" (not
// "SceneTransforms" or similar), on its own line.
const importRegex = /^import Transforms from ["']([^"']+)["'];\s*$/m;

const files = await globby("packages/engine/Source/**/*.js", {
  cwd: repoRoot,
  absolute: true,
});

let updatedCount = 0;
const skipped = [];

for (const file of files) {
  if (file === transformsJsPath) {
    continue;
  }

  const original = await readFile(file, "utf-8");
  const importMatch = original.match(importRegex);
  if (!importMatch) {
    continue;
  }

  const importPath = importMatch[1];
  const resolvedImportPath = resolve(dirname(file), importPath);
  if (resolvedImportPath !== transformsJsPath) {
    // A different "Transforms" default import than the one we're migrating - leave it alone.
    continue;
  }

  // Scan the body only - the import line itself contains the literal text
  // "Transforms.js", which would otherwise be misread as a `Transforms.js` member access.
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

  const newImportLines = neededNamespaces
    .map((namespace) => {
      const newImportPath = importPath.replace(
        /Transforms\.js$/,
        `${namespace}.js`,
      );
      return `import ${namespace} from "${newImportPath}";`;
    })
    .join("\n");

  const updated = replaceNamespacedAccess(
    original.replace(importRegex, newImportLines),
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
