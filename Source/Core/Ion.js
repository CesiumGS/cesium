import Credit from "./Credit.js";
import defined from "./defined.js";
import Resource from "./Resource.js";

let defaultTokenCredit;

// This is the "cesium.com - sandcastle & cesium viewer" token from the CesiumJS account
const cesiumWebsiteToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ODZkMDQzOS03ZGJjLTQzZWUtYjlmYy04ZmM5Y2UwNzNhMmYiLCJpZCI6MjU5LCJpYXQiOjE2MzgyMDYwMDB9.cK1hsaFBgz0l2dG9Ry5vBFHWp-HF2lwjLC0tcK8Z8tY";
const defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5YTJlYmI0NC1kM2IwLTRmZDktOGI2Yy01MDFiZWRkYzQ4NzEiLCJpZCI6MjU5LCJpYXQiOjE2NTE0OTY5NDl9.GEWUJWU1Yuf7kVTVshQ1jb2ix9f-O-A74MuSsjq7Kbg";
/**
 * Default settings for accessing the Cesium ion API.
 *
 * An ion access token is only required if you are using any ion related APIs.
 * A default access token is provided for evaluation purposes only.
 * Sign up for a free ion account and get your own access token at {@link https://cesium.com}
 *
 * @see IonResource
 * @see IonImageryProvider
 * @see IonGeocoderService
 * @see createWorldImagery
 * @see createWorldTerrain
 * @namespace Ion
 */
const Ion = {};

/**
 * Gets or sets the default Cesium ion access token.
 *
 * @type {String}
 */
Ion.defaultAccessToken = cesiumWebsiteToken;

/**
 * Gets or sets the default Cesium ion server.
 *
 * @type {String|Resource}
 * @default https://api.cesium.com
 */
Ion.defaultServer = new Resource({ url: "https://api.cesium.com/" });

Ion.getDefaultTokenCredit = function (providedKey) {
  if (providedKey !== defaultAccessToken) {
    return undefined;
  }

  if (!defined(defaultTokenCredit)) {
    const defaultTokenMessage =
      '<b> \
            This application is using Cesium\'s default ion access token. Please assign <i>Cesium.Ion.defaultAccessToken</i> \
            with an access token from your ion account before making any Cesium API calls. \
            You can sign up for a free ion account at <a href="https://cesium.com">https://cesium.com</a>.</b>';

    defaultTokenCredit = new Credit(defaultTokenMessage, true);
  }

  return defaultTokenCredit;
};
export default Ion;
