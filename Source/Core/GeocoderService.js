define([
        './DeveloperError'
    ], function(
        DeveloperError) {
    'use strict';

    /**
     * @typedef {Object} GeocoderResult
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
     */
    function GeocoderService() {
    }

    /**
     * @function
     *
     * @param {String} query The query to be sent to the geocoder service
     * @param {GeocodeType} [type=GeocodeType.SEARCH] The type of geocode to perform.
     * @returns {Promise<GeocoderResult[]>}
     */
    GeocoderService.prototype.geocode = DeveloperError.throwInstantiationError;

    return GeocoderService;
});
