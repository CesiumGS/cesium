// @ts-check

/**
 * Phase 3c/3d migration script (other-fixes step): applies the two mechanical,
 * non-import edits to gulpfile.js that only become correct once moveCoreFiles.js and
 * rewriteCoreImports.js have actually run:
 *
 *  1. Reorders `buildCore` to run *before* `buildEngine` in `build()`'s default path,
 *     `buildRelease`, and `websiteRelease` - core's own spec bundling used to depend on
 *     "@cesium/engine" (via shared root Specs/ helpers), which is why it ran after; once
 *     the rewrite lands, that dependency direction flips (and `websiteRelease`, which
 *     bundles engine/widgets straight from source, never called buildCore at all).
 *  2. Repoints `fixTypescriptDefinitionsSource`'s two hardcoded `readFileSync` calls
 *     from packages/engine/Source/Core/{defined,Check}.d.ts to their new
 *     packages/core/Source location.
 *  3. Excludes typedArrayTypes.js (type-only, no runtime exports) from
 *     packages/core/scripts/build.js's `sourceGlobs`, matching how it was excluded from
 *     packages/engine/scripts/build.js before the move.
 *  4. Repoints `buildTs`'s WebGLConstants-reordering and Math-module-naming workarounds
 *     from the "engine" workspace to "core" - WebGLConstants.js and Math.js (and every
 *     enum that aliases to WebGLConstants, e.g. ComponentDatatype) now live in core, so
 *     engine's own generated declarations no longer contain them.
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

const definedSpliceFix = [
  './packages/engine/Source/Core/defined.d.ts"',
  './packages/core/Source/defined.d.ts"',
];

const checkSpliceFix = [
  './packages/engine/Source/Core/Check.d.ts"',
  './packages/core/Source/Check.d.ts"',
];

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

if (applied.length === 0) {
  console.log(bright("No fixes applied."));
  process.exit(0);
}

const formatted = await formatWithPrettier(gulpfilePath, source);
if (!dryRun) {
  await writeFile(gulpfilePath, formatted);
}

console.log();
console.log(
  bright(
    `${dryRun ? "[dry-run] " : ""}Applied ${applied.length} fix(es) to gulpfile.js.`,
  ),
);

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
