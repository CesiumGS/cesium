// @ts-check

/**
 * Shared helpers for the packages/core migration scripts (moveCoreFiles.js,
 * rewriteCoreImports.js, applyCoreOtherFixes.js).
 */

import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, "..");

export const coreListPath = join(repoRoot, "scripts/core-package-list.txt");

/** @param {string} str */
export const bright = (str) => `\x1b[1m${str}\x1b[0m`;
/** @param {string} str */
export const dim = (str) => `\x1b[2m${str}\x1b[0m`;
/** @param {string} str */
export const yellow = (str) => `\x1b[33m${str}\x1b[0m`;
/** @param {string} str */
export const green = (str) => `\x1b[32m${str}\x1b[0m`;
/** @param {string} str */
export const red = (str) => `\x1b[31m${str}\x1b[0m`;

/**
 * @typedef {object} MovedFile
 * @property {string} [symbolName] The barrel export name for this file (its basename without extension). Undefined for non-JS files (e.g. defined.d.ts).
 * @property {string} oldSourcePath Absolute path of the file at its current (pre-move) location.
 * @property {string} newSourcePath Absolute path of the file at its new (post-move) location.
 * @property {string|null} oldSpecPath Absolute path of the matching Spec file at its current location, or null if none.
 * @property {string|null} newSpecPath Absolute path of the matching Spec file at its new location, or null if none.
 */

/**
 * The two hand-written TypeScript declaration files that accompany defined.js/Check.js.
 * These aren't listed in core-package-list.txt (which only enumerates .js files) but must
 * move alongside their .js siblings so gulpfile.js's TypeScript-definition splice can be
 * repointed at their new location.
 * @type {MovedFile[]}
 */
export const EXTRA_MOVED_FILES = [
  {
    oldSourcePath: join(repoRoot, "packages/engine/Source/Core/defined.d.ts"),
    newSourcePath: join(repoRoot, "packages/core/Source/defined.d.ts"),
    oldSpecPath: null,
    newSpecPath: null,
  },
  {
    oldSourcePath: join(repoRoot, "packages/engine/Source/Core/Check.d.ts"),
    newSourcePath: join(repoRoot, "packages/core/Source/Check.d.ts"),
    oldSpecPath: null,
    newSpecPath: null,
  },
];

/**
 * Reads scripts/core-package-list.txt and returns the full list of files to move,
 * derived from the authoritative move list plus the two extra .d.ts files.
 *
 * @returns {Promise<MovedFile[]>}
 */
export async function readCoreFileList() {
  const contents = await readFile(coreListPath, "utf-8");
  const lines = contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));

  const files = lines.map((relativeSourcePath) => {
    const symbolName = basename(relativeSourcePath, ".js");
    const oldSourcePath = join(repoRoot, relativeSourcePath);
    const oldSpecPath = join(
      repoRoot,
      relativeSourcePath
        .replace("/Source/", "/Specs/")
        .replace(/\.js$/, "Spec.js"),
    );

    return {
      symbolName,
      oldSourcePath,
      newSourcePath: join(repoRoot, "packages/core/Source", `${symbolName}.js`),
      oldSpecPath,
      newSpecPath: join(
        repoRoot,
        "packages/core/Specs",
        `${symbolName}Spec.js`,
      ),
    };
  });

  return [...files, ...EXTRA_MOVED_FILES];
}

/**
 * Reformats source with prettier before writing, so mechanical import rewrites that push
 * lines past the configured print width (or change formatting) don't fail lint-staged/CI.
 *
 * @param {string} filePath Absolute path, used to resolve any applicable prettier config/overrides.
 * @param {string} source
 * @returns {Promise<string>}
 */
export async function formatWithPrettier(filePath, source) {
  const config = (await prettier.resolveConfig(filePath)) ?? {};
  return prettier.format(source, { ...config, filepath: filePath });
}

export const dryRun = process.argv.includes("--dry-run");

/** Matches a single-line default import: `import Name from "path";` */
export const DEFAULT_IMPORT_REGEX =
  /^import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["'];?\s*$/gm;

/** Matches a (possibly multi-line) named import: `import { A, B } from "path";` */
export const NAMED_IMPORT_REGEX =
  /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/g;

/** Matches a JSDoc default-style `@import` pragma: `/** @import Name from "path"; *\/` */
export const JSDOC_IMPORT_REGEX =
  /\/\*\*\s*@import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["'];?\s*\*\//g;

/** Matches a JSDoc named-style `@import` pragma: `/** @import { A, B } from "path"; *\/` */
export const JSDOC_NAMED_IMPORT_REGEX =
  /\/\*\*\s*@import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?\s*\*\//g;

/**
 * Resolves an import specifier relative to the file that contains it, appending ".js"
 * if the specifier has no extension.
 *
 * @param {string} fromFile Absolute path of the file containing the import.
 * @param {string} specifier The raw import path, e.g. "../Core/Cartesian3.js".
 * @returns {string} Absolute path of the resolved target.
 */
export function resolveImportPath(fromFile, specifier) {
  const resolved = resolve(dirname(fromFile), specifier);
  return resolved.endsWith(".js") ? resolved : `${resolved}.js`;
}
