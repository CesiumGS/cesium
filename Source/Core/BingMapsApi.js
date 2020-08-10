import defined from "./defined.js";
import deprecationWarning from "./deprecationWarning.js";

var defaultKey;

/**
 * Object for setting and retrieving the default Bing Maps API key.
 *
 * A Bing API key is only required if you are using {@link BingMapsImageryProvider}
 * or {@link BingMapsGeocoderService}. You can create your own key at
 * {@link https://www.bingmapsportal.com/}.
 *
 * @namespace BingMapsApi
 * @deprecated
 */
var BingMapsApi = {};

Object.defineProperties(BingMapsApi, {
  /**
   * The default Bing Maps API key to use if one is not provided to the
   * constructor of an object that uses the Bing Maps API.
   *
   * @type {String}
   * @memberof BingMapsApi
   * @deprecated
   */

  defaultKey: {
    set: function (value) {
      defaultKey = value;
      deprecationWarning(
        "bing-maps-api-default-key",
        "BingMapsApi.defaultKey is deprecated and will be removed in CesiumJS 1.73. Pass your access token directly to the BingMapsGeocoderService or BingMapsImageryProvider constructors."
      );
    },
    get: function () {
      return defaultKey;
    },
  },
});

/**
 * Gets the key to use to access the Bing Maps API. If the provided
 * key is defined, it is returned. Otherwise, returns {@link BingMapsApi.defaultKey}.
 * @param {string|null|undefined} providedKey The provided key to use if defined.
 * @returns {string|undefined} The Bing Maps API key to use.
 * @deprecated
 */
BingMapsApi.getKey = function (providedKey) {
  deprecationWarning(
    "bing-maps-api-get-key",
    "BingMapsApi.getKey is deprecated and will be removed in CesiumJS 1.73. Pass your access token directly to the BingMapsGeocoderService or BingMapsImageryProvider constructors."
  );
  return BingMapsApi._getKeyNoDeprecate(providedKey);
};

BingMapsApi._getKeyNoDeprecate = function (providedKey) {
  if (defined(providedKey)) {
    return providedKey;
  }

  return BingMapsApi.defaultKey;
};
export default BingMapsApi;
