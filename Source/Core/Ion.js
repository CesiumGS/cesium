import Credit from "./Credit.js";
import defined from "./defined.js";
import Resource from "./Resource.js";

var defaultTokenCredit;

var cesiumWebsiteToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MjVmN2Q4Zi0zMDhlLTQzMTYtYTI4NS0wMmZkNjU1YTJiYzYiLCJpZCI6MjU5LCJpYXQiOjE2MzMxMTA1NTl9.SkjZVHCteXzTifSbSqo2rzG7JLiapcJXK428icJQzMU";
var defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2ZTRiMDk3MS1lMjc4LTQyMjQtYjc3Yi01YmI3ZjJjZTM2OTYiLCJpZCI6MjU5LCJpYXQiOjE2MzMxMDE3Nzh9.KGjPWT318SO5c9dTxjnoO5MXJhh8ijaqo_n6Auuy7d8";
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
var Ion = {};

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
    var defaultTokenMessage =
      '<b> \
            This application is using Cesium\'s default ion access token. Please assign <i>Cesium.Ion.defaultAccessToken</i> \
            with an access token from your ion account before making any Cesium API calls. \
            You can sign up for a free ion account at <a href="https://cesium.com">https://cesium.com</a>.</b>';

    defaultTokenCredit = new Credit(defaultTokenMessage, true);
  }

  return defaultTokenCredit;
};
export default Ion;
