import { exit } from "node:process";

const CLIENT_ID = process.env.ITWIN_SERVICE_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.ITWIN_SERVICE_APP_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing client id or secret");
  exit(1);
}

const IMS_URL = "https://ims.bentley.com";
const ITWIN_API_URL = "https://api.bentley.com";

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
 * @param {string} accessToken
 */
export async function getMyInfo(accessToken) {
  const resp = await fetch(`${ITWIN_API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
    },
  });
  const result = await resp.json();
  return result.user;
}

/**
 * @param {string} accessToken
 * @returns {Promise<Itwin[]>}
 */
export async function getItwinsWithAccess(accessToken) {
  const resp = await fetch(`${ITWIN_API_URL}/itwins`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
    },
  });
  const result = await resp.json();
  return result.iTwins;
}

/**
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<string>}
 */
export async function getIMSToken(clientId, clientSecret) {
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
export async function getShares(itwinId, accessToken) {
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
 * @param {string} itwinId
 * @param {string} contractName Should be "SandCastle"
 * @param {string} accessToken
 * @returns {Promise<Share>}
 */
export async function createShare(itwinId, contractName, accessToken) {
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
        expiration: null,
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
 * @param {string} itwinId
 * @param {string} shareId
 * @param {string} accessToken
 */
export async function deleteShare(itwinId, shareId, accessToken) {
  const resp = await fetch(
    `${ITWIN_API_URL}/accesscontrol/itwins/${itwinId}/shares/${shareId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
      },
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Error deleting iTwin share for ${itwinId} with id ${shareId}. Status: ${resp.status}`,
    );
  }
}

/** @type {string} */
let accessToken;

/**
 * @param {string} itwinId
 * @param {object} [options]
 * @param {boolean} [options.autoDelete=false] Whether to automatically delete keys to clear up space down to the limitNumber. Will start with the first to expire
 * @param {number} [options.limitNumber=10] The number of keys to allow per itwin. Will throw if over this value and autoDelete is false. Otherwise will delete down to this limit - 1 then create a new key
 * @param {string} [options.neverDeleteKey] Prevent deletion of a specific key even if over the limit
 */
export async function getNewKeyForItwin(
  itwinId,
  { autoDelete = false, neverDeleteKey, limitNumber = 10 } = {},
) {
  if (limitNumber > 10) {
    throw new Error(
      "The SandCastle share contract does not allow more than 10 keys per itwin",
    );
  }

  if (accessToken === undefined) {
    accessToken = await getIMSToken(CLIENT_ID, CLIENT_SECRET);
  }

  const existingShares = await getShares(itwinId, accessToken);
  console.log(existingShares);

  console.log("Generating new key for itwin", itwinId);

  if (existingShares.length >= limitNumber) {
    if (!autoDelete) {
      throw new Error(`This itwin has too many share keys: ${itwinId}`);
    }

    console.log(`  too many keys for itwin ${itwinId} deleting some`);
    /** @type {Share[]} */
    const sorted = existingShares.toSorted((a, b) =>
      a.expiration.localeCompare(b.expiration),
    );
    while (sorted.length > limitNumber) {
      const last = sorted.pop();

      if (last?.shareKey === neverDeleteKey) {
        continue;
      }

      console.log("  delete shareId:", last.id);
      await deleteShare(itwinId, last.id, accessToken);
    }
  }

  const newShare = await createShare(itwinId, "SandCastle", accessToken);
  return newShare.shareKey;
}
