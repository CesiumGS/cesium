import { exit } from "process";
import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { add, format, setDate } from "date-fns";

const ION_TOKEN_CONTROLLER_TOKEN = process.env.ION_TOKEN_CONTROLLER_TOKEN;

if (!ION_TOKEN_CONTROLLER_TOKEN) {
  console.error("Missing token for the ion key updater");
  exit(1);
}

const BASE_URL = "https://api.cesium.com";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../../");
const packageJsonPath = join(projectRoot, "package.json");

export async function getNextVersion() {
  const data = await readFile(packageJsonPath, "utf8");
  const { version } = JSON.parse(data);
  const majorMinor = version.match(/^(.*)\.(.*)\./);
  const major = majorMinor[1];
  const minor = Number(majorMinor[2]) + 1; // We want the next release, not current release
  return `${major}.${minor}`;
}

/**
 * @returns {Promise<{items: Token[], total: number}>}
 */
async function getTokens() {
  const resp = await fetch(`${BASE_URL}/v2/tokens`, {
    headers: {
      Authorization: `Bearer ${ION_TOKEN_CONTROLLER_TOKEN}`,
    },
  });
  return resp.json();
}

/**
 * @typedef {object} Token
 * @property {string} id
 * @property {string} name
 * @property {string} token
 * @property {boolean} isDefault
 * @property {string} dateAdded
 * @property {string} dateModified
 * @property {string} dateLastUsed
 * @property {string[]} scopes
 * @property {string[]} allowedUrls
 * @property {number[]} [assetIds]
 */

/**
 * @typedef {object} KnownToken
 * @property {Token} token
 * @property {string} version
 * @property {string} dateToDelete
 */

/**
 * We want a filtered list of "known" tokens that we control. There are a lot of other
 * tokens in the account that have other purposes and we don't want to disrupt those
 *
 * @returns {Promise<Token[]>}
 */
export async function getKnownTokens() {
  const tokens = await getTokens();

  const namePattern =
    /(?<version>1.\d+) Release - Delete on (?<date>\w+ \d+, \d+)/;
  const knownTokens = tokens.items.filter((token) =>
    namePattern.test(token.name),
  );
  return knownTokens;
}

/**
 * @param {string} version
 * @returns {Promise<Token>}
 */
export async function createNewToken(version) {
  console.log("  creating new token for version", version);
  const existingTokens = await getKnownTokens();
  const tokenForVersion = existingTokens.find((token) =>
    token.name.includes(version),
  );
  if (tokenForVersion) {
    console.log("  found existing token for version", version, "reusing it");
    // Protection just in case this gets run multiple times for a release
    return tokenForVersion;
  }

  // Add 3 months then round down to the first of that month
  // We do 3 months since this is intended to be run in the week BEFORE a release
  const dateToDelete = setDate(add(new Date(), { months: 3 }), 1);
  const deleteDateString = format(dateToDelete, "MMMM d, yyyy");

  const resp = await fetch(`${BASE_URL}/v2/tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ION_TOKEN_CONTROLLER_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `${version} Release - Delete on ${deleteDateString}`,
      scopes: ["assets:read", "geocode"],
    }),
  });
  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }
  console.log("  created new token for version", version);
  return resp.json();
}
