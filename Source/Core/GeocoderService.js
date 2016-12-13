/*global define*/
define([
    './defineProperties',
    './DeveloperError'
    ], function(
        defineProperties,
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
     */
    function GeocoderService() {
        /**
         * Indicates whether this geocoding service is to be used for autocomplete.
         *
         * @type {boolean}
         * @default false
         */
        this.autoComplete = false;
    }

    /**
     * @function
     *
     * @param {String} query The query to be sent to the geocoder service
     * @returns {Promise<GeocoderResult[]>}
     */
    GeocoderService.prototype.geocode = DeveloperError.throwInstantiationError;

    /**
     * A function that is called when geocoding is canceled by the user, so that the
     * geocoding service can stop processing current requests.
     * @function
     *
     * @returns {undefined}
     */
    GeocoderService.prototype.cancel = DeveloperError.throwInstantiationError;

    return GeocoderService;
});
