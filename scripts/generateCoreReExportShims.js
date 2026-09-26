// @ts-check

/**
 * Generates packages/engine/Source/Core/Deprecated/<Name>.js re-export shims for
 * every symbol in the reviewed "NEEDS SHIM" section of
 * scripts/core-reexport-shim-candidates.txt (see listCoreReExportShims.js).
 * Each shim wraps the real @cesium/core export with the hand-written
 * _deprecatedCoreExport.js Proxy helper.
 *
 * Usage: node scripts/generateCoreReExportShims.js [--dry-run]
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { repoRoot, formatWithPrettier, dryRun } from "./coreMigrationShared.js";

const DEPRECATED_SINCE_VERSION = "1.146";
const DEPRECATED_REMOVAL_VERSION = "1.150";

const deprecatedDir = join(repoRoot, "packages/engine/Source/Core/Deprecated");
const candidatesPath = join(
  repoRoot,
  "scripts/core-reexport-shim-candidates.txt",
);

/**
 * Reads the reviewed "NEEDS SHIM" section written by listCoreReExportShims.js.
 * @returns {Promise<string[]>}
 */
async function readNeedsShimList() {
  const text = await readFile(candidatesPath, "utf-8");
  const section = text.split("\n\n").find((s) => s.startsWith("NEEDS SHIM"));
  if (!section) {
    throw new Error(
      `Could not find a "NEEDS SHIM" section in ${candidatesPath}`,
    );
  }
  return section
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * @param {string} name
 * @returns {string}
 */
function generateShimSource(name) {
  const nameLiteral = JSON.stringify(name);
  return `import { ${name} } from "@cesium/core";
import deprecatedCoreExport from "./_deprecatedCoreExport.js";

/**
 * @deprecated ${name} was deprecated in CesiumJS ${DEPRECATED_SINCE_VERSION} and will be removed in ${DEPRECATED_REMOVAL_VERSION}.
 * Import ${name} from @cesium/core instead.
 */
export default deprecatedCoreExport(${nameLiteral}, ${name});
`;
}

async function main() {
  const needsShim = await readNeedsShimList();

  console.log(
    `Generating ${needsShim.length} shims${dryRun ? " (dry run)" : ""}`,
  );

  if (!dryRun) {
    await mkdir(deprecatedDir, { recursive: true });
  }

  for (const name of [...needsShim].sort()) {
    const filePath = join(deprecatedDir, `${name}.js`);
    const formatted = await formatWithPrettier(
      filePath,
      generateShimSource(name),
    );
    console.log(`  ${filePath}`);
    if (!dryRun) {
      await writeFile(filePath, formatted, "utf-8");
    }
  }

  console.log(`\nDone.`);
}

await main();
