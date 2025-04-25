/**
 * This is a small script to help with generating new share keys to use in the
 * iTwin platform related sandcastle examples. It's a script because we can only
 * generate keys using a specific service app that has access to the necessary
 * share contract.
 */

// Right now the script is designed to have functions commented out or enabled in
// the main() function so it's likely one or more will be "unused", just ignore
/* eslint-disable no-unused-vars */

import config from "./itwinConfig.js";

if (!config.clientId) {
  console.error("Must set config.clientId in scripts/itwinConfig.js");
  process.exit(1);
}
if (!config.clientSecret) {
  console.error("Must set config.clientSecret in scripts/itwinConfig.js");
  process.exit(1);
}

const sandcastleITwins = {
  marymount: {
    itwinId: "04ba725f-f3c0-4f30-8014-a4488cbd612d",
  },
  philly: {
    itwinId: "535a24a3-9b29-4e23-bb5d-9cedb524c743",
  },
};

/**
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<string>}
 */
async function getAuthToken(clientId, clientSecret) {
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("scope", "itwin-platform");

  const response = await fetch(`https://ims.bentley.com/connect/token`, {
    method: "POST",
    body,
  }).catch((error) => {
    throw error;
  });

  if (!response.ok) {
    console.log(await response.json());
    throw new Error(`Response failed with status: ${response.status}`);
  }

  const result = await response.json();
  const { access_token } = result;
  return access_token;
}

/**
 * @typedef {object} ITwinShare
 * @property {string} id id for this specific share
 * @property {string} iTwinId id of the related itwin
 * @property {string} shareKey share key
 * @property {string} shareContract share contract used to create this share
 * @property {string} expiration iso date of expiration
 */

/**
 * @param {string} itwinId
 * @param {string} authToken oauth token
 * @returns {Promise<ITwinShare[]>}
 */
async function getShareKeysForItwin(itwinId, authToken) {
  const response = await fetch(
    `https://api.bentley.com/accesscontrol/itwins/${itwinId}/shares`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
      },
    },
  );

  if (!response.ok) {
    console.log(JSON.stringify(await response.json(), null, 2));
    throw new Error(`Response failed with status: ${response.status}`);
  }

  const result = await response.json();
  const { shares } = result;
  return shares;
}

/**
 * @param {string} itwinId
 * @param {string} authToken oauth token
 * @returns {Promise<ITwinShare>}
 */
async function createShareKeyForItwin(itwinId, authToken) {
  const response = await fetch(
    `https://api.bentley.com/accesscontrol/itwins/${itwinId}/shares`,
    {
      method: "POST",
      body: JSON.stringify({
        shareContract: "SandCastle",
      }),
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
      },
    },
  );

  if (!response.ok) {
    console.log(JSON.stringify(await response.json(), null, 2));
    throw new Error(`Response failed with status: ${response.status}`);
  }

  const result = await response.json();
  const { share } = result;
  return share;
}

async function main() {
  const authToken = await getAuthToken(config.clientId, config.clientSecret);
  console.log("acquired auth token");

  const itwinIds = [
    sandcastleITwins.marymount.itwinId,
    sandcastleITwins.philly.itwinId,
  ];
  for (const id of itwinIds) {
    console.log("For itwin id:", id);
    const activeShareKeys = await getShareKeysForItwin(id, authToken);
    console.log(activeShareKeys);
  }

  // const newShare = await createShareKeyForItwin(
  //   sandcastleITwins.marymount.itwinId,
  //   authToken,
  // );
  // console.log(newShare);
}

main().catch((error) => {
  console.error("Script failed somewhere:");
  console.error(error.message);
});
