// @ts-check

/**
 * Migration script for extracting GltfPipeline into @cesium/gltf.
 *
 * Moves the 24 files listed in scripts/gltf-package-list.txt from flat
 * packages/engine/Source/Scene/GltfPipeline into flat packages/gltf/Source
 * (via `git mv`, so history is preserved), removes the packages/gltf
 * placeholder files, scans packages/engine and packages/widgets Source/Specs
 * plus root Specs for every consumer of a moved symbol - whether via a
 * relative import of the manifest module or a named import from the engine
 * barrel ("@cesium/engine", or a relative self-barrel resolving to
 * packages/engine/index.js) - and rewrites each into "@cesium/gltf" imports.
 * Each moved symbol's top-level declaration is promoted to @internal if the
 * scan found it imported from outside packages/gltf, or set to @private
 * otherwise (mirroring how rewriteCoreImports.js scopes the same promotion
 * to symbols referenced across the @cesium/core package boundary).
 *
 * Modeled on scripts/moveCoreFiles.js and scripts/rewriteCoreImports.js, as a
 * single dedicated script: this migration is flat-to-flat, so moved files
 * never need their own imports rewritten - only their consumers do.
 *
 * Usage:
 *   node scripts/migrateGltfPipeline.js              # move + rewrite
 *   node scripts/migrateGltfPipeline.js --dry-run    # preview only, no writes
 *   node scripts/migrateGltfPipeline.js --check      # verify an already-migrated tree, no writes
 *
 * Reviewer reproduction: from the parent of the migration commit, run this
 * script with no flags and confirm the resulting tracked diff matches the
 * committed migration; on the migrated commit, run with --check to verify
 * the invariants below still hold.
 */

import { existsSync } from "node:fs";
import { readFile, writeFile, readdir, rmdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { globby } from "globby";
import prettier from "prettier";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

/** @param {string} str */
const bright = (str) => `\x1b[1m${str}\x1b[0m`;
/** @param {string} str */
const dim = (str) => `\x1b[2m${str}\x1b[0m`;
/** @param {string} str */
const green = (str) => `\x1b[32m${str}\x1b[0m`;
/** @param {string} str */
const red = (str) => `\x1b[31m${str}\x1b[0m`;

const manifestPath = join(repoRoot, "scripts/gltf-package-list.txt");
const oldSourceDir = join(
  repoRoot,
  "packages/engine/Source/Scene/GltfPipeline",
);
const newSourceDir = join(repoRoot, "packages/gltf/Source");

const placeholders = [
  join(repoRoot, "packages/gltf/Source/Placeholder.js"),
  join(repoRoot, "packages/gltf/Specs/PlaceholderSpec.js"),
];

const gltfSmokeTestPath = join(repoRoot, "packages/gltf/Specs/test.mjs");
const gltfSmokeTestImportFix = [
  'import { Placeholder } from "@cesium/gltf";\nimport assert from "node:assert";\n\n// NodeJS smoke screen test\nassert(typeof Placeholder === "function");\n',
  'import { numberOfComponentsForType } from "@cesium/gltf";\nimport assert from "node:assert";\n\n// NodeJS smoke screen test\nassert(numberOfComponentsForType("VEC3") === 3);\n',
];

/** Absolute path of the engine package barrel, for detecting a relative self-barrel import. */
const engineIndexJs = join(repoRoot, "packages/engine/index.js");

/** Every file that could import a moved symbol, whether by relative path or through the engine barrel. */
const scanGlobs = [
  "packages/engine/Source/**/*.js",
  "packages/engine/Specs/**/*.js",
  "packages/engine/Specs/*.mjs",
  "packages/widgets/Source/**/*.js",
  "packages/widgets/Specs/**/*.js",
  "packages/widgets/Specs/*.mjs",
  "Specs/**/*.js",
];

/** Import specifiers, besides "@cesium/core" and sibling manifest modules, that a moved module may depend on. @type {string[]} */
const ALLOWED_THIRD_PARTY_IMPORTS = [];

/** Matches a single-line default import: `import Name from "path";` */
const DEFAULT_IMPORT_REGEX =
  /^import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["'];?\s*$/gm;

/** Matches a (possibly multi-line) named import: `import { A, B } from "path";` */
const NAMED_IMPORT_REGEX = /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/g;

/**
 * Resolves an import specifier relative to the file that contains it, appending ".js"
 * if the specifier has no extension.
 * @param {string} fromFile Absolute path of the file containing the import.
 * @param {string} specifier
 * @returns {string}
 */
function resolveImportPath(fromFile, specifier) {
  const resolved = resolve(dirname(fromFile), specifier);
  return resolved.endsWith(".js") ? resolved : `${resolved}.js`;
}

const args = process.argv.slice(2);
const isCheck = args.includes("--check");
const dryRun = args.includes("--dry-run");

if (isCheck && dryRun) {
  console.log(red("--check and --dry-run cannot be combined."));
  process.exit(1);
}

/**
 * @typedef {object} MovedFile
 * @property {string} symbolName
 * @property {string} oldSourcePath
 * @property {string} newSourcePath
 */

/** @returns {Promise<MovedFile[]>} */
async function readManifest() {
  const contents = await readFile(manifestPath, "utf-8");
  const relativePaths = contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));

  return relativePaths.map((relativeSourcePath) => {
    const symbolName = basename(relativeSourcePath, ".js");
    return {
      symbolName,
      oldSourcePath: join(repoRoot, relativeSourcePath),
      newSourcePath: join(newSourceDir, `${symbolName}.js`),
    };
  });
}

/**
 * @param {string} filePath
 * @param {string} source
 * @returns {Promise<string>}
 */
async function formatWithPrettier(filePath, source) {
  const config = (await prettier.resolveConfig(filePath)) ?? {};
  return prettier.format(source, { ...config, filepath: filePath });
}

/**
 * Asserts that `oldSourceDir` contains exactly the manifest's files - no more, no fewer.
 * @param {MovedFile[]} files
 * @returns {Promise<string[]>}
 */
async function checkDirectoryDrift(files) {
  if (!existsSync(oldSourceDir)) {
    return [
      `${relative(repoRoot, oldSourceDir)} does not exist - already migrated? Use --check instead.`,
    ];
  }

  const actual = new Set(
    (await readdir(oldSourceDir)).filter((name) => name.endsWith(".js")),
  );
  const expected = new Set(files.map((f) => `${f.symbolName}.js`));

  const violations = [];
  for (const name of expected) {
    if (!actual.has(name)) {
      violations.push(
        `Manifest lists ${name}, but it is missing from ${relative(repoRoot, oldSourceDir)}`,
      );
    }
  }
  for (const name of actual) {
    if (!expected.has(name)) {
      violations.push(
        `${relative(repoRoot, oldSourceDir)} contains ${name}, which is not in scripts/gltf-package-list.txt`,
      );
    }
  }
  return violations;
}

/**
 * Asserts every moved module's imports resolve to another manifest module, "@cesium/core",
 * or an entry in ALLOWED_THIRD_PARTY_IMPORTS.
 * @param {MovedFile[]} files
 * @returns {Promise<string[]>}
 */
async function checkImportScope(files) {
  const manifestBasenames = new Set(files.map((f) => `${f.symbolName}.js`));
  const violations = [];

  for (const file of files) {
    if (!existsSync(file.oldSourcePath)) {
      continue;
    }
    const source = await readFile(file.oldSourcePath, "utf-8");

    for (const regex of [DEFAULT_IMPORT_REGEX, NAMED_IMPORT_REGEX]) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(source))) {
        const specifier = match[2];
        if (
          specifier === "@cesium/core" ||
          ALLOWED_THIRD_PARTY_IMPORTS.includes(specifier)
        ) {
          continue;
        }
        if (
          specifier.startsWith("./") &&
          manifestBasenames.has(specifier.slice(2))
        ) {
          continue;
        }
        violations.push(
          `${relative(repoRoot, file.oldSourcePath)} imports "${specifier}", which is not @cesium/core, an allowed third-party package, or another manifest module`,
        );
      }
    }
  }
  return violations;
}

/**
 * Reports every file in `scanGlobs` (outside of `excludePaths`) that still contains the
 * literal text "GltfPipeline", so unexpected consumers are surfaced instead of guessed at.
 * @param {Set<string>} excludePaths Absolute paths to skip.
 * @returns {Promise<string[]>}
 */
async function scanForStaleReferences(excludePaths) {
  const scanFiles = (
    await globby(scanGlobs, { cwd: repoRoot, absolute: true })
  ).sort();

  const hits = [];
  for (const filePath of scanFiles) {
    if (excludePaths.has(filePath)) {
      continue;
    }
    const source = await readFile(filePath, "utf-8");
    if (source.includes("GltfPipeline")) {
      hits.push(
        `${relative(repoRoot, filePath)} still references "GltfPipeline"`,
      );
    }
  }
  return hits;
}

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

/** @param {string} placeholder */
function gitRm(placeholder) {
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

/**
 * Finds the docblock attached to `symbolName`'s top-level `function`/`const`/`class`
 * declaration - the same technique rewriteCoreImports.js uses to isolate a moved
 * symbol's own tag from unrelated nested @private helpers (e.g. ForEach.js's per-method
 * docblocks).
 * @param {string} source
 * @param {string} symbolName
 * @returns {RegExpMatchArray|null}
 */
function findTopLevelDeclComment(source, symbolName) {
  const symbolDeclRegex = new RegExp(
    `/\\*\\*((?:[^*]|\\*(?!/))*)\\*/\\s*(?:export\\s+default\\s+)?(?:const|class|function)\\s+${symbolName}\\b`,
  );
  return source.match(symbolDeclRegex);
}

/**
 * @param {string} source
 * @param {string} symbolName
 * @returns {"private"|"internal"|"none"|null} null if no top-level declaration was found.
 */
function getVisibilityTag(source, symbolName) {
  const declMatch = findTopLevelDeclComment(source, symbolName);
  if (!declMatch) {
    return null;
  }
  if (/@internal\b/.test(declMatch[1])) {
    return "internal";
  }
  if (/@private\b/.test(declMatch[1])) {
    return "private";
  }
  return "none";
}

/**
 * Sets `symbolName`'s top-level declaration to `tag`, replacing any existing
 * @private/@internal tag, or inserting one if neither is present (removeExtension has
 * no tag at all in engine).
 * @param {string} source
 * @param {string} symbolName
 * @param {"private"|"internal"} tag
 * @returns {string|null} The updated source, or null if no change was needed/possible.
 */
function setVisibilityTag(source, symbolName, tag) {
  const declMatch = findTopLevelDeclComment(source, symbolName);
  if (!declMatch || declMatch.index === undefined) {
    return null;
  }

  const commentBody = declMatch[1];
  if (new RegExp(`@${tag}\\b`).test(commentBody)) {
    return null;
  }

  const updatedDecl = /@(private|internal)\b/.test(commentBody)
    ? declMatch[0].replace(/@(private|internal)\b/, `@${tag}`)
    : declMatch[0].replace("*/", ` *\n * @${tag}\n */`);

  return (
    source.slice(0, declMatch.index) +
    updatedDecl +
    source.slice(declMatch.index + declMatch[0].length)
  );
}

/**
 * Detects (and returns a rewritten version of) every import of a manifest symbol in
 * `filePath` - a relative import of the manifest module itself, or a named import from
 * the engine barrel ("@cesium/engine", or a relative self-barrel resolving to
 * packages/engine/index.js) - merged into a single sorted import from "@cesium/gltf"
 * inserted after the file's "@cesium/core" import (or at the top of the file).
 * @param {string} filePath
 * @param {Map<string, string>} manifestByOldPath Absolute old source path -> symbolName.
 * @param {Set<string>} manifestSymbolNames
 * @returns {Promise<{changed: boolean, source?: string, movedSymbols: string[]}>}
 */
async function rewriteFileConsumerImports(
  filePath,
  manifestByOldPath,
  manifestSymbolNames,
) {
  const originalSource = await readFile(filePath, "utf-8");
  const lines = originalSource.split("\n");
  const defaultImportLineRegex =
    /^import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["'];?\s*$/;

  /** @type {string[]} */
  const movedEntries = [];
  /** @type {Set<number>} */
  const removeLineIndices = new Set();

  lines.forEach((line, index) => {
    const match = line.match(defaultImportLineRegex);
    if (!match) {
      return;
    }
    const [, localName, specifier] = match;
    if (!specifier.startsWith(".")) {
      return;
    }
    const resolved = resolveImportPath(filePath, specifier);
    const symbolName = manifestByOldPath.get(resolved);
    if (!symbolName) {
      return;
    }
    movedEntries.push(
      symbolName === localName ? symbolName : `${symbolName} as ${localName}`,
    );
    removeLineIndices.add(index);
  });

  const remainingLines = [];
  for (let index = 0; index < lines.length; index++) {
    if (!removeLineIndices.has(index)) {
      remainingLines.push(lines[index]);
    }
  }
  let source = remainingLines.join("\n");

  const barrelImportRegex = /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/g;
  barrelImportRegex.lastIndex = 0;
  let barrelMatch;
  /** @type {{fullMatch: string, replacement: string}[]} */
  const barrelReplacements = [];
  while ((barrelMatch = barrelImportRegex.exec(source))) {
    const [fullMatch, namesBlock, specifier] = barrelMatch;
    const isBareEngineImport = specifier === "@cesium/engine";
    const isRelativeEngineBarrel =
      specifier.startsWith(".") &&
      resolveImportPath(filePath, specifier) === engineIndexJs;
    if (!isBareEngineImport && !isRelativeEngineBarrel) {
      continue;
    }

    const names = namesBlock
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    /** @param {string} entry */
    const localName = (entry) => entry.split(/\s+as\s+/)[0].trim();

    const kept = names.filter(
      (entry) => !manifestSymbolNames.has(localName(entry)),
    );
    const moved = names.filter((entry) =>
      manifestSymbolNames.has(localName(entry)),
    );
    if (moved.length === 0) {
      continue;
    }

    movedEntries.push(...moved);
    const replacement =
      kept.length > 0
        ? `import { ${kept.join(", ")} } from "${specifier}";`
        : "";
    barrelReplacements.push({ fullMatch, replacement });
  }

  for (const { fullMatch, replacement } of barrelReplacements) {
    const searchTarget = replacement === "" ? `${fullMatch}\n` : fullMatch;
    source = source.replace(searchTarget, replacement);
  }

  if (movedEntries.length === 0) {
    return { changed: false, movedSymbols: [] };
  }

  const sortedNames = [...new Set(movedEntries)].sort();
  const mergedImportLine = `import { ${sortedNames.join(", ")} } from "@cesium/gltf";`;

  const coreImportRegex =
    /import\s*\{[^}]*\}\s*from\s*["']@cesium\/core["'];?\n/;
  const coreImportMatch = source.match(coreImportRegex);
  const insertAt =
    coreImportMatch && coreImportMatch.index !== undefined
      ? coreImportMatch.index + coreImportMatch[0].length
      : 0;

  const newSource = `${source.slice(0, insertAt)}${mergedImportLine}\n${source.slice(insertAt)}`;

  return {
    changed: true,
    source: newSource,
    movedSymbols: sortedNames.map((entry) => entry.split(/\s+as\s+/)[0].trim()),
  };
}

/**
 * Collects every symbol name imported from "@cesium/gltf" across `scanFiles` - the
 * post-migration, self-verifying source of truth for which manifest symbols must be
 * @internal (--check has no fixed oracle to compare against; it re-derives the expected
 * tagging from what the tree actually imports).
 * @param {string[]} scanFiles Absolute paths.
 * @returns {Promise<Set<string>>}
 */
async function findSymbolsImportedFromGltf(scanFiles) {
  const found = new Set();
  const gltfImportRegex =
    /import\s*\{([^}]*)\}\s*from\s*["']@cesium\/gltf["'];?/g;
  for (const filePath of scanFiles) {
    const source = await readFile(filePath, "utf-8");
    gltfImportRegex.lastIndex = 0;
    let match;
    while ((match = gltfImportRegex.exec(source))) {
      for (const entry of match[1].split(",")) {
        const name = entry.split(/\s+as\s+/)[0].trim();
        if (name.length > 0) {
          found.add(name);
        }
      }
    }
  }
  return found;
}

async function runMigration() {
  const files = await readManifest();
  const manifestByOldPath = new Map(
    files.map((f) => [f.oldSourcePath, f.symbolName]),
  );
  const manifestSymbolNames = new Set(files.map((f) => f.symbolName));

  const scanFiles = (await globby(scanGlobs, { cwd: repoRoot, absolute: true }))
    .filter((filePath) => !manifestByOldPath.has(filePath))
    .sort();

  /** @type {Map<string, {changed: boolean, source?: string, movedSymbols: string[]}>} */
  const consumerResults = new Map();
  for (const filePath of scanFiles) {
    const result = await rewriteFileConsumerImports(
      filePath,
      manifestByOldPath,
      manifestSymbolNames,
    );
    if (result.changed) {
      consumerResults.set(filePath, result);
    }
  }

  const violations = [
    ...(await checkDirectoryDrift(files)),
    ...(await checkImportScope(files)),
    ...(await scanForStaleReferences(new Set(consumerResults.keys()))),
  ];

  if (violations.length > 0) {
    console.log(
      bright(red(`Preflight failed with ${violations.length} violation(s):`)),
    );
    for (const violation of violations) {
      console.log(dim(`  ${violation}`));
    }
    console.log();
    console.log(
      red(
        "Aborting - fix scripts/gltf-package-list.txt or the source tree before running this script again.",
      ),
    );
    process.exit(1);
  }

  console.log(
    green(
      "Preflight passed - manifest matches source tree, imports are in-scope, no unexpected stale references.",
    ),
  );
  console.log();

  for (const file of files) {
    gitMv(file.oldSourcePath, file.newSourcePath);
  }

  // git doesn't track directories, so it leaves the now-empty old directory behind.
  console.log(
    `${dryRun ? dim("[dry-run] ") : ""}${red("rmdir")} ${relative(repoRoot, oldSourceDir)}`,
  );
  if (!dryRun) {
    await rmdir(oldSourceDir);
  }

  for (const placeholder of placeholders) {
    if (existsSync(placeholder)) {
      gitRm(placeholder);
    }
  }

  if (existsSync(gltfSmokeTestPath)) {
    const source = await readFile(gltfSmokeTestPath, "utf-8");
    if (source.includes(gltfSmokeTestImportFix[0])) {
      console.log(
        `${dryRun ? dim("[dry-run] ") : ""}${green("update")} ${relative(repoRoot, gltfSmokeTestPath)}`,
      );
      const formatted = await formatWithPrettier(
        gltfSmokeTestPath,
        source.replace(gltfSmokeTestImportFix[0], gltfSmokeTestImportFix[1]),
      );
      if (!dryRun) {
        await writeFile(gltfSmokeTestPath, formatted);
      }
    }
  }

  console.log();

  let rewrittenCount = 0;
  const crossPackageSymbols = new Set();
  for (const [filePath, result] of consumerResults) {
    if (result.source === undefined) {
      continue;
    }
    for (const symbol of result.movedSymbols) {
      crossPackageSymbols.add(symbol);
    }

    console.log(
      `${dryRun ? dim("[dry-run] ") : ""}${green("rewrite")} ${relative(repoRoot, filePath)}`,
    );
    if (!dryRun) {
      const formatted = await formatWithPrettier(filePath, result.source);
      await writeFile(filePath, formatted);
    }
    rewrittenCount++;
  }

  console.log();

  let taggedCount = 0;
  for (const file of files) {
    const targetPath = dryRun ? file.oldSourcePath : file.newSourcePath;
    if (!existsSync(targetPath)) {
      continue;
    }

    const tag = crossPackageSymbols.has(file.symbolName)
      ? "internal"
      : "private";
    const source = await readFile(targetPath, "utf-8");
    const updated = setVisibilityTag(source, file.symbolName, tag);
    if (updated === null) {
      continue;
    }

    console.log(
      `${dryRun ? dim("[dry-run] ") : ""}${green(`tag @${tag}`)} ${relative(repoRoot, targetPath)}`,
    );
    if (!dryRun) {
      await writeFile(targetPath, updated);
    }
    taggedCount++;
  }

  console.log();
  console.log(
    bright(
      `${dryRun ? "[dry-run] " : ""}Moved ${files.length} file(s), rewrote ${rewrittenCount} consumer file(s), tagged ${taggedCount} module(s).`,
    ),
  );

  if (!dryRun) {
    const staleAfter = await scanForStaleReferences(new Set());
    if (staleAfter.length > 0) {
      console.log();
      console.log(
        bright(
          red(
            `Post-migration scan found ${staleAfter.length} unexpected stale reference(s):`,
          ),
        ),
      );
      for (const s of staleAfter) {
        console.log(dim(`  ${s}`));
      }
      process.exitCode = 1;
    }
  }
}

async function runCheck() {
  const files = await readManifest();
  const problems = [];
  const manifestByOldPath = new Map(
    files.map((f) => [f.oldSourcePath, f.symbolName]),
  );
  const manifestSymbolNames = new Set(files.map((f) => f.symbolName));

  if (existsSync(oldSourceDir)) {
    problems.push(
      `Old source directory still exists: ${relative(repoRoot, oldSourceDir)}`,
    );
  }

  for (const file of files) {
    if (!existsSync(file.newSourcePath)) {
      problems.push(
        `Missing migrated file: ${relative(repoRoot, file.newSourcePath)}`,
      );
    }
  }

  for (const placeholder of placeholders) {
    if (existsSync(placeholder)) {
      problems.push(
        `Placeholder still present: ${relative(repoRoot, placeholder)}`,
      );
    }
  }

  if (existsSync(gltfSmokeTestPath)) {
    const smokeTestSource = await readFile(gltfSmokeTestPath, "utf-8");
    if (smokeTestSource.includes(gltfSmokeTestImportFix[0])) {
      problems.push(
        `${relative(repoRoot, gltfSmokeTestPath)} still imports the removed Placeholder symbol`,
      );
    }
  }

  const scanFiles = (await globby(scanGlobs, { cwd: repoRoot, absolute: true }))
    .filter((filePath) => !manifestByOldPath.has(filePath))
    .sort();

  for (const filePath of scanFiles) {
    const result = await rewriteFileConsumerImports(
      filePath,
      manifestByOldPath,
      manifestSymbolNames,
    );
    if (result.changed) {
      problems.push(
        `${relative(repoRoot, filePath)} still has an unrewritten import of ${result.movedSymbols.join(", ")}`,
      );
    }
  }

  const crossPackageSymbols = await findSymbolsImportedFromGltf(scanFiles);
  for (const file of files) {
    if (!existsSync(file.newSourcePath)) {
      continue;
    }
    const expectedTag = crossPackageSymbols.has(file.symbolName)
      ? "internal"
      : "private";
    const source = await readFile(file.newSourcePath, "utf-8");
    const actualTag = getVisibilityTag(source, file.symbolName);
    if (actualTag !== expectedTag) {
      problems.push(
        `${relative(repoRoot, file.newSourcePath)}'s top-level declaration is tagged "${actualTag ?? "none found"}", expected "@${expectedTag}"`,
      );
    }
  }

  const staleHits = await scanForStaleReferences(new Set());
  problems.push(...staleHits);

  if (problems.length > 0) {
    console.log(
      bright(red(`--check failed with ${problems.length} problem(s):`)),
    );
    for (const problem of problems) {
      console.log(dim(`  ${problem}`));
    }
    process.exitCode = 1;
    return;
  }

  console.log(green("--check passed: migration invariants hold."));
}

if (isCheck) {
  await runCheck();
} else {
  await runMigration();
}
