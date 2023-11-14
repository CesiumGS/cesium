import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defined from "./defined.js";
import GeocodeType from "./GeocodeType.js";
import Rectangle from "./Rectangle.js";
import Resource from "./Resource.js";

/**
 * Provides geocoding via a {@link https://pelias.io/|Pelias} server.
 * @alias PeliasGeocoderService
 * @constructor
 *
 * @param {Resource|String} url The endpoint to the Pelias server.
 *
 * @example
 * // Configure a Viewer to use the Pelias server hosted by https://geocode.earth/
 * const viewer = new Cesium.Viewer('cesiumContainer', {
 *   geocoder: new Cesium.PeliasGeocoderService(new Cesium.Resource({
 *     url: 'https://api.geocode.earth/v1/',
 *       queryParameters: {
 *         api_key: '<Your geocode.earth API key>'
 *     }
 *   }))
 * });
 */
function PeliasGeocoderService(url) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  this._url = Resource.createIfNeeded(url);
  this._url.appendForwardSlash();
}

Object.defineProperties(PeliasGeocoderService.prototype, {
  /**
   * The Resource used to access the Pelias endpoint.
   * @type {Resource}
   * @memberof PeliasGeocoderService.prototype
   * @readonly
   */
  url: {
    get: function () {
      return this._url;
    },
  },
});

/**
 * @function
 *
 * @param {String} query The query to be sent to the geocoder service
 * @param {GeocodeType} [type=GeocodeType.SEARCH] The type of geocode to perform.
 * @returns {Promise<GeocoderService.Result[]>}
 */
PeliasGeocoderService.prototype.geocode = function (query, type) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("query", query);
  //>>includeEnd('debug');

  const resource = this._url.getDerivedResource({
    url: type === GeocodeType.AUTOCOMPLETE ? "autocomplete" : "search",
    queryParameters: {
      text: query,
    },
  });

  return resource.fetchJson().then(function (results) {
    return results.features.map(function (resultObject) {
      let destination;
      const bboxDegrees = resultObject.bbox;

      if (defined(bboxDegrees)) {
        destination = Rectangle.fromDegrees(
          bboxDegrees[0],
          bboxDegrees[1],
          bboxDegrees[2],
          bboxDegrees[3]
        );
      } else {
        const lon = resultObject.geometry.coordinates[0];
        const lat = resultObject.geometry.coordinates[1];
        destination = Cartesian3.fromDegrees(lon, lat);
      }

      return {
        displayName: resultObject.properties.label,
        destination: destination,
      };
    });
  });
};
export default PeliasGeocoderService;
