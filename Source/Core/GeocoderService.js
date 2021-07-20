import DeveloperError from "./DeveloperError.js";

/**
 * @typedef {Object} GeocoderService.Result
 * @property {String} displayName The display name for a location
 * @property {Rectangle|Cartesian3} destination The bounding box for a location
 */

/**
 * Provides geocoding through an external service. This type describes an interface and
 * is not intended to be used.
 * @alias GeocoderService
 * @constructor
 *
 * @see BingMapsGeocoderService
 * @see PeliasGeocoderService
 * @see OpenCageGeocoderService
 */
function GeocoderService() {}

/**
 * @function
 *
 * @param {String} query The query to be sent to the geocoder service
 * @param {GeocodeType} [type=GeocodeType.SEARCH] The type of geocode to perform.
 * @returns {when.Promise<GeocoderService.Result[]>}
 */
GeocoderService.prototype.geocode = DeveloperError.throwInstantiationError;
export default GeocoderService;
