import Credit from "./Credit.js";
import Resource from "./Resource.js";

/**
 * Default settings for accessing the Google Maps API.
 * <br/>
 * An API key is only required if you are directly using any Google Maps APIs, such as through {@link createGooglePhotorealistic3DTileset}.
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
 * @type {undefined|string}
 */
GoogleMaps.defaultApiKey = undefined;

/**
 * Gets or sets the default Google Map Tiles API endpoint.
 *
 * @type {string|Resource}
 * @default https://tile.googleapis.com/v1/
 */
GoogleMaps.mapTilesApiEndpoint = new Resource({
  url: "https://tile.googleapis.com/v1/",
});

GoogleMaps.getDefaultCredit = function () {
  return new Credit(
    `<img src="https://assets.ion.cesium.com/google-credit.png" style="vertical-align: -5px" alt="Google">`,
    true
  );
};
export default GoogleMaps;
