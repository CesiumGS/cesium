import { readFileSync } from "fs";
/**
 * Reads the reviewed "NEEDS SHIM" list that scripts/generateCoreReExportShims.js
 * uses to generate the shim files, e.g. for packages/engine/Source/Core/Deprecated/
 * @param {string} candidatesPath The path of the TXT file with the shim info
 * @returns {string[]} The shim list
 * @throws {Error} When no 'NEEDS SHIM' is found in the specified file
 */
export function readNeedsShimList(candidatesPath) {
  const text = readFileSync(candidatesPath, "utf-8");
  const section = text
    .split(/\r?\n\r?\n/)
    .find((s) => s.startsWith("NEEDS SHIM"));
  if (!section) {
    throw new Error(
      `Could not find a "NEEDS SHIM" section in ${candidatesPath}`,
    );
  }
  return section
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
