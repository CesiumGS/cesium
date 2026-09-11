// @ts-check

/**
 * Phase 3c/3d migration script (rewrite-imports step): rewrites both runtime `import`
 * statements and JSDoc `@import` comments that reference files moved to packages/core
 * by moveCoreFiles.js. Must run after moveCoreFiles.js.
 *
 * Handles four cases:
 *  1. Relative default imports and JSDoc named `@import {...}` pragmas in
 *     packages/engine/Source (and packages/widgets/Source, though widgets never imports
 *     engine internals by relative path in practice) that point at a moved file - these
 *     become named imports (or, for JSDoc pragmas, JSDoc named imports) from
 *     "@cesium/core".
 *  2. Barrel-style named imports of moved symbols from "@cesium/engine" (in
 *     packages/widgets and root Specs/) - split into a "@cesium/engine" import for the
 *     symbols that stayed and a "@cesium/core" import for the symbols that moved.
 *  3. The same self-barrel splitting for packages/engine/Specs files that import their
 *     own package's generated index.js by relative path.
 *  4. Files that themselves moved (now under packages/core/Source|Specs) - their existing
 *     relative imports (default or JSDoc named) are recomputed from their new location,
 *     whether the target also moved (collapses to a flat "./X.js" sibling import) or
 *     stayed put (e.g. shared root Specs/ helpers, whose relative depth shrinks by one
 *     level once the Core/Scene/Renderer subfolder is gone).
 *
 * Ambiguous cases (a moved file whose Spec needs a symbol that did NOT move) are left
 * untouched and reported for manual review, rather than guessed at.
 *
 * Usage: node scripts/rewriteCoreImports.js [--dry-run]
 */

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
  "packages/widgets/Source/**/*.js",
  "packages/widgets/Specs/**/*.js",
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

for (const filePath of scanFiles) {
  const original = await readFile(filePath, "utf-8");
  let source = original;

  const isMovedFile = newToOldPath.has(filePath);
  const resolutionBaseDir = isMovedFile
    ? dirname(/** @type {string} */ (newToOldPath.get(filePath)))
    : dirname(filePath);

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

    if (!oldSourcePathToSymbol.has(resolvedOld)) {
      return fullMatch;
    }

    movedSymbolsNeeded.add(name);
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

    fileChanged = true;
    return `/** @import {${namesBlock}} from "@cesium/core"; */`;
  }

  source = source.replace(JSDOC_NAMED_IMPORT_REGEX, rewriteJsdocNamedImport);

  if (movedSymbolsNeeded.size > 0) {
    const targetSpecifier = isMovedFile
      ? toRelativeSpecifier(
          dirname(filePath),
          join(repoRoot, "packages/core/index.js"),
        )
      : "@cesium/core";

    const existingImportRegex = new RegExp(
      `import\\s*\\{([^}]*)\\}\\s*from\\s*["']${targetSpecifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];?`,
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
      source = `import { ${sortedNames.join(", ")} } from "${targetSpecifier}";\n${source}`;
    }
  }

  if (!fileChanged && movedSymbolsNeeded.size === 0) {
    continue;
  }

  const formatted = await formatWithPrettier(filePath, source);
  if (!dryRun) {
    await writeFile(filePath, formatted);
  }
  updatedCount++;
  console.log(`${green("✓")} ${relative(repoRoot, filePath)}`);
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
