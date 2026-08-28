// @ts-check
/**
 * Fixes type-only issues introduced by running migrate-to-core.js.
 * Run this after committing the raw migration output.
 *
 * Run from the repo root:
 *   node scripts/fix-core-types.js
 *
 * Changes applied:
 *   1. Split globalTypes.js — core keeps TypedArray/TypedArrayConstructor only;
 *      engine keeps Destroyable/GeoJSON types in its own real (non-shim) file.
 *   2. Fix Matrix4.js — replace cross-package Camera type reference with a
 *      local structural typedef (Camera is engine-specific).
 *   3. Fix Color.js — normalise the '../Core/globalTypes.js' path to './globalTypes.js',
 *      which was valid in engine/Source/Core but is broken in core/Source/.
 *   4. Update TypedArray/TypedArrayConstructor type-import paths in engine files
 *      to use '@cesium/core/Source/globalTypes.js' directly, since engine's
 *      globalTypes.js no longer defines those types.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const paths = {
  coreSource: join(repoRoot, "packages/core/Source"),
  engineCore: join(repoRoot, "packages/engine/Source/Core"),
  engineSource: join(repoRoot, "packages/engine/Source"),
};

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
 * Uses (?:[^*]|\*(?!\/))* to stay within a single comment block boundary.
 * @param {string} content
 * @param {string[]} names
 * @returns {string}
 */
function removeTypedefBlocks(content, names) {
  let result = content;
  for (const name of names) {
    result = result.replace(
      new RegExp(
        `\\/\\*\\*(?:[^*]|\\*(?!\\/))*@typedef(?:[^*]|\\*(?!\\/))*\\b${name}\\b(?:[^*]|\\*(?!\\/))*\\*\\/\\n?`,
        "g",
      ),
      "",
    );
  }
  return result.replace(/\n{3,}/g, "\n\n").trimStart();
}

// ── Step 1: Split globalTypes.js ─────────────────────────────────────────────

console.log("Splitting globalTypes.js...");

const globalTypesOriginal = readFileSync(
  join(paths.coreSource, "globalTypes.js"),
  "utf8",
);

// core/Source/globalTypes.js: TypedArray and TypedArrayConstructor only
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

// engine/Source/Core/globalTypes.js: engine-specific types (not a shim)
writeFileSync(
  join(paths.engineCore, "globalTypes.js"),
  removeTypedefBlocks(globalTypesOriginal, [
    "TypedArray",
    "TypedArrayConstructor",
  ]),
);

console.log("✓ Split globalTypes.js.\n");

// ── Step 2: Fix Matrix4.js ────────────────────────────────────────────────────

console.log("Fixing Matrix4.js Camera type reference...");

const matrix4Path = join(paths.coreSource, "Matrix4.js");
writeFileSync(
  matrix4Path,
  readFileSync(matrix4Path, "utf8").replace(
    `/** @import Camera from "./Camera.js"; */`,
    `/**\n * @typedef {object} Camera\n * @property {Cartesian3} position\n * @property {Cartesian3} direction\n * @property {Cartesian3} up\n */`,
  ),
);

console.log("✓ Fixed Matrix4.js.\n");

// ── Step 3: Fix Color.js ──────────────────────────────────────────────────────

console.log("Fixing Color.js globalTypes path...");

const colorPath = join(paths.coreSource, "Color.js");
writeFileSync(
  colorPath,
  readFileSync(colorPath, "utf8").replace(
    `"../Core/globalTypes.js"`,
    `"./globalTypes.js"`,
  ),
);

console.log("✓ Fixed Color.js.\n");

// ── Step 4: Update TypedArray @import paths in engine files ───────────────────

console.log("Updating TypedArray type-import paths in engine files...");

const typedArrayTypeNames = new Set(["TypedArray", "TypedArrayConstructor"]);
const engineSourceFiles = listFilesRecursively(paths.engineSource).filter(
  (/** @type {string} */ f) => f.endsWith(".js"),
);

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
  `✓ Updated TypedArray paths in ${importFixCount} engine file(s).\n`,
);

// ── Done ──────────────────────────────────────────────────────────────────────

console.log("Type fixes complete.");
console.log("  git add -A && git commit");
