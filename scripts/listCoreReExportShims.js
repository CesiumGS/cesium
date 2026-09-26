// @ts-check

/**
 * Determines which scripts/core-package-list.txt symbols need a deprecated
 * re-export shim from @cesium/engine (i.e. were part of engine's public API
 * before the move to packages/core).
 *
 * A moved symbol is excluded from the shim list if either:
 * - its own top-level declaration is currently tagged @private or @internal
 *   in packages/core/Source, or
 * - it's listed in scripts/promoted-core-packages-review.txt, which records
 *   symbols whose access level changed as part of the move.
 *
 * Usage: node scripts/listCoreReExportShims.js
 * Writes scripts/core-reexport-shim-candidates.txt.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { repoRoot, readCoreFileList } from "./coreMigrationShared.js";

const reviewPath = join(repoRoot, "scripts/promoted-core-packages-review.txt");
const outputPath = join(repoRoot, "scripts/core-reexport-shim-candidates.txt");

/**
 * Extracts the "--- SymbolName ---" headers from a slice of promoted-core-packages-review.txt.
 * @param {string} text
 * @returns {Set<string>}
 */
function extractReviewedSymbols(text) {
  const names = new Set();
  const headerRegex = /^--- (\S+) ---$/gm;
  let match;
  while ((match = headerRegex.exec(text))) {
    names.add(match[1]);
  }
  return names;
}

/**
 * @returns {Promise<{promotedToPublic: Set<string>, promotedToInternal: Set<string>}>}
 */
async function readPromotedSymbols() {
  const text = await readFile(reviewPath, "utf-8");
  const internalBannerIndex = text.indexOf("PROMOTE TO @internal");

  return {
    promotedToPublic: extractReviewedSymbols(
      text.slice(0, internalBannerIndex),
    ),
    promotedToInternal: extractReviewedSymbols(text.slice(internalBannerIndex)),
  };
}

/**
 * Finds the JSDoc block directly attached to a file's own top-level
 * declaration (`class Name`, `function Name(`, `const/let Name =`, or `let
 * Name;`), or - since some files alias their internal variable name via
 * `@alias` (e.g. Math.js's `const CesiumMath = {}` is `@alias Math`) - a
 * block anywhere in the file tagged `@alias Name`. A file may define private
 * helpers with their own doc comments first, so the first JSDoc block in the
 * file isn't necessarily the right one; a `//` line comment (e.g.
 * `@ts-expect-error`) may also sit between a doc block and the declaration
 * it documents.
 * @param {string} source
 * @param {string} symbolName
 * @returns {string|undefined}
 */
function findDeclarationDoc(source, symbolName) {
  const aliasRegex = new RegExp(`@alias\\s+${symbolName}\\b`);
  const aliasedBlock = source
    .match(/\/\*\*[\s\S]*?\*\//g)
    ?.find((block) => aliasRegex.test(block));
  if (aliasedBlock) {
    return aliasedBlock;
  }

  const declRegex = new RegExp(
    `^(?:export default )?(?:class ${symbolName}\\b|function ${symbolName}\\(|(?:const|let) ${symbolName}\\s*[=;])`,
    "m",
  );
  const declMatch = declRegex.exec(source);
  if (!declMatch) {
    return undefined;
  }

  const before = source.slice(0, declMatch.index);
  const blocks = [...before.matchAll(/\/\*\*[\s\S]*?\*\//g)];
  if (blocks.length === 0) {
    return undefined;
  }

  const lastBlock = blocks[blocks.length - 1];
  const between = before
    .slice(lastBlock.index + lastBlock[0].length)
    .replace(/\/\/[^\n]*/g, "");
  // Only whitespace (and // line comments) may separate the doc comment from the declaration it documents.
  if (!/^\s*$/.test(between)) {
    return undefined;
  }

  return lastBlock[0];
}

/**
 * @param {string} filePath
 * @param {string} symbolName
 * @returns {Promise<"private"|"internal"|"public"|"undocumented">}
 */
async function getDeclarationTag(filePath, symbolName) {
  const source = await readFile(filePath, "utf-8");
  const block = findDeclarationDoc(source, symbolName);
  if (!block) {
    return "undocumented";
  }

  if (/@private\b/.test(block)) {
    return "private";
  }
  if (/@internal\b/.test(block)) {
    return "internal";
  }
  return "public";
}

/**
 * Computes the shim-candidate categorization for every scripts/core-package-list.txt
 * entry.
 * @returns {Promise<{
 *   needsShim: string[],
 *   excludedStillPrivate: string[],
 *   excludedStillInternal: string[],
 *   excludedPromotedPublic: string[],
 *   excludedPromotedInternal: string[],
 *   flaggedUndocumented: string[],
 *   totalCount: number,
 * }>}
 */
async function computeShimCandidates() {
  const { promotedToPublic, promotedToInternal } = await readPromotedSymbols();
  const files = (await readCoreFileList()).filter(
    (file) => file.symbolName && file.newSourcePath.endsWith(".js"),
  );

  /** @type {string[]} */
  const needsShim = [];
  /** @type {string[]} */
  const excludedStillPrivate = [];
  /** @type {string[]} */
  const excludedStillInternal = [];
  /** @type {string[]} */
  const excludedPromotedPublic = [];
  /** @type {string[]} */
  const excludedPromotedInternal = [];
  /** @type {string[]} */
  const flaggedUndocumented = [];

  for (const file of files) {
    const symbolName = /** @type {string} */ (file.symbolName);

    if (promotedToPublic.has(symbolName)) {
      excludedPromotedPublic.push(symbolName);
      continue;
    }
    if (promotedToInternal.has(symbolName)) {
      excludedPromotedInternal.push(symbolName);
      continue;
    }

    const tag = await getDeclarationTag(file.newSourcePath, symbolName);
    if (tag === "private") {
      excludedStillPrivate.push(symbolName);
    } else if (tag === "internal") {
      excludedStillInternal.push(symbolName);
    } else if (tag === "undocumented") {
      flaggedUndocumented.push(symbolName);
    } else {
      needsShim.push(symbolName);
    }
  }

  return {
    needsShim,
    excludedStillPrivate,
    excludedStillInternal,
    excludedPromotedPublic,
    excludedPromotedInternal,
    flaggedUndocumented,
    totalCount: files.length,
  };
}

async function main() {
  const {
    needsShim,
    excludedStillPrivate,
    excludedStillInternal,
    excludedPromotedPublic,
    excludedPromotedInternal,
    flaggedUndocumented,
    totalCount,
  } = await computeShimCandidates();

  /**
   * @param {string} title
   * @param {string[]} names
   * @returns {string}
   */
  function formatSection(title, names) {
    return [
      `${title} (${names.length})`,
      ...names.sort().map((name) => `  ${name}`),
    ].join("\n");
  }

  const report = [
    formatSection("NEEDS SHIM", needsShim),
    formatSection(
      "EXCLUDED - still @private in packages/core",
      excludedStillPrivate,
    ),
    formatSection(
      "EXCLUDED - still @internal in packages/core",
      excludedStillInternal,
    ),
    formatSection(
      "EXCLUDED - promoted @private -> public during move",
      excludedPromotedPublic,
    ),
    formatSection(
      "EXCLUDED - promoted @private -> @internal during move",
      excludedPromotedInternal,
    ),
    formatSection(
      "FLAGGED - no JSDoc comment on declaration (manual review needed)",
      flaggedUndocumented,
    ),
    `Total moved symbols: ${totalCount}, needs shim: ${needsShim.length}`,
  ].join("\n\n");

  await writeFile(outputPath, `${report}\n`, "utf-8");
  console.log(report);
  console.log(`\nWrote ${outputPath}`);
}

await main();
