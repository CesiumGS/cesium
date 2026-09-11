// Updates the default Cesium ion access token baked into
// packages/engine/Source/Core/Ion.js with the current default token from the
// CesiumGS ion account (https://ion.cesium.com).
//
// This is handy when checking out an older branch or PR whose committed default
// token has since expired. To restore the committed value, revert Ion.js in git.
//
// Before running this script the first time, set the CESIUM_ION_LIST_TOKENS_TOKEN environment variable or add it to a local .env file.
// Use the token in the CesiumGS account called "Dev: Update Local Default Access Token", which has the "tokens:read" scope.
//
//   echo 'CESIUM_ION_LIST_TOKENS_TOKEN=<token>' > .env
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

const defaultTokenUrl = "https://api.cesium.com/v2/tokens/default";

// Matches: const defaultAccessToken =\n  "...";
const tokenRegex = /(const defaultAccessToken =\s*)"[^"]*"/;

/**
 * Fetches the default access token from the CesiumGS ion account.
 * @param {string} apiToken
 * @returns {Promise<string>}
 */
async function fetchDefaultToken(apiToken) {
  const response = await fetch(defaultTokenUrl, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(
      `Request to ${defaultTokenUrl} failed with ${response.status} ${response.statusText}. ` +
        `Ensure the ion token is valid and has the 'tokens:read' scope.`,
    );
  }
  const { token } = await response.json();
  if (!token) {
    throw new Error("The ion API response did not include a token.");
  }
  return token;
}

// An explicit environment variable wins; otherwise fall back to a local .env file.
if (!process.env.CESIUM_ION_LIST_TOKENS_TOKEN) {
  try {
    process.loadEnvFile(path.join(repoRoot, ".env"));
  } catch {
    // No .env file; that's fine.
  }
}

const apiToken = process.env.CESIUM_ION_LIST_TOKENS_TOKEN;
if (!apiToken) {
  console.error(
    "No ion API token found. Set the CESIUM_ION_LIST_TOKENS_TOKEN environment variable, or add it to a\n" +
      "git-ignored .env file in the repo root:\n" +
      "  echo 'CESIUM_ION_LIST_TOKENS_TOKEN=<token>' > .env\n" +
      "The token must have the 'tokens:read' scope.",
  );
  process.exit(1);
}

const token = await fetchDefaultToken(apiToken);

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
