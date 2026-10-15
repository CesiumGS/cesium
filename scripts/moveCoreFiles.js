// @ts-check

/**
 * Phase 3c/3d migration script (move step): `git mv`s every file on
 * scripts/core-package-list.txt (plus its matching Spec file and the
 * defined.d.ts/Check.d.ts sibling files) into a flat packages/core/Source|Specs.
 *
 * Includes a dependency-graph guard: fails before moving anything if any moved
 * source *or Spec* file imports from packages/engine/Source/{Scene,Renderer,
 * DataSources,Widget} that isn't itself part of the move, or imports a root Specs/
 * helper (e.g. Specs/createContext.js) that itself depends on a symbol staying in
 * "@cesium/engine" or on "@cesium/widgets".
 *
 * Usage: node scripts/moveCoreFiles.js [--dry-run]
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { relative } from "node:path";

import {
  repoRoot,
  readCoreFileList,
  formatWithPrettier,
  resolveImportPath,
  getEngineDependentRootSpecHelpers,
  DEFAULT_IMPORT_REGEX,
  NAMED_IMPORT_REGEX,
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
const movedSymbolNames = new Set(
  files.map((f) => f.symbolName).filter((name) => name !== undefined),
);
const engineDependentSpecHelpers =
  await getEngineDependentRootSpecHelpers(movedSymbolNames);
const rootSpecsDir = `${repoRoot}/Specs/`;

/**
 * Checks a single moved source or Spec file for imports that reach into a
 * not-moving part of the engine (Scene/Renderer/DataSources/Widget), or into a
 * root Specs/ helper that itself depends on non-moved engine/widgets internals.
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
    NAMED_IMPORT_REGEX,
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
        continue;
      }

      if (
        resolvedPath.startsWith(rootSpecsDir) &&
        engineDependentSpecHelpers.has(resolvedPath)
      ) {
        violations.push(
          `${relative(repoRoot, filePath)} imports "${specifier}" (-> ${relativeResolved}), which depends on non-moved @cesium/engine or @cesium/widgets internals`,
        );
      }
    }
  }

  return violations;
}

const allViolations = (
  await Promise.all(
    files.flatMap((f) =>
      f.oldSpecPath
        ? [checkFile(f.oldSourcePath), checkFile(f.oldSpecPath)]
        : [checkFile(f.oldSourcePath)],
    ),
  )
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

const coreSmokeTestPath = `${repoRoot}/packages/core/Specs/test.mjs`;
const coreSmokeTestImportFix = [
  'import { Placeholder } from "@cesium/core";\nimport assert from "node:assert";\n\n// NodeJS smoke screen test\nassert(new Placeholder().value === true);\n',
  'import { Cartesian3 } from "@cesium/core";\nimport assert from "node:assert";\n\n// NodeJS smoke screen test\nconst cartesian = Cartesian3.fromDegrees(-75.59777, 40.03883);\nassert(cartesian instanceof Cartesian3);\n',
];

if (existsSync(coreSmokeTestPath)) {
  const source = await readFile(coreSmokeTestPath, "utf-8");
  if (source.includes(coreSmokeTestImportFix[0])) {
    console.log(
      `${dryRun ? dim("[dry-run] ") : ""}${green("update")} ${relative(repoRoot, coreSmokeTestPath)}`,
    );
    const formatted = await formatWithPrettier(
      coreSmokeTestPath,
      source.replace(coreSmokeTestImportFix[0], coreSmokeTestImportFix[1]),
    );
    if (!dryRun) {
      await writeFile(coreSmokeTestPath, formatted);
    }
  }
}

console.log();
console.log(
  bright(`${dryRun ? "[dry-run] " : ""}Moved ${movedCount} file(s).`),
);
