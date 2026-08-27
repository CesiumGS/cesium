// @ts-check
/**
 * Migrates the browser/network-free subset of packages/engine/Source/Core/ into
 * packages/core/Source/.
 *
 * Run from the repo root:
 *   node scripts/migrate-to-core.js
 *   node scripts/migrate-to-core.js --dry-run   (validate only, no file changes)
 *
 * Steps performed:
 *   1. Parse packages/core/index.js to determine the set of files to move
 *   2. Validate that all ./relative imports within moved files are also in
 *      the move set (exits with a report if violations are found)
 *   3. Copy files to packages/core/Source/
 *   4. Write re-export shims at the original packages/engine/Source/ locations
 *   5. Remove @cesium/engine from packages/core/package.json dependencies
 *   6. Add @cesium/core to packages/engine/package.json dependencies
 *   7. Move spec files from packages/engine/Specs/Core/ to packages/core/Specs/
 *
 * After committing the output of this script (with --no-verify to skip tsc),
 * run scripts/fix-core-types.js to resolve type-only issues introduced by the move.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

if (dryRun) {
  console.log("DRY RUN — no files will be changed.\n");
}

/**
 * Returns true if the file's top-level exported symbol is marked @private,
 * so the shim can carry the tag and keep it out of engine's TypeScript declarations.
 * @param {string} content
 * @returns {boolean}
 */
function isTopLevelPrivate(content) {
  // Find the last JSDoc block before the main (non-import) declaration
  const mainDecl = content.match(/^(?:const|class|function)\s+\w+/m);
  if (!mainDecl || mainDecl.index === undefined) {
    return false;
  }
  const beforeDecl = content.slice(0, mainDecl.index);
  const jsdocBlocks = [...beforeDecl.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
  if (jsdocBlocks.length === 0) {
    return false;
  }
  const lastBlock = jsdocBlocks[jsdocBlocks.length - 1];
  return lastBlock[1].includes("@private");
}

/**
 * Removes the @private tag from the top-level exported symbol's JSDoc block only.
 * Internal helper methods' @private tags are left intact.
 * @param {string} content
 * @returns {string}
 */
function removeTopLevelPrivate(content) {
  const mainDecl = content.match(/^(?:const|class|function)\s+\w+/m);
  if (!mainDecl || mainDecl.index === undefined) {
    return content;
  }
  const before = content.slice(0, mainDecl.index);
  const after = content.slice(mainDecl.index);
  return before.replace(/\n[ \t]*\*[ \t]+@private\b[^\n]*/g, "") + after;
}

const paths = {
  corePublicApi: join(repoRoot, "scripts/migrate-to-core-index.js"),
  corePkg: join(repoRoot, "packages/core/package.json"),
  coreSource: join(repoRoot, "packages/core/Source"),
  coreSpecs: join(repoRoot, "packages/core/Specs"),
  engineCore: join(repoRoot, "packages/engine/Source/Core"),
  engineSpecs: join(repoRoot, "packages/engine/Specs/Core"),
  enginePkg: join(repoRoot, "packages/engine/package.json"),
};

// ── Step 1: Build the move set from packages/core/index.js ───────────────────

const indexContent = readFileSync(paths.corePublicApi, "utf8");

// Match: from "@cesium/engine/Source/{Core,Scene,Renderer}/X.js"
const engineExportRegex =
  /from\s+"@cesium\/engine\/Source\/(?:Core|Scene|Renderer)\/([^"]+)"/g;
const filesToMove = /** @type {Set<string>} */ (new Set());
let m;
while ((m = engineExportRegex.exec(indexContent)) !== null) {
  filesToMove.add(m[1]); // e.g. "defined.js"
}

console.log(`Move set: ${filesToMove.size} files.\n`);

// Files that must move for the closure but are not part of the public @cesium/core API.
// They are moved and shimmed exactly like public files but are NOT added to index.js.
const privateFilesToMove = new Set([
  "CoplanarPolygonGeometryLibrary.js",
  "CorridorGeometryLibrary.js",
  "CylinderGeometryLibrary.js",
  "EllipseGeometryLibrary.js",
  "GeometryType.js",
  "globalTypes.js",
  "MapProjection.js",
  "Occluder.js",
  "PolygonGeometryLibrary.js",
  "PolylineVolumeGeometryLibrary.js",
  "RectangleGeometryLibrary.js",
  "Tipsify.js",
  "Visibility.js",
  "WallGeometryLibrary.js",
  "wrapFunction.js",
]);

const allFilesToMove = new Set([...filesToMove, ...privateFilesToMove]);

// Private deps that live outside engine/Source/Core/ but are needed by moved files.
// key = filename, value = source directory relative to packages/engine/Source/
/** @type {Map<string, string>} */
const crossDirDeps = new Map([
  ["AttributeType.js", "Scene"],
  ["PixelDatatype.js", "Renderer"],
]);

// ── Step 2: Validate import closure ──────────────────────────────────────────

console.log("Validating import closure...");

/** @type {string[]} */
const violations = [];
/** @type {string[]} */
const missingFiles = [];

// Match real import statements (not JSDoc @import comments)
const localImportRegex = /^import\s+.*?\s+from\s+['"](\.\/[^'"]+)['"]/gm;

for (const filename of allFilesToMove) {
  const srcDir = crossDirDeps.has(filename)
    ? join(
        repoRoot,
        "packages/engine/Source",
        /** @type {string} */ (crossDirDeps.get(filename)),
      )
    : paths.engineCore;
  const srcPath = join(srcDir, filename);

  if (!existsSync(srcPath)) {
    missingFiles.push(filename);
    continue;
  }

  const content = readFileSync(srcPath, "utf8");
  localImportRegex.lastIndex = 0;
  let imp;
  while ((imp = localImportRegex.exec(content)) !== null) {
    const imported = imp[1].replace("./", ""); // e.g. "Cartesian3.js"
    if (!allFilesToMove.has(imported)) {
      violations.push(`  ${filename}  →  ./${imported}  (not in move set)`);
    }
  }
}

if (missingFiles.length > 0) {
  console.error("ERROR — source files not found:");
  missingFiles.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

if (violations.length > 0) {
  console.warn(
    `⚠️  ${violations.length} closure violation(s) — moved files import non-moved dependencies:\n`,
  );
  violations.forEach((v) => console.warn(v));
  console.warn(
    "\nEach violation means the moved file would have a broken import.",
  );
  console.warn(
    "Either add the dependency to the move set in packages/core/index.js,",
  );
  console.warn("or remove the violating file from the move set.\n");
  process.exit(1);
}

console.log("✓ Import closure is valid.\n");

if (dryRun) {
  console.log("Dry run complete — no changes made.");
  process.exit(0);
}

// ── Step 3: Copy files to packages/core/Source/ ──────────────────────────────

if (!existsSync(paths.coreSource)) {
  mkdirSync(paths.coreSource, { recursive: true });
}

console.log("Copying files to packages/core/Source/...");
for (const filename of allFilesToMove) {
  const srcDir = crossDirDeps.has(filename)
    ? join(
        repoRoot,
        "packages/engine/Source",
        /** @type {string} */ (crossDirDeps.get(filename)),
      )
    : paths.engineCore;
  copyFileSync(join(srcDir, filename), join(paths.coreSource, filename));
}
console.log(`✓ Copied ${allFilesToMove.size} files.\n`);

// Capture which files were originally @private BEFORE step 3b modifies them.
// Shims use this — a file promoted to public in core still stays private in engine.
/** @type {Set<string>} */
const originallyPrivate = new Set(
  [...allFilesToMove].filter((filename) =>
    isTopLevelPrivate(readFileSync(join(paths.coreSource, filename), "utf8")),
  ),
);

// ── Step 3b: Normalise relative paths in copied core/Source files ────────────────
// Paths like '../Core/', '../Scene/', '../Renderer/' are now all flat siblings.

console.log("Normalising paths and promoting @private in core/Source files...");
const coreSourceEntries = readdirSync(paths.coreSource, { withFileTypes: true })
  .filter((e) => !e.isDirectory() && e.name.endsWith(".js"))
  .map((e) => join(paths.coreSource, e.name));
for (const filePath of coreSourceEntries) {
  let content = readFileSync(filePath, "utf8");
  // Normalise relative cross-directory imports
  content = content.replace(/from "\.\.\/(Core|Scene|Renderer)\//g, `from "./`);
  // Public API files: strip @private from the top-level symbol
  const filename = filePath.split("/").pop() ?? "";
  if (filesToMove.has(filename) && isTopLevelPrivate(content)) {
    content = removeTopLevelPrivate(content);
  }
  writeFileSync(filePath, content);
}
console.log("✓ Normalised paths and updated @private tags.\n");

console.log("Writing re-export shims in packages/engine/Source/...");
for (const filename of allFilesToMove) {
  const shimDir = crossDirDeps.has(filename)
    ? join(
        repoRoot,
        "packages/engine/Source",
        /** @type {string} */ (crossDirDeps.get(filename)),
      )
    : paths.engineCore;
  // Use pre-step-3b snapshot: files promoted to public in core remain private in engine.
  const privateTag = originallyPrivate.has(filename) ? "/** @private */\n" : "";
  const shim =
    `${privateTag}// Forwarding shim \u2014 this file has moved to @cesium/core\n` +
    `export { default } from "@cesium/core/Source/${filename}";\n` +
    `export * from "@cesium/core/Source/${filename}";\n`;
  writeFileSync(join(shimDir, filename), shim);
}
console.log(`✓ Wrote ${allFilesToMove.size} shims.\n`);

// ── Step 5: Remove @cesium/engine from packages/core/package.json ────────────

console.log("Updating packages/core/package.json...");
const corePkg = JSON.parse(readFileSync(paths.corePkg, "utf8"));
delete corePkg.dependencies?.["@cesium/engine"];
if (corePkg.dependencies && Object.keys(corePkg.dependencies).length === 0) {
  delete corePkg.dependencies;
}
writeFileSync(paths.corePkg, `${JSON.stringify(corePkg, null, 2)}\n`);
console.log("✓ Removed @cesium/engine from packages/core/package.json.\n");

// ── Step 6: Add @cesium/core to packages/engine/package.json ─────────────────

console.log("Updating packages/engine/package.json...");
const enginePkg = JSON.parse(readFileSync(paths.enginePkg, "utf8"));
enginePkg.dependencies ??= {};
enginePkg.dependencies["@cesium/core"] = `^${corePkg.version}`;
// Keep dependencies sorted
enginePkg.dependencies = Object.fromEntries(
  Object.entries(enginePkg.dependencies).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(paths.enginePkg, `${JSON.stringify(enginePkg, null, 2)}\n`);
console.log("✓ Added @cesium/core to packages/engine/package.json.\n");

// ── Step 7: Move spec files to packages/core/Specs/ ─────────────────────────

console.log("Moving spec files to packages/core/Specs/...");
if (!existsSync(paths.coreSpecs)) {
  mkdirSync(paths.coreSpecs, { recursive: true });
}

let specsMoved = 0;
for (const filename of filesToMove) {
  const specFilename = filename.replace(/\.js$/, "Spec.js");
  const srcSpec = join(paths.engineSpecs, specFilename);
  if (existsSync(srcSpec)) {
    const dest = join(paths.coreSpecs, specFilename);
    // Fix relative paths that were correct in packages/engine/Specs/Core/ but break here:
    // ../../index.js (engine barrel, 2 up from Core/) → ../index.js (core barrel, 1 up from Specs/)
    // ../../../../Specs/ (repo root, 4 up from Core/) → ../../../Specs/ (repo root, 3 up from Specs/)
    const content = readFileSync(srcSpec, "utf8")
      .replace(/\.\.\/\.\.\/index\.js/g, "../index.js")
      .replace(/\.\.\/\.\.\/\.\.\/\.\.\/Specs\//g, "../../../Specs/");
    writeFileSync(dest, content);
    rmSync(srcSpec);
    specsMoved++;
  }
}
console.log(
  `✓ Moved ${specsMoved} spec files (${filesToMove.size - specsMoved} had no spec).\n`,
);

// ── Done ──────────────────────────────────────────────────────────────────────

console.log("Migration complete. Next steps:");
console.log(
  "  1. git add -A && git commit --no-verify     (skip tsc hook — type fixes come separately)",
);
console.log(
  "  2. node scripts/fix-core-types.js          (split globalTypes, fix cross-package @import paths)",
);
console.log(
  "  3. git add -A && git commit                 (type fix commit — hook will pass)",
);
console.log(
  "  4. npm install && npm run build             (re-link workspaces, then build)",
);
