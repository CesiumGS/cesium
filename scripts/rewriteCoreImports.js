// @ts-check

/**
 * Phase 3c/3d migration script (rewrite-imports step): rewrites both runtime `import`
 * statements and JSDoc `@import` comments that reference files moved to packages/core
 * by moveCoreFiles.js. Must run after moveCoreFiles.js.
 *
 * Relative imports to moved files become "@cesium/core" imports from files that
 * stayed in engine/widgets, or are recomputed from files that moved into core.
 * Named imports from the engine barrel are split between "@cesium/engine" and
 * "@cesium/core" when only some symbols moved.
 *
 * A moved Spec file that still imports engine-only symbols is reported for manual
 * review because packages/core cannot depend on packages/engine.
 *
 * Finally, any moved symbol referenced from a non-moved file (i.e. a real cross-package
 * "@cesium/core" import) that is still tagged `@private` has that tag promoted to
 * `@internal`, since tsd-jsdoc would otherwise exclude it from packages/core's own
 * .d.ts and break that cross-package import - see Tools/jsdoc/cesiumTags.js.
 *
 * Usage: node scripts/rewriteCoreImports.js [--dry-run]
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { globby } from "globby";

import {
  repoRoot,
  readCoreFileList,
  formatWithPrettier,
  resolveImportPath,
  DEFAULT_IMPORT_REGEX,
  NAMED_IMPORT_REGEX,
  JSDOC_IMPORT_REGEX,
  JSDOC_NAMED_IMPORT_REGEX,
  dryRun,
  bright,
  dim,
  yellow,
  green,
} from "./coreMigrationShared.js";

const files = await readCoreFileList();

/** Old absolute path (source or spec) -> new absolute path, for every moved file. */
const oldToNewPath = new Map();
/** New absolute path (source or spec) -> old absolute path, for every moved file. */
const newToOldPath = new Map();
/** Absolute source path (old, pre-move) -> barrel symbol name. */
const oldSourcePathToSymbol = new Map();
/** All barrel symbol names that moved to @cesium/core. */
const movedSymbolNames = new Set();

for (const file of files) {
  oldToNewPath.set(file.oldSourcePath, file.newSourcePath);
  newToOldPath.set(file.newSourcePath, file.oldSourcePath);
  if (file.oldSpecPath && file.newSpecPath) {
    oldToNewPath.set(file.oldSpecPath, file.newSpecPath);
    newToOldPath.set(file.newSpecPath, file.oldSpecPath);
  }
  if (file.symbolName && file.oldSourcePath.endsWith(".js")) {
    oldSourcePathToSymbol.set(file.oldSourcePath, file.symbolName);
    movedSymbolNames.add(file.symbolName);
  }
}

const engineIndexJs = join(repoRoot, "packages/engine/index.js");

const scanGlobs = [
  "packages/engine/Source/**/*.js",
  "packages/engine/Specs/**/*.js",
  "packages/engine/Specs/*.mjs",
  "packages/widgets/Source/**/*.js",
  "packages/widgets/Specs/**/*.js",
  "packages/widgets/Specs/*.mjs",
  "Specs/*.js",
  "packages/core/Source/*.js",
  "packages/core/Specs/*Spec.js",
];

const scanFiles = (
  await globby(scanGlobs, { cwd: repoRoot, absolute: true })
).sort();

/**
 * @param {string} fromDir
 * @param {string} toAbsPath
 * @returns {string} A relative import specifier, always prefixed with "./" or "../".
 */
function toRelativeSpecifier(fromDir, toAbsPath) {
  let specifier = relative(fromDir, toAbsPath).replaceAll("\\", "/");
  if (!specifier.startsWith(".")) {
    specifier = `./${specifier}`;
  }
  return specifier;
}

let updatedCount = 0;
/** @type {string[]} */
const skipped = [];
/** Barrel symbol names imported from "@cesium/core" by a file that did not move. */
const crossPackageSymbols = new Set();

for (const filePath of scanFiles) {
  const original = await readFile(filePath, "utf-8");
  let source = original;

  // `filePath` may be the file's old (pre-move) or new (post-move) location -
  // `newToOldPath` only has entries for the latter, so fall back to `filePath`
  // itself when this is scanned at its old location (including pre-move dry runs).
  const oldEquivalentPath = newToOldPath.get(filePath) ?? filePath;
  const isMovedFile = oldToNewPath.has(oldEquivalentPath);
  const resolutionBaseDir = dirname(oldEquivalentPath);

  /** Symbols that need to be merged into a new/existing "@cesium/core" import. */
  const movedSymbolsNeeded = new Set();
  let fileChanged = false;

  /**
   * Case 1 & 4 (default imports): rewrites a relative default import that resolves to a
   * moved file - either into a "@cesium/core" reference (non-moved files) or a
   * recomputed relative path (moved files, whether the target also moved or not).
   * @param {string} fullMatch
   * @param {string} name
   * @param {string} specifier
   * @returns {string}
   */
  function rewriteDefaultImport(fullMatch, name, specifier) {
    if (!specifier.startsWith(".")) {
      return fullMatch;
    }

    const resolvedOld = resolveImportPath(
      join(resolutionBaseDir, "x"),
      specifier,
    );

    if (isMovedFile) {
      const resolvedNew = oldToNewPath.get(resolvedOld);
      const targetAbsPath = resolvedNew ?? resolvedOld;
      const newSpecifier = toRelativeSpecifier(
        dirname(filePath),
        targetAbsPath,
      );
      if (newSpecifier === specifier) {
        return fullMatch;
      }
      fileChanged = true;
      return fullMatch.replace(specifier, newSpecifier);
    }

    const symbolName = oldSourcePathToSymbol.get(resolvedOld);
    if (!symbolName) {
      return fullMatch;
    }

    // The local binding name can differ from the barrel's export name (e.g.
    // "import CesiumMath from './Math.js'"), so alias it in the new named import.
    movedSymbolsNeeded.add(
      symbolName === name ? name : `${symbolName} as ${name}`,
    );
    fileChanged = true;
    return "";
  }

  source = source.replace(DEFAULT_IMPORT_REGEX, rewriteDefaultImport);

  /**
   * Case 2 & 3 (named/barrel imports): splits "@cesium/engine" (or, for engine's own
   * Specs, a relative self-barrel import of packages/engine/index.js) into the symbols
   * that stayed and the symbols that moved.
   * @param {string} fullMatch
   * @param {string} namesBlock
   * @param {string} specifier
   * @returns {string}
   */
  function rewriteNamedImport(fullMatch, namesBlock, specifier) {
    const isBareEngineImport = specifier === "@cesium/engine";
    const isRelativeEngineBarrel =
      specifier.startsWith(".") &&
      resolveImportPath(join(resolutionBaseDir, "x"), specifier) ===
        engineIndexJs;

    if (!isBareEngineImport && !isRelativeEngineBarrel) {
      // Not an engine barrel import - still need to fix relative depth if this file moved.
      if (isMovedFile && specifier.startsWith(".")) {
        const resolvedOld = resolveImportPath(
          join(resolutionBaseDir, "x"),
          specifier,
        );
        const resolvedNew = oldToNewPath.get(resolvedOld);
        const targetAbsPath = resolvedNew ?? resolvedOld;
        const newSpecifier = toRelativeSpecifier(
          dirname(filePath),
          targetAbsPath,
        );
        if (newSpecifier !== specifier) {
          fileChanged = true;
          return fullMatch.replace(specifier, newSpecifier);
        }
      }
      return fullMatch;
    }

    const names = namesBlock
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    // Match on the local name (before " as Alias"), not the full clause, so aliased
    // imports like "Math as CesiumMath" are still recognized as moved.
    /** @param {string} entry */
    const localName = (entry) => entry.split(/\s+as\s+/)[0].trim();

    const moved = names.filter((entry) =>
      movedSymbolNames.has(localName(entry)),
    );
    const kept = names.filter(
      (entry) => !movedSymbolNames.has(localName(entry)),
    );

    if (moved.length === 0) {
      return fullMatch;
    }

    if (isMovedFile) {
      if (kept.length > 0) {
        // A moved Spec file needs a symbol that did NOT move - core cannot depend on
        // engine, so this needs a human to decide how to handle it.
        skipped.push(
          `${relative(repoRoot, filePath)}: imports non-moved symbol(s) (${kept.join(", ")}) from its old engine barrel - needs manual review`,
        );
        return fullMatch;
      }

      // Every symbol moved along with the importing file itself - collapses to a
      // self-barrel import from packages/core's own index.js.
      const newSpecifier = toRelativeSpecifier(
        dirname(filePath),
        join(repoRoot, "packages/core/index.js"),
      );
      fileChanged = true;
      return `import { ${names.join(", ")} } from "${newSpecifier}";`;
    }

    fileChanged = true;
    for (const name of moved) {
      movedSymbolsNeeded.add(name);
    }

    return kept.length > 0
      ? `import { ${kept.join(", ")} } from "${specifier}";`
      : "";
  }

  source = source.replace(NAMED_IMPORT_REGEX, rewriteNamedImport);

  /**
   * JSDoc `@import` pragmas (default style only - the only real-world case is a moved
   * file referenced from packages/engine/Source/Renderer).
   * @param {string} fullMatch
   * @param {string} name
   * @param {string} specifier
   * @returns {string}
   */
  function rewriteJsdocImport(fullMatch, name, specifier) {
    if (!specifier.startsWith(".")) {
      return fullMatch;
    }

    const resolvedOld = resolveImportPath(
      join(resolutionBaseDir, "x"),
      specifier,
    );

    if (isMovedFile) {
      const resolvedNew = oldToNewPath.get(resolvedOld);
      const targetAbsPath = resolvedNew ?? resolvedOld;
      const newSpecifier = toRelativeSpecifier(
        dirname(filePath),
        targetAbsPath,
      );
      if (newSpecifier === specifier) {
        return fullMatch;
      }
      fileChanged = true;
      return fullMatch.replace(specifier, newSpecifier);
    }

    if (!oldSourcePathToSymbol.has(resolvedOld)) {
      return fullMatch;
    }

    if (!isMovedFile) {
      crossPackageSymbols.add(name);
    }
    fileChanged = true;
    return `/** @import { ${name} } from "@cesium/core"; */`;
  }

  source = source.replace(JSDOC_IMPORT_REGEX, rewriteJsdocImport);

  /**
   * JSDoc named-style `@import` pragmas: `/** @import { A, B } from "path"; *\/`. Unlike
   * cases 2 & 3, the names all come from a single sibling module (e.g. a moved
   * globalTypes.js/typedArrayTypes.js-style types-only file), so there is no barrel to
   * split - the whole specifier either moved (case 1: rewritten to "@cesium/core") or,
   * for a moved file's own such import, is recomputed from its new location (case 4).
   * @param {string} fullMatch
   * @param {string} namesBlock
   * @param {string} specifier
   * @returns {string}
   */
  function rewriteJsdocNamedImport(fullMatch, namesBlock, specifier) {
    if (!specifier.startsWith(".")) {
      return fullMatch;
    }

    const resolvedOld = resolveImportPath(
      join(resolutionBaseDir, "x"),
      specifier,
    );

    if (isMovedFile) {
      const resolvedNew = oldToNewPath.get(resolvedOld);
      const targetAbsPath = resolvedNew ?? resolvedOld;
      const newSpecifier = toRelativeSpecifier(
        dirname(filePath),
        targetAbsPath,
      );
      if (newSpecifier === specifier) {
        return fullMatch;
      }
      fileChanged = true;
      return fullMatch.replace(specifier, newSpecifier);
    }

    if (!oldSourcePathToSymbol.has(resolvedOld)) {
      return fullMatch;
    }

    if (!isMovedFile) {
      for (const rawName of namesBlock.split(",")) {
        const trimmed = rawName.split(/\s+as\s+/)[0].trim();
        if (trimmed.length > 0) {
          crossPackageSymbols.add(trimmed);
        }
      }
    }
    fileChanged = true;
    return `/** @import {${namesBlock}} from "@cesium/core"; */`;
  }

  source = source.replace(JSDOC_NAMED_IMPORT_REGEX, rewriteJsdocNamedImport);

  if (movedSymbolsNeeded.size > 0) {
    // Track which moved symbols a non-moved file now genuinely imports across
    // the package boundary, so any of them still tagged @private can be fixed up
    // afterward - core cannot export something tsd-jsdoc treats as nonexistent.
    if (!isMovedFile) {
      for (const entry of movedSymbolsNeeded) {
        crossPackageSymbols.add(entry.split(/\s+as\s+/)[0].trim());
      }
    }

    const targetSpecifier = isMovedFile
      ? toRelativeSpecifier(
          dirname(filePath),
          join(repoRoot, "packages/core/index.js"),
        )
      : "@cesium/core";

    // Anchored to the start of a line so this only matches a real runtime import
    // statement, never the same text appearing inside a "/** @import {...} */" pragma.
    const existingImportRegex = new RegExp(
      `^import\\s*\\{([^}]*)\\}\\s*from\\s*["']${targetSpecifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];?`,
      "m",
    );
    const existingMatch = source.match(existingImportRegex);

    if (existingMatch) {
      const existingNames = existingMatch[1]
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      const merged = [
        ...new Set([...existingNames, ...movedSymbolsNeeded]),
      ].sort();
      source = source.replace(
        existingImportRegex,
        `import { ${merged.join(", ")} } from "${targetSpecifier}";`,
      );
    } else {
      const sortedNames = [...movedSymbolsNeeded].sort();
      const newImportLine = `import { ${sortedNames.join(", ")} } from "${targetSpecifier}";\n`;
      // Insert after a leading "// @ts-check" pragma (plus its trailing blank
      // line(s)), if present, so that pragma stays the first line in the file.
      const tsCheckMatch = source.match(/^\/\/ @ts-check\r?\n(?:[ \t]*\r?\n)*/);
      const insertAt = tsCheckMatch ? tsCheckMatch[0].length : 0;
      source =
        source.slice(0, insertAt) + newImportLine + source.slice(insertAt);
    }
  }

  if (!fileChanged && movedSymbolsNeeded.size === 0) {
    continue;
  }

  // DEFAULT_IMPORT_REGEX/NAMED_IMPORT_REGEX match only up to end-of-line, not the
  // trailing newline, so replacing a fully-removed import with "" leaves a blank
  // line; only collapse when it directly follows another import statement, so a
  // legitimate blank line (e.g. after "// @ts-check") is never touched.
  source = source.replace(/;\n(?:[ \t]*\n)+(?=import )/g, ";\n");

  const formatted = await formatWithPrettier(filePath, source);
  if (!dryRun) {
    await writeFile(filePath, formatted);
  }
  updatedCount++;
  console.log(`${green("✓")} ${relative(repoRoot, filePath)}`);
}

// Symbols imported across the package boundary can't be @private - tsd-jsdoc
// would exclude them from packages/core's own .d.ts, breaking that very import.
// Promoting to @internal keeps them out of the combined "cesium" bundle instead
// (see Tools/jsdoc/cesiumTags.js).
let internalCount = 0;
for (const file of files) {
  if (!file.symbolName || !crossPackageSymbols.has(file.symbolName)) {
    continue;
  }

  // The file's content (including any @private tag) is unaffected by whether the
  // move has physically happened yet, so fall back to the old location for dry
  // runs done before moveCoreFiles.js.
  const targetPath = existsSync(file.newSourcePath)
    ? file.newSourcePath
    : file.oldSourcePath;
  if (!existsSync(targetPath)) {
    continue;
  }

  const fileSource = await readFile(targetPath, "utf-8");
  // Only the doc comment attached to the file's own top-level declaration counts -
  // a file can be genuinely public overall while some unrelated internal method
  // elsewhere in it (e.g. BoxGeometry.getUnitBox) happens to also be @private.
  // The comment body must not match across a "*/" boundary, or lazy backtracking
  // would bridge all the way from an earlier, unrelated comment (e.g. Ellipsoid.js's
  // @private EllipsoidRealValuedScalarFunction callback typedef) to this declaration.
  const symbolDeclRegex = new RegExp(
    `/\\*\\*((?:[^*]|\\*(?!/))*)\\*/\\s*(?:export\\s+default\\s+)?(?:const|class|function)\\s+${file.symbolName}\\b`,
  );
  const declMatch = fileSource.match(symbolDeclRegex);
  if (
    !declMatch ||
    declMatch.index === undefined ||
    !/@private\b/.test(declMatch[1])
  ) {
    continue;
  }

  const updatedDecl = declMatch[0].replace(/@private\b/, "@internal");
  const updatedSource =
    fileSource.slice(0, declMatch.index) +
    updatedDecl +
    fileSource.slice(declMatch.index + declMatch[0].length);
  if (!dryRun) {
    await writeFile(targetPath, updatedSource);
  }
  internalCount++;
  console.log(
    `${green("✓")} ${relative(repoRoot, targetPath)}: @private -> @internal`,
  );
}

console.log();
if (skipped.length > 0) {
  console.log(
    bright(yellow(`Skipped ${skipped.length} case(s), needs manual review:`)),
  );
  for (const entry of skipped) {
    console.log(dim(`  ${entry}`));
  }
  console.log();
}
console.log(
  bright(`${dryRun ? "[dry-run] " : ""}Updated ${updatedCount} file(s).`),
);
console.log(
  bright(
    `${dryRun ? "[dry-run] " : ""}Promoted ${internalCount} symbol(s) from @private to @internal.`,
  ),
);
