// @ts-check

/**
 * Phase 3c/3d migration script (move step): `git mv`s every file on
 * scripts/core-package-list.txt (plus its matching Spec file and the
 * defined.d.ts/Check.d.ts sibling files) into a flat packages/core/Source|Specs.
 *
 * Includes a dependency-graph guard: fails before moving anything if any
 * moved file imports from packages/engine/Source/{Scene,Renderer,DataSources,Widget}
 * that isn't itself part of the move.
 *
 * Usage: node scripts/moveCoreFiles.js [--dry-run]
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { relative } from "node:path";

import {
  repoRoot,
  readCoreFileList,
  resolveImportPath,
  DEFAULT_IMPORT_REGEX,
  JSDOC_IMPORT_REGEX,
  JSDOC_NAMED_IMPORT_REGEX,
  dryRun,
  bright,
  dim,
  yellow,
  green,
  red,
} from "./coreMigrationShared.js";

const FORBIDDEN_DIR_PREFIXES = [
  "packages/engine/Source/Scene/",
  "packages/engine/Source/Renderer/",
  "packages/engine/Source/DataSources/",
  "packages/engine/Source/Widget/",
];

const files = await readCoreFileList();
const movedOldPaths = new Set(files.map((f) => f.oldSourcePath));

/**
 * Checks a single moved source file for imports that reach into a
 * not-moving part of the engine (Scene/Renderer/DataSources/Widget).
 *
 * @param {string} filePath
 * @returns {Promise<string[]>} Human-readable violation descriptions, empty if none.
 */
async function checkFile(filePath) {
  if (!existsSync(filePath) || !filePath.endsWith(".js")) {
    return [];
  }

  const source = await readFile(filePath, "utf-8");
  const violations = [];

  for (const regex of [
    DEFAULT_IMPORT_REGEX,
    JSDOC_IMPORT_REGEX,
    JSDOC_NAMED_IMPORT_REGEX,
  ]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source))) {
      const specifier = match[2];
      if (!specifier.startsWith(".")) {
        continue;
      }

      const resolvedPath = resolveImportPath(filePath, specifier);
      const relativeResolved = relative(repoRoot, resolvedPath).replaceAll(
        "\\",
        "/",
      );

      const isForbidden = FORBIDDEN_DIR_PREFIXES.some((prefix) =>
        relativeResolved.startsWith(prefix),
      );
      if (isForbidden && !movedOldPaths.has(resolvedPath)) {
        violations.push(
          `${relative(repoRoot, filePath)} imports "${specifier}" (-> ${relativeResolved}), which is not part of the move list`,
        );
      }
    }
  }

  return violations;
}

const allViolations = (
  await Promise.all(files.map((f) => checkFile(f.oldSourcePath)))
).flat();

if (allViolations.length > 0) {
  console.log(
    bright(
      red(
        `Dependency-graph guard failed with ${allViolations.length} violation(s):`,
      ),
    ),
  );
  for (const violation of allViolations) {
    console.log(dim(`  ${violation}`));
  }
  console.log();
  console.log(
    red(
      "Aborting - add the missing file(s) to scripts/core-package-list.txt, or remove the offending import, before running this script.",
    ),
  );
  process.exit(1);
}

console.log(green("Dependency-graph guard passed - no violations."));
console.log();

/**
 * @param {string} from
 * @param {string} to
 */
function gitMv(from, to) {
  console.log(
    `${dryRun ? dim("[dry-run] ") : ""}${relative(repoRoot, from)} ${bright("->")} ${relative(repoRoot, to)}`,
  );
  if (!dryRun) {
    execFileSync("git", ["mv", from, to], { cwd: repoRoot, stdio: "inherit" });
  }
}

let movedCount = 0;
for (const file of files) {
  if (!existsSync(file.oldSourcePath)) {
    console.log(
      yellow(`Skipping (not found): ${relative(repoRoot, file.oldSourcePath)}`),
    );
    continue;
  }

  gitMv(file.oldSourcePath, file.newSourcePath);
  movedCount++;

  if (file.oldSpecPath && file.newSpecPath && existsSync(file.oldSpecPath)) {
    gitMv(file.oldSpecPath, file.newSpecPath);
    movedCount++;
  } else if (file.oldSpecPath) {
    console.log(
      yellow(
        `  (no matching Spec file at ${relative(repoRoot, file.oldSpecPath)})`,
      ),
    );
  }
}

// The 3a placeholder files no longer serve a purpose once real files populate
// packages/core/Source and packages/core/Specs.
const placeholders = [
  `${repoRoot}/packages/core/Source/Placeholder.js`,
  `${repoRoot}/packages/core/Specs/PlaceholderSpec.js`,
];
for (const placeholder of placeholders) {
  if (existsSync(placeholder)) {
    console.log(
      `${dryRun ? dim("[dry-run] ") : ""}${red("remove")} ${relative(repoRoot, placeholder)}`,
    );
    if (!dryRun) {
      execFileSync("git", ["rm", placeholder], {
        cwd: repoRoot,
        stdio: "inherit",
      });
    }
  }
}

console.log();
console.log(
  bright(`${dryRun ? "[dry-run] " : ""}Moved ${movedCount} file(s).`),
);
