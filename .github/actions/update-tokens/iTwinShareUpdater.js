import { add, getMonth, setDate } from "date-fns";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { exit } from "node:process";
import { fileURLToPath } from "node:url";

const CLIENT_ID = process.env.ITWIN_SERVICE_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.ITWIN_SERVICE_APP_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing client id or secret");
  exit(1);
}

const IMS_URL = "https://ims.bentley.com";
const ITWIN_API_URL = "https://api.bentley.com";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../../");
const packageJsonPath = join(projectRoot, "package.json");

async function getCurrentMinorVersion() {
  const data = await readFile(packageJsonPath, "utf8");
  const { version } = JSON.parse(data);
  const majorMinor = version.match(/^(.*)\.(.*)\./);
  const minor = Number(majorMinor[2]);
  return minor;
}

/**
 * @typedef {object} Share
 * @property {string} id
 * @property {string} iTwinId
 * @property {string} shareKey
 * @property {string} shareContract
 * @property {string} expiration ISO date string
 */

/**
 * @typedef {object} Itwin
 * @property {string} id
 * @property {string} class
 * @property {string} subClass
 * @property {string | null} type
 * @property {string} number
 * @property {string} displayName
 * @property {string} status
 */

/**
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<string>}
 */
async function getIMSToken(clientId, clientSecret) {
  const resp = await fetch(`${IMS_URL}/connect/token`, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "itwin-platform",
    }),
  });

  if (!resp.ok) {
    const result = await resp.json();
    throw new Error(
      `Error fetching token from IMS. Status: ${resp.status}. ${result.error} - ${result.error_description}`,
    );
  }

  const result = await resp.json();
  return result.access_token;
}

/**
 * @param {string} itwinId
 * @param {string} accessToken
 * @returns {Promise<Share[]>}
 */
async function getShares(itwinId, accessToken) {
  const resp = await fetch(
    `${ITWIN_API_URL}/accesscontrol/itwins/${itwinId}/shares`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
      },
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Error getting iTwin shares for ${itwinId}. Status: ${resp.status}`,
    );
  }

  const result = await resp.json();
  return result.shares;
}

/**
 * The iTwin API doesn't provide any way to save metadata with a share key.
 * We would like a way to match keys to release versions to avoid creating duplicates
 * or deleting keys that may still be in use. This could be because the GH job was re-run
 * or we do a patch release where the key doesn't have to change
 *
 * @param {Share[]} shares
 * @param {number} currentMajorVersion
 */
function mapSharesToVersion(shares, currentMajorVersion) {
  // Tokens should last for 2 releases per our Release Guide/cycle
  // If current version is 1.139 and it's 2026-03-25
  // 1.138 should expire 2026-04-01   Current month + 1 === currentVersion - 1 (nextToExpire)
  // 1.139 should expire 2026-05-01   Current month + 2 === currentVersion     (nextToExpire + 1)
  // 1.140 should expire 2026-06-01   Current month + 3 === currentVersion + 1 (nextToExpire + 2)

  const today = new Date();

  const nextToExpire = currentMajorVersion - 1;
  /** @type {Record<number, Share>} */
  const keyPerVersion = {};
  for (const share of shares) {
    const expiration = new Date(share.expiration);
    const monthsApart = getMonth(expiration) - getMonth(today);
    if (monthsApart === 0) {
      throw new Error("Unknown version for share key");
    }
    const forVersion = nextToExpire + monthsApart - 1;
    if (keyPerVersion[forVersion]) {
      throw new Error("Found multiple keys per version");
    }
    keyPerVersion[forVersion] = share;
  }
  return keyPerVersion;
}

/**
 * @param {string} itwinId
 * @param {string} contractName Should be "SandCastle"
 * @param {string} expiration
 * @param {string} accessToken
 * @returns {Promise<Share>}
 */
async function createShare(itwinId, contractName, expiration, accessToken) {
  const resp = await fetch(
    `${ITWIN_API_URL}/accesscontrol/itwins/${itwinId}/shares`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shareContract: contractName,
        // setting this to null will default to the max length. For the SandCastle contract that's 365 days
        expiration: expiration,
      }),
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Error creating iTwin share for ${itwinId}. Status: ${resp.status}`,
    );
  }

  const result = await resp.json();

  return result.share;
}

/**
 * Store a single access token to reuse for subsequent requests sisnce we have multiple itwins
 * @type {string | undefined}
 */
let accessToken;
/** @type {Record<string, string>} */
const cacheKeysPerItwin = {};

/**
 * @param {string} itwinId
 */
export async function getNewKeyForItwin(itwinId) {
  if (cacheKeysPerItwin[itwinId]) {
    console.log("  already generated for this itwin, reusing");
    // no need to go through the whole process of checking/generating for the same itwin
    return cacheKeysPerItwin[itwinId];
  }

  if (accessToken === undefined) {
    accessToken = await getIMSToken(CLIENT_ID, CLIENT_SECRET);
  }

  const existingShares = await getShares(itwinId, accessToken);
  const currentVersion = await getCurrentMinorVersion();
  const nextVersion = currentVersion + 1;
  const sharePerVersion = mapSharesToVersion(existingShares, currentVersion);

  console.log(
    "  creating new key for version",
    nextVersion,
    "for itwin",
    itwinId,
  );

  if (sharePerVersion[nextVersion]) {
    console.log("  found existing key for version", nextVersion, "reusing it");
    cacheKeysPerItwin[itwinId] = sharePerVersion[nextVersion].shareKey;
    // If a share key already exists for the target version then just reuse it
    return sharePerVersion[nextVersion].shareKey;
  }

  console.log("Generating new key for itwin", itwinId);
  const maxAllowedForContract = 10;
  if (existingShares.length >= maxAllowedForContract - 1) {
    throw new Error(`This itwin has too many share keys: ${itwinId}`);
  }

  const expiration = setDate(add(new Date(), { months: 3 }), 1);
  const newShare = await createShare(
    itwinId,
    "SandCastle",
    expiration.toISOString(),
    accessToken,
  );

  console.log("  new key generated");
  cacheKeysPerItwin[itwinId] = newShare.shareKey;
  return newShare.shareKey;
}
