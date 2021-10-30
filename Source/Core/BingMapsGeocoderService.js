import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import Rectangle from "./Rectangle.js";
import Resource from "./Resource.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

var url = "https://dev.virtualearth.net/REST/v1/Locations";

/**
 * Provides geocoding through Bing Maps.
 * @alias BingMapsGeocoderService
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.key A key to use with the Bing Maps geocoding service
 * @param {String} [options.culture] A Bing Maps {@link https://docs.microsoft.com/en-us/bingmaps/rest-services/common-parameters-and-types/supported-culture-codes|Culture Code} to return results in a specific culture and language.
 */
function BingMapsGeocoderService(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var key = options.key;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(key)) {
    throw new DeveloperError("options.key is required.");
  }
  //>>includeEnd('debug');

  this._key = key;

  var queryParameters = {
    key: key,
  };

  if (defined(options.culture)) {
    queryParameters.culture = options.culture;
  }

  this._resource = new Resource({
    url: url,
    queryParameters: queryParameters,
  });
}

Object.defineProperties(BingMapsGeocoderService.prototype, {
  /**
   * The URL endpoint for the Bing geocoder service
   * @type {String}
   * @memberof BingMapsGeocoderService.prototype
   * @readonly
   */
  url: {
    get: function () {
      return url;
    },
  },

  /**
   * The key for the Bing geocoder service
   * @type {String}
   * @memberof BingMapsGeocoderService.prototype
   * @readonly
   */
  key: {
    get: function () {
      return this._key;
    },
  },
});

/**
 * @function
 *
 * @param {String} query The query to be sent to the geocoder service
 * @returns {Promise<GeocoderService.Result[]>}
 */
BingMapsGeocoderService.prototype.geocode = function (query) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("query", query);
  //>>includeEnd('debug');

  var resource = this._resource.getDerivedResource({
    queryParameters: {
      query: query,
    },
  });

  return resource.fetchJsonp("jsonp").then(function (result) {
    if (result.resourceSets.length === 0) {
      return [];
    }

    var results = result.resourceSets[0].resources;

    return results.map(function (resource) {
      var bbox = resource.bbox;
      var south = bbox[0];
      var west = bbox[1];
      var north = bbox[2];
      var east = bbox[3];
      return {
        displayName: resource.name,
        destination: Rectangle.fromDegrees(west, south, east, north),
      };
    });
  });
};
export default BingMapsGeocoderService;
