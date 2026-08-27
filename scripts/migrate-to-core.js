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
 *   3a. Post-process specific copied files:
 *       - Matrix4.js: replace broken cross-package Camera type reference with local typedef
 *       - Color.js: fix normalise relative path for globalTypes
 *       - globalTypes.js: strip engine-specific typedefs, keeping only TypedArray types
 *   4. Write re-export shims at the original packages/engine/Source/Core/ locations
 *       (globalTypes.js is NOT shimmed — engine keeps its own Destroyable/GeoJSON types)
 *   4a. Write engine-specific globalTypes.js (Destroyable + GeoJSON, no TypedArray)
 *   5. Update packages/core/index.js to import from ./Source/ instead of @cesium/engine
 *   6. Remove @cesium/engine from packages/core/package.json dependencies
 *   7. Add @cesium/core to packages/engine/package.json dependencies
 *   8. Move spec files from packages/engine/Specs/Core/ to packages/core/Specs/
 *   9. Update TypedArray type-import paths in engine files to use @cesium/core
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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** @param {string} dir @returns {string[]} */
function listFilesRecursively(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory()
      ? listFilesRecursively(full)
      : /** @type {string[]} */ ([full]);
  });
}

/**
 * Removes JSDoc typedef comment blocks whose typedef name matches any of the given names.
 * @param {string} content
 * @param {string[]} names
 * @returns {string}
 */
function removeTypedefBlocks(content, names) {
  let result = content;
  for (const name of names) {
    result = result.replace(
      new RegExp(
        `\\/\\*\\*[\\s\\S]*?@typedef[\\s\\S]*?\\b${name}\\b[\\s\\S]*?\\*\\/\\n?`,
        "g",
      ),
      "",
    );
  }
  return result.replace(/\n{3,}/g, "\n\n").trimStart();
}

const paths = {
  coreIndex: join(repoRoot, "packages/core/index.js"),
  corePkg: join(repoRoot, "packages/core/package.json"),
  coreSource: join(repoRoot, "packages/core/Source"),
  coreSpecs: join(repoRoot, "packages/core/Specs"),
  engineCore: join(repoRoot, "packages/engine/Source/Core"),
  engineSpecs: join(repoRoot, "packages/engine/Specs/Core"),
  enginePkg: join(repoRoot, "packages/engine/package.json"),
};

// ── Step 1: Build the move set from packages/core/index.js ───────────────────

const indexContent = readFileSync(paths.coreIndex, "utf8");

// Match: from "@cesium/engine/Source/Core/X.js"
const engineExportRegex = /from\s+"@cesium\/engine\/Source\/Core\/([^"]+)"/g;
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
  "globalTypes.js",
  "MapProjection.js",
  "Occluder.js",
  "PolygonGeometryLibrary.js",
  "PolylineVolumeGeometryLibrary.js",
  "RectangleGeometryLibrary.js",
  "Visibility.js",
  "WallGeometryLibrary.js",
]);

const allFilesToMove = new Set([...filesToMove, ...privateFilesToMove]);

// ── Step 2: Validate import closure ──────────────────────────────────────────

console.log("Validating import closure...");

/** @type {string[]} */
const violations = [];
/** @type {string[]} */
const missingFiles = [];

// Match real import statements (not JSDoc @import comments)
const localImportRegex = /^import\s+.*?\s+from\s+['"](\.\/[^'"]+)['"]/gm;

for (const filename of allFilesToMove) {
  const srcPath = join(paths.engineCore, filename);

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
  copyFileSync(
    join(paths.engineCore, filename),
    join(paths.coreSource, filename),
  );
}
console.log(`✓ Copied ${allFilesToMove.size} files.\n`);

// ── Step 3a: Post-process specific copied files ───────────────────────────────

console.log("Applying post-copy fixes...");

// Fix Matrix4.js: @import Camera cross-references engine's Scene directory, which
// doesn't exist relative to core/Source/. Replace with a local structural typedef.
const matrix4Path = join(paths.coreSource, "Matrix4.js");
writeFileSync(
  matrix4Path,
  readFileSync(matrix4Path, "utf8").replace(
    `/** @import Camera from "../Scene/Camera.js"; */`,
    `// Camera is engine-specific; only the shape needed by fromCamera is declared here.\n` +
      `/** @typedef {{ position: import("./Cartesian3.js").default, direction: import("./Cartesian3.js").default, up: import("./Cartesian3.js").default }} Camera */`,
  ),
);

// Fix Color.js: '../Core/globalTypes.js' resolves to the same file when inside
// engine/Source/Core, but is a broken path from core/Source/.
const colorPath = join(paths.coreSource, "Color.js");
writeFileSync(
  colorPath,
  readFileSync(colorPath, "utf8").replace(
    `"../Core/globalTypes.js"`,
    `"./globalTypes.js"`,
  ),
);

// Split globalTypes.js: core keeps only TypedArray types; engine keeps the rest.
// Read the full original (just copied) before stripping.
const globalTypesOriginal = readFileSync(
  join(paths.coreSource, "globalTypes.js"),
  "utf8",
);
writeFileSync(
  join(paths.coreSource, "globalTypes.js"),
  removeTypedefBlocks(globalTypesOriginal, [
    "Destroyable",
    "GeoJsonPosition",
    "GeoJsonGeometry",
    "GeoJsonFeature",
    "GeoJsonFeatureCollection",
    "GeoJson",
  ]),
);

console.log("✓ Post-copy fixes applied.\n");

// ── Step 4: Write re-export shims at original engine Core locations ───────────

console.log("Writing re-export shims in packages/engine/Source/Core/...");
for (const filename of allFilesToMove) {
  if (filename === "globalTypes.js") {
    continue; // handled separately in step 4a
  }
  const shim =
    `// Forwarding shim — this file has moved to @cesium/core\n` +
    `export { default } from "@cesium/core/Source/${filename}";\n` +
    `export * from "@cesium/core/Source/${filename}";\n`;
  writeFileSync(join(paths.engineCore, filename), shim);
}
console.log(`✓ Wrote ${allFilesToMove.size - 1} shims.\n`);

// ── Step 4a: Write engine-specific globalTypes.js (Destroyable + GeoJSON) ─────

// Engine keeps its own real globalTypes.js with engine-specific types only.
// TypedArray/TypedArrayConstructor live in core; engine files import them from there.
writeFileSync(
  join(paths.engineCore, "globalTypes.js"),
  removeTypedefBlocks(globalTypesOriginal, [
    "TypedArray",
    "TypedArrayConstructor",
  ]),
);
console.log("✓ Wrote engine-specific globalTypes.js.\n");

// ── Step 5: Flip packages/core/index.js ──────────────────────────────────────

console.log("Updating packages/core/index.js...");
const updatedIndex = indexContent.replace(
  /@cesium\/engine\/Source\/Core\//g,
  "./Source/",
);
writeFileSync(paths.coreIndex, updatedIndex);
console.log("✓ Updated packages/core/index.js.\n");

// ── Step 6: Remove @cesium/engine from packages/core/package.json ────────────

console.log("Updating packages/core/package.json...");
const corePkg = JSON.parse(readFileSync(paths.corePkg, "utf8"));
delete corePkg.dependencies?.["@cesium/engine"];
if (corePkg.dependencies && Object.keys(corePkg.dependencies).length === 0) {
  delete corePkg.dependencies;
}
writeFileSync(paths.corePkg, `${JSON.stringify(corePkg, null, 2)}\n`);
console.log("✓ Removed @cesium/engine from packages/core/package.json.\n");

// ── Step 7: Add @cesium/core to packages/engine/package.json ─────────────────

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

// ── Step 8: Move spec files to packages/core/Specs/Core/ ─────────────────────

console.log("Moving spec files to packages/core/Specs/...");
if (!existsSync(paths.coreSpecs)) {
  mkdirSync(paths.coreSpecs, { recursive: true });
}

let specsMoved = 0;
for (const filename of filesToMove) {
  const specFilename = filename.replace(/\.js$/, "Spec.js");
  const srcSpec = join(paths.engineSpecs, specFilename);
  if (existsSync(srcSpec)) {
    copyFileSync(srcSpec, join(paths.coreSpecs, specFilename));
    rmSync(srcSpec);
    specsMoved++;
  }
}
console.log(
  `✓ Moved ${specsMoved} spec files (${filesToMove.size - specsMoved} had no spec).\n`,
);

// ── Step 9: Update TypedArray @import paths in engine Source files ─────────────
// Engine's globalTypes.js no longer defines TypedArray; engine files must import
// those types from @cesium/core directly.

console.log("Updating TypedArray @import paths in engine files...");

const typedArrayTypeNames = new Set(["TypedArray", "TypedArrayConstructor"]);
const engineSourceFiles = listFilesRecursively(
  join(repoRoot, "packages/engine/Source"),
).filter((/** @type {string} */ f) => f.endsWith(".js"));

let importFixCount = 0;
for (const filePath of engineSourceFiles) {
  const content = readFileSync(filePath, "utf8");
  if (!content.includes("globalTypes.js") || !content.includes("TypedArray")) {
    continue;
  }

  const updated = content.replace(
    /\/\*\* @import (\{[^}]+\}) from "([^"]*Core\/globalTypes\.js)"; \*\//g,
    (match, braces, fromPath) => {
      const names = braces
        .slice(1, -1)
        .split(",")
        .map((/** @type {string} */ s) => s.trim())
        .filter(Boolean);
      const coreNames = names.filter((/** @type {string} */ n) =>
        typedArrayTypeNames.has(n),
      );
      if (coreNames.length === 0) {
        return match;
      }
      const engineNames = names.filter(
        (/** @type {string} */ n) => !typedArrayTypeNames.has(n),
      );
      const lines = [
        `/** @import { ${coreNames.join(", ")} } from "@cesium/core/Source/globalTypes.js"; */`,
      ];
      if (engineNames.length > 0) {
        lines.push(
          `/** @import { ${engineNames.join(", ")} } from "${fromPath}"; */`,
        );
      }
      return lines.join("\n");
    },
  );

  if (updated !== content) {
    writeFileSync(filePath, updated);
    importFixCount++;
  }
}
console.log(
  `✓ Updated TypedArray @import paths in ${importFixCount} engine file(s).\n`,
);

// ── Done ──────────────────────────────────────────────────────────────────────

console.log("Migration complete. Next steps:");
console.log(
  "  1. npm install                    (re-link workspaces after package.json changes)",
);
console.log(
  "  2. npm run build                  (builds core → engine → widgets in order)",
);
console.log("  3. npm test                       (verify nothing broke)");
console.log(
  "  4. git add -A && git commit       (commit migration output separately from tooling changes)",
);
