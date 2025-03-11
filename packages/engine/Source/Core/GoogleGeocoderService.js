import Check from "./Check.js";
import Credit from "./Credit.js";
import Frozen from "./Frozen.js";
import Rectangle from "./Rectangle.js";
import Resource from "./Resource.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import RuntimeError from "./RuntimeError.js";

const API_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const CREDIT_HTML = `<img alt="Google" src="https://assets.ion.cesium.com/google-credit.png" style="vertical-align:-5px">`;

/**
 * Provides geocoding through Google.
 *
 * @see {@link https://developers.google.com/maps/documentation/geocoding/policies|Google Geocoding Policies}
 * @alias GoogleGeocoderService
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.key An API key to use with the Google geocoding service
 */
function GoogleGeocoderService(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const key = options.key;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(key)) {
    throw new DeveloperError("options.key is required.");
  }
  //>>includeEnd('debug');

  this._resource = new Resource({
    url: API_URL,
    queryParameters: { key },
  });

  this._credit = new Credit(CREDIT_HTML, true);
}

Object.defineProperties(GoogleGeocoderService.prototype, {
  /**
   * Gets the credit to display after a geocode is performed. Typically this is used to credit
   * the geocoder service.
   * @memberof GoogleGeocoderService.prototype
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
 * Get a list of possible locations that match a search string.
 *
 * @function
 *
 * @param {string} query The query to be sent to the geocoder service
 * @returns {Promise<GeocoderService.Result[]>}
 * @throws {RuntimeError} If the services returns a status other than <code>OK</code> or <code>ZERO_RESULTS</code>
 */
GoogleGeocoderService.prototype.geocode = async function (query) {
  // See API documentation at https://developers.google.com/maps/documentation/geocoding/requests-geocoding

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("query", query);
  //>>includeEnd('debug');

  const resource = this._resource.getDerivedResource({
    queryParameters: {
      address: query,
    },
  });

  const response = await resource.fetchJson();

  if (response.status === "ZERO_RESULTS") {
    return [];
  }

  if (response.status !== "OK") {
    throw new RuntimeError(
      `GoogleGeocoderService got a bad response ${response.status}: ${response.error_message}`,
    );
  }

  const results = response.results.map((result) => {
    const southWest = result.geometry.viewport.southwest;
    const northEast = result.geometry.viewport.northeast;
    return {
      displayName: result.formatted_address,
      destination: Rectangle.fromDegrees(
        southWest.lng,
        southWest.lat,
        northEast.lng,
        northEast.lat,
      ),
      attribution: {
        html: CREDIT_HTML,
        collapsible: false,
      },
    };
  });

  return results;
};

export default GoogleGeocoderService;
