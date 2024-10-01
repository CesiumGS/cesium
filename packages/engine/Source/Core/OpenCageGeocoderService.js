import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import combine from "./combine.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Rectangle from "./Rectangle.js";
import Resource from "./Resource.js";

/**
 * Provides geocoding via a {@link https://opencagedata.com/|OpenCage} server.
 * @alias OpenCageGeocoderService
 * @constructor
 *
 * @param {Resource|string} url The endpoint to the OpenCage server.
 * @param {string} apiKey The OpenCage API Key.
 * @param {object} [params] An object with the following properties (See https://opencagedata.com/api#forward-opt):
 * @param {number} [params.abbrv] When set to 1 we attempt to abbreviate and shorten the formatted string we return.
 * @param {number} [options.add_request] When set to 1 the various request parameters are added to the response for ease of debugging.
 * @param {string} [options.bounds] Provides the geocoder with a hint to the region that the query resides in.
 * @param {string} [options.countrycode] Restricts the results to the specified country or countries (as defined by the ISO 3166-1 Alpha 2 standard).
 * @param {string} [options.jsonp] Wraps the returned JSON with a function name.
 * @param {string} [options.language] An IETF format language code.
 * @param {number} [options.limit] The maximum number of results we should return.
 * @param {number} [options.min_confidence] An integer from 1-10. Only results with at least this confidence will be returned.
 * @param {number} [options.no_annotations] When set to 1 results will not contain annotations.
 * @param {number} [options.no_dedupe] When set to 1 results will not be deduplicated.
 * @param {number} [options.no_record] When set to 1 the query contents are not logged.
 * @param {number} [options.pretty] When set to 1 results are 'pretty' printed for easier reading. Useful for debugging.
 * @param {string} [options.proximity] Provides the geocoder with a hint to bias results in favour of those closer to the specified location (For example: 41.40139,2.12870).
 *
 * @example
 * // Configure a Viewer to use the OpenCage Geocoder
 * const viewer = new Cesium.Viewer('cesiumContainer', {
 *   geocoder: new Cesium.OpenCageGeocoderService('https://api.opencagedata.com/geocode/v1/', '<API key>')
 * });
 */
function OpenCageGeocoderService(url, apiKey, params) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  Check.defined("apiKey", apiKey);
  if (defined(params)) {
    Check.typeOf.object("params", params);
  }
  //>>includeEnd('debug');

  url = Resource.createIfNeeded(url);
  url.appendForwardSlash();
  url.setQueryParameters({ key: apiKey });
  this._url = url;
  this._params = defaultValue(params, {});
  this._credit = new Credit(
    `Geodata copyright <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors`,
    false,
  );
}

Object.defineProperties(OpenCageGeocoderService.prototype, {
  /**
   * The Resource used to access the OpenCage endpoint.
   * @type {Resource}
   * @memberof OpenCageGeocoderService.prototype
   * @readonly
   */
  url: {
    get: function () {
      return this._url;
    },
  },
  /**
   * Optional params passed to OpenCage in order to customize geocoding
   * @type {object}
   * @memberof OpenCageGeocoderService.prototype
   * @readonly
   */
  params: {
    get: function () {
      return this._params;
    },
  },
  /**
   * Gets the credit to display after a geocode is performed. Typically this is used to credit
   * the geocoder service.
   * @memberof OpenCageGeocoderService.prototype
   * @type {Credit|undefined}
   * @readonly
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },
});

/**
 * @function
 *
 * @param {string} query The query to be sent to the geocoder service
 * @returns {Promise<GeocoderService.Result[]>}
 */
OpenCageGeocoderService.prototype.geocode = async function (query) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("query", query);
  //>>includeEnd('debug');

  const resource = this._url.getDerivedResource({
    url: "json",
    queryParameters: combine(this._params, { q: query }),
  });
  return resource.fetchJson().then(function (response) {
    return response.results.map(function (resultObject) {
      let destination;
      const bounds = resultObject.bounds;

      if (defined(bounds)) {
        destination = Rectangle.fromDegrees(
          bounds.southwest.lng,
          bounds.southwest.lat,
          bounds.northeast.lng,
          bounds.northeast.lat,
        );
      } else {
        const lon = resultObject.geometry.lat;
        const lat = resultObject.geometry.lng;
        destination = Cartesian3.fromDegrees(lon, lat);
      }

      return {
        displayName: resultObject.formatted,
        destination: destination,
      };
    });
  });
};
export default OpenCageGeocoderService;
