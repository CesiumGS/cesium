import Credit from "./Credit.js";
import defined from "./defined.js";
import Resource from "./Resource.js";

let defaultKeyCredit;
const defaultKey = "AIzaSyBqCv5lozjjhtIQ_pZuj2obyAL9bTJdY28";

/**
 * Default settings for accessing the Google Maps API.
 * <br/>
 * An API key is only required if you are using any Google Maps APIs, such as {@link createGooglePhotorealistic3DTileset}.
 * A default key is provided for evaluation purposes only.
 * Follow instructions for managing API keys for the Google Maps Platform at {@link https://developers.google.com/maps/documentation/embed/get-api-key}
 *
 * @see createGooglePhotorealistic3DTileset
 * @see https://developers.google.com/maps/documentation/embed/get-api-key
 *
 * @namespace GoogleMaps
 */
const GoogleMaps = {};

/**
 * Gets or sets the default Google Maps API key.
 *
 * @type {string}
 */
GoogleMaps.defaultApiKey = defaultKey;

/**
 * Gets or sets the default Google Map Tiles API endpoint.
 *
 * @type {string|Resource}
 * @default https://tile.googleapis.com/v1/
 */
GoogleMaps.mapTilesApiEndpoint = new Resource({
  url: "https://tile.googleapis.com/v1/",
});

GoogleMaps.getDefaultApiKeyCredit = function (providedKey) {
  if (providedKey !== defaultKey) {
    return undefined;
  }

  if (!defined(defaultKeyCredit)) {
    const defaultKeyMessage =
      '<b> \
            This application is using CesiumJS\'s default Google Maps API key. Please assign <i>Cesium.GoogleMaps.defaultApiKey</i> \
            with <a href="https://developers.google.com/maps/documentation/embed/get-api-key">your API key for the Google Maps Platform</a>.</b>';

    defaultKeyCredit = new Credit(defaultKeyMessage, true);
    defaultKeyCredit._isDefaultToken = true;
  }

  return defaultKeyCredit;
};
export default GoogleMaps;
