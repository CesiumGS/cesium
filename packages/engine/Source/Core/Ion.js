import Credit from "./Credit.js";
import defined from "./defined.js";
import Resource from "./Resource.js";

let defaultTokenCredit;
const defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzN2UwMjViMC0xOTJhLTQxMmItOWEzMS1kMjJiNmZiY2E5N2YiLCJpZCI6MjU5LCJpYXQiOjE3MDE0NTc1NjB9.bMNhc7S4cuG1qUnRUiLxr5lunSH1k6-UfkRXSqVFYyM";
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
 * @type {string}
 */
Ion.defaultAccessToken = defaultAccessToken;

/**
 * Gets or sets the default Cesium ion server.
 *
 * @type {string|Resource}
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
