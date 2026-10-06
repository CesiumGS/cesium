// @ts-check

/**
 * Phase 3c/3d migration script (other-fixes step): applies mechanical fixes to
 * gulpfile.js, packages/core/scripts/build.js, and GeoJsonPrimitive.js that only
 * become correct once moveCoreFiles.js and rewriteCoreImports.js have actually run.
 * See the comment above each fix below for what it does and why.
 *
 * Usage: node scripts/applyCoreOtherFixes.js [--dry-run]
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  repoRoot,
  formatWithPrettier,
  dryRun,
  bright,
  green,
  red,
} from "./coreMigrationShared.js";

const gulpfilePath = join(repoRoot, "gulpfile.js");
const original = await readFile(gulpfilePath, "utf-8");
let source = original;
const applied = [];

/**
 * Reorder `buildCore` to run *before* `buildEngine` in `build()`'s default path,
 * `buildRelease`, and `websiteRelease` - core's own spec bundling used to depend on
 * "@cesium/engine" (via shared root Specs/ helpers), which is why it ran after; once
 * the rewrite lands, that dependency direction flips (and `websiteRelease`, which
 * bundles engine/widgets straight from source, never called buildCore at all).
 */
const buildDefaultPathFix = [
  "  await buildEngine(buildOptions);\n  await buildCore(buildOptions);\n  await buildWidgets(buildOptions);\n  await buildCesium(buildOptions);",
  "  await buildCore(buildOptions);\n  await buildEngine(buildOptions);\n  await buildWidgets(buildOptions);\n  await buildCesium(buildOptions);",
];

const buildReleaseFix = [
  "export const buildRelease = gulp.series(\n  buildEngine,\n  buildCore,\n  buildWidgets,",
  "export const buildRelease = gulp.series(\n  buildCore,\n  buildEngine,\n  buildWidgets,",
];

const websiteReleaseFix = [
  "export const websiteRelease = gulp.series(\n  buildEngine,\n  buildCore,\n  buildWidgets,",
  "export const websiteRelease = gulp.series(\n  buildCore,\n  buildEngine,\n  buildWidgets,",
];

/**
 * Repoint `fixTypescriptDefinitionsSource`'s two hardcoded `readFileSync` calls
 * from packages/engine/Source/Core/{defined,Check}.d.ts to their new
 * packages/core/Source location.
 */
const definedSpliceFix = [
  './packages/engine/Source/Core/defined.d.ts"',
  './packages/core/Source/defined.d.ts"',
];

const checkSpliceFix = [
  './packages/engine/Source/Core/Check.d.ts"',
  './packages/core/Source/Check.d.ts"',
];

/**
 * Repoint `buildTs`'s WebGLConstants-reordering and Math-module-naming workarounds
 * from the "engine" workspace to "core" - WebGLConstants.js and Math.js (and every
 * enum that aliases to WebGLConstants, e.g. ComponentDatatype) now live in core, so
 * engine's own generated declarations no longer contain them.
 */
const processSourceFuncFix = [
  '      // The engine package needs additional processing for its enum strings\n      directory === "engine" ? processEngineSource : undefined,',
  '      // The core package needs additional processing for its enum strings\n      // (WebGLConstants and its aliasing enums, e.g. ComponentDatatype, live there now).\n      // The engine package still needs its own Viewer circular-dependency workaround.\n      directory === "core"\n        ? processTypescriptSource\n        : directory === "engine"\n          ? processEngineSource\n          : undefined,',
];

const processModulesFuncFix = [
  '      // Handle engine\'s module naming exceptions\n      directory === "engine" ? processMathModule : undefined,',
  "      // Handle core's module naming exceptions (Math.js's barrel export)\n      directory === \"core\" ? processMathModule : undefined,",
];

for (const [label, [from, to]] of /** @type {[string, [string, string]][]} */ ([
  ["reorder build()'s default path", buildDefaultPathFix],
  ["reorder buildRelease", buildReleaseFix],
  ["add buildCore to websiteRelease", websiteReleaseFix],
  ["repoint defined.d.ts splice", definedSpliceFix],
  ["repoint Check.d.ts splice", checkSpliceFix],
  ["rewire buildTs's processSourceFunc to core", processSourceFuncFix],
  ["rewire buildTs's processModulesFunc to core", processModulesFuncFix],
])) {
  if (!source.includes(from)) {
    console.log(red(`✗ ${label}: expected text not found, skipping`));
    continue;
  }
  source = source.replace(from, to);
  applied.push(label);
  console.log(`${green("✓")} ${label}`);
}

if (applied.length > 0) {
  const formatted = await formatWithPrettier(gulpfilePath, source);
  if (!dryRun) {
    await writeFile(gulpfilePath, formatted);
  }
  console.log(
    bright(
      `${dryRun ? "[dry-run] " : ""}Applied ${applied.length} fix(es) to gulpfile.js.`,
    ),
  );
} else {
  console.log(bright("No fixes applied to gulpfile.js."));
}
console.log();

/**
 * Exclude typedArrayTypes.js (type-only, no runtime exports) from
 * packages/core/scripts/build.js's `sourceGlobs`, matching how it was excluded from
 * packages/engine/scripts/build.js before the move.
 */
const coreBuildJsPath = join(repoRoot, "packages/core/scripts/build.js");
const coreBuildJsOriginal = await readFile(coreBuildJsPath, "utf-8");

const coreSourceGlobsFix = [
  'export const sourceGlobs = ["packages/core/Source/*.js"];',
  'export const sourceGlobs = [\n  "packages/core/Source/*.js",\n  "!packages/core/Source/typedArrayTypes.js",\n];',
];

if (coreBuildJsOriginal.includes(coreSourceGlobsFix[0])) {
  const coreBuildJsSource = coreBuildJsOriginal.replace(
    coreSourceGlobsFix[0],
    coreSourceGlobsFix[1],
  );
  console.log(
    `${green("✓")} exclude typedArrayTypes.js from core's sourceGlobs`,
  );

  const coreBuildJsFormatted = await formatWithPrettier(
    coreBuildJsPath,
    coreBuildJsSource,
  );
  if (!dryRun) {
    await writeFile(coreBuildJsPath, coreBuildJsFormatted);
  }
  console.log(
    bright(
      `${dryRun ? "[dry-run] " : ""}Applied 1 fix to packages/core/scripts/build.js.`,
    ),
  );
} else {
  console.log(
    red(
      "✗ exclude typedArrayTypes.js from core's sourceGlobs: expected text not found, skipping",
    ),
  );
}

/**
 * Remove the `@ts-expect-error` above GeoJsonPrimitive.js's `isPlainObject(...)`
 * ternary - once Frozen.js (and its `EMPTY_OBJECT` constant) live in packages/core,
 * the cross-package .d.ts resolves the ternary's type correctly, so the pragma that
 * was needed for the pre-move, same-package type resolution becomes a real
 * "Unused '@ts-expect-error' directive" error.
 */
const geoJsonPrimitivePath = join(
  repoRoot,
  "packages/engine/Source/Scene/GeoJsonPrimitive.js",
);
const geoJsonPrimitiveOriginal = await readFile(geoJsonPrimitivePath, "utf-8");

const geoJsonPrimitiveTsExpectErrorFix = [
  "      // @ts-expect-error Casting changes .d.ts output, a suspected bug in tsd-jsdoc.\n      isPlainObject(featureInput.properties)",
  "      isPlainObject(featureInput.properties)",
];

if (geoJsonPrimitiveOriginal.includes(geoJsonPrimitiveTsExpectErrorFix[0])) {
  const geoJsonPrimitiveSource = geoJsonPrimitiveOriginal.replace(
    geoJsonPrimitiveTsExpectErrorFix[0],
    geoJsonPrimitiveTsExpectErrorFix[1],
  );
  console.log(
    `${green("✓")} remove stale @ts-expect-error in GeoJsonPrimitive.js`,
  );

  const geoJsonPrimitiveFormatted = await formatWithPrettier(
    geoJsonPrimitivePath,
    geoJsonPrimitiveSource,
  );
  if (!dryRun) {
    await writeFile(geoJsonPrimitivePath, geoJsonPrimitiveFormatted);
  }
  console.log(
    bright(
      `${dryRun ? "[dry-run] " : ""}Applied 1 fix to packages/engine/Source/Scene/GeoJsonPrimitive.js.`,
    ),
  );
} else {
  console.log(
    red(
      "✗ remove stale @ts-expect-error in GeoJsonPrimitive.js: expected text not found, skipping",
    ),
  );
}

/**
 * Add @cesium/core to Sandcastle's import maps now that examples and package
 * bundles can load engine files that import the new core package directly.
 */
const sandcastleBuildPath = join(repoRoot, "scripts/buildSandcastle.js");
let sandcastleBuildSource = await readFile(sandcastleBuildPath, "utf-8");

const sandcastleBuildFixes = [
  [
    "add @cesium/core to deployed Sandcastle imports",
    '        cesium: {\n          path: "/js/Cesium.js",\n          typesPath: "/js/Cesium.d.ts",\n        },\n        "@cesium/engine": {',
    '        cesium: {\n          path: "/js/Cesium.js",\n          typesPath: "/js/Cesium.d.ts",\n        },\n        "@cesium/core": {\n          path: "/js/core/index.js",\n          typesPath: "/js/core/index.d.ts",\n        },\n        "@cesium/engine": {',
  ],
  [
    "copy @cesium/core files for deployed Sandcastle",
    '        {\n          src: join(__dirname, "../Source/Cesium.(d.ts|js)"),\n          dest: "js",\n          rename: { stripBase: true },\n        },\n        {\n          src: join(__dirname, "../packages/engine/index.d.ts"),',
    '        {\n          src: join(__dirname, "../Source/Cesium.(d.ts|js)"),\n          dest: "js",\n          rename: { stripBase: true },\n        },\n        {\n          src: join(__dirname, "../packages/core/index.d.ts"),\n          dest: "js/core",\n          rename: { stripBase: true },\n        },\n        {\n          src: join(__dirname, "../packages/core/Build/Unminified/index.js"),\n          dest: "js/core",\n          rename: { stripBase: true },\n        },\n        {\n          src: join(__dirname, "../packages/engine/index.d.ts"),',
  ],
  [
    "add @cesium/core to local Sandcastle imports",
    '        cesium: {\n          path: "../../../Source/Cesium.js",\n          typesPath: "../../Source/Cesium.d.ts",\n        },\n        "@cesium/engine": {',
    '        cesium: {\n          path: "../../../Source/Cesium.js",\n          typesPath: "../../Source/Cesium.d.ts",\n        },\n        "@cesium/core": {\n          path: "../../../packages/core/Build/Unminified/index.js",\n          typesPath: "../../packages/core/index.d.ts",\n        },\n        "@cesium/engine": {',
  ],
];

const sandcastleBuildApplied = [];
for (const [label, from, to] of sandcastleBuildFixes) {
  if (!sandcastleBuildSource.includes(from)) {
    if (sandcastleBuildSource.includes(to)) {
      console.log(`${green("✓")} ${label} already present`);
      continue;
    }
    console.log(red(`✗ ${label}: expected text not found, skipping`));
    continue;
  }
  sandcastleBuildSource = sandcastleBuildSource.replace(from, to);
  sandcastleBuildApplied.push(label);
  console.log(`${green("✓")} ${label}`);
}

if (sandcastleBuildApplied.length > 0) {
  const formatted = await formatWithPrettier(
    sandcastleBuildPath,
    sandcastleBuildSource,
  );
  if (!dryRun) {
    await writeFile(sandcastleBuildPath, formatted);
  }
  console.log(
    bright(
      `${dryRun ? "[dry-run] " : ""}Applied ${sandcastleBuildApplied.length} fix(es) to scripts/buildSandcastle.js.`,
    ),
  );
} else {
  console.log(bright("No fixes applied to scripts/buildSandcastle.js."));
}
console.log();

const sandcastleBuildStaticPath = join(
  repoRoot,
  "packages/sandcastle/scripts/buildStatic.js",
);
const sandcastleBuildStaticOriginal = await readFile(
  sandcastleBuildStaticPath,
  "utf-8",
);
const sandcastleBuildStaticFix = [
  '  checkForImport(imports, "cesium");\n  checkForImport(imports, "@cesium/engine");',
  '  checkForImport(imports, "cesium");\n  checkForImport(imports, "@cesium/core");\n  checkForImport(imports, "@cesium/engine");',
];

if (sandcastleBuildStaticOriginal.includes(sandcastleBuildStaticFix[0])) {
  console.log(`${green("✓")} require @cesium/core in Sandcastle imports`);
  const formatted = await formatWithPrettier(
    sandcastleBuildStaticPath,
    sandcastleBuildStaticOriginal.replace(
      sandcastleBuildStaticFix[0],
      sandcastleBuildStaticFix[1],
    ),
  );
  if (!dryRun) {
    await writeFile(sandcastleBuildStaticPath, formatted);
  }
  console.log(
    bright(
      `${dryRun ? "[dry-run] " : ""}Applied 1 fix to packages/sandcastle/scripts/buildStatic.js.`,
    ),
  );
} else if (
  sandcastleBuildStaticOriginal.includes(sandcastleBuildStaticFix[1])
) {
  console.log(
    `${green("✓")} require @cesium/core in Sandcastle imports already present`,
  );
} else {
  console.log(
    red(
      "✗ require @cesium/core in Sandcastle imports: expected text not found, skipping",
    ),
  );
}
console.log();

const sandcastleViteConfigPath = join(
  repoRoot,
  "packages/sandcastle/vite.config.dev.ts",
);
const sandcastleViteConfigOriginal = await readFile(
  sandcastleViteConfigPath,
  "utf-8",
);
const sandcastleViteConfigFix = [
  '      cesium: {\n        path: "/Source/Cesium.js",\n        typesPath: "/Source/Cesium.d.ts",\n      },\n      "@cesium/engine": {',
  '      cesium: {\n        path: "/Source/Cesium.js",\n        typesPath: "/Source/Cesium.d.ts",\n      },\n      "@cesium/core": {\n        path: "/packages/core/Build/Unminified/index.js",\n        typesPath: "/packages/core/index.d.ts",\n      },\n      "@cesium/engine": {',
];

if (sandcastleViteConfigOriginal.includes(sandcastleViteConfigFix[0])) {
  console.log(`${green("✓")} add @cesium/core to Sandcastle dev imports`);
  const formatted = await formatWithPrettier(
    sandcastleViteConfigPath,
    sandcastleViteConfigOriginal.replace(
      sandcastleViteConfigFix[0],
      sandcastleViteConfigFix[1],
    ),
  );
  if (!dryRun) {
    await writeFile(sandcastleViteConfigPath, formatted);
  }
  console.log(
    bright(
      `${dryRun ? "[dry-run] " : ""}Applied 1 fix to packages/sandcastle/vite.config.dev.ts.`,
    ),
  );
} else if (sandcastleViteConfigOriginal.includes(sandcastleViteConfigFix[1])) {
  console.log(
    `${green("✓")} add @cesium/core to Sandcastle dev imports already present`,
  );
} else {
  console.log(
    red(
      "✗ add @cesium/core to Sandcastle dev imports: expected text not found, skipping",
    ),
  );
}
