import defined from "./defined.js";
import deprecationWarning from "./deprecationWarning.js";

var defaultAccessToken;

/**
 * @namespace MapboxApi
 */
var MapboxApi = {};

Object.defineProperties(MapboxApi, {
  /**
   * The default Mapbox API access token to use if one is not provided to the
   * constructor of an object that uses the Mapbox API.  If this property is undefined,
   * Cesium's default access token is used, which is only suitable for use early in development.
   * Please supply your own access token as soon as possible and prior to deployment.
   * Visit {@link https://www.mapbox.com/help/create-api-access-token/} for details.
   * When Cesium's default access token is used, a message is printed to the console the first
   * time the Mapbox API is used.
   *
   * @type {String}
   * @memberof MapboxApi
   * @deprecated
   */
  defaultAccessToken: {
    set: function (value) {
      defaultAccessToken = value;
      deprecationWarning(
        "mapbox-token",
        "MapboxApi.defaultAccessToken is deprecated and will be removed in CesiumJS 1.73. Pass your access token directly to the MapboxImageryProvider or MapboxStyleImageryProvider constructors."
      );
    },
    get: function () {
      return defaultAccessToken;
    },
  },
});

MapboxApi.getAccessToken = function (providedToken) {
  if (defined(providedToken)) {
    return providedToken;
  }

  return MapboxApi.defaultAccessToken;
};

export default MapboxApi;
