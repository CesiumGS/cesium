// Updates the default Cesium ion access token baked into
// packages/engine/Source/Core/Ion.js with the current default token from the
// CesiumJS main branch.
//
// This is handy when checking out an older branch or PR whose committed default
// token has since expired. To restore the committed value, revert Ion.js in git.
//
// Then: npm run update-ion-token

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const ionPath = path.join(
  repoRoot,
  "packages",
  "engine",
  "Source",
  "Core",
  "Ion.js",
);

const mainIonUrl =
  "https://raw.githubusercontent.com/CesiumGS/cesium/main/packages/engine/Source/Core/Ion.js";

// Matches: const defaultAccessToken =\n  "...";
const tokenRegex = /(const defaultAccessToken =\s*)"([^"]*)"/;

/**
 * Fetches the default access token from the CesiumJS main branch.
 * @returns {Promise<string>}
 */
async function fetchDefaultToken() {
  const response = await fetch(mainIonUrl);
  if (!response.ok) {
    throw new Error(
      `Request to ${mainIonUrl} failed with ${response.status} ${response.statusText}.`,
    );
  }

  const source = await response.text();
  const match = source.match(tokenRegex);
  if (!match) {
    throw new Error(
      "The CesiumJS main branch did not contain the default access token declaration.",
    );
  }
  return match[2];
}

const token = await fetchDefaultToken();

const source = readFileSync(ionPath, "utf8");
if (!tokenRegex.test(source)) {
  console.error(
    `Could not find the default access token declaration in ${path.relative(repoRoot, ionPath)}.`,
  );
  process.exit(1);
}

const updated = source.replace(tokenRegex, `$1"${token}"`);
if (updated === source) {
  console.log("The default ion access token is already up to date.");
  process.exit(0);
}

writeFileSync(ionPath, updated);
console.log(
  `Updated the default ion access token in ${path.relative(repoRoot, ionPath)}.`,
);
