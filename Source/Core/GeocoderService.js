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
     * @property {Rectangle} rectangle The bounding box for a location
     */

    /**
     * Provides geocoding through an external service. This type describes an interface and
     * is not intended to be used.
     * @alias GeocoderService
     * @constructor
     *
     * @see BingMapsGeocoderService
     */
    function GeocoderService () {
    }

    defineProperties(GeocoderService.prototype, {
        /**
         * The name of this service to be displayed next to suggestions
         * in case more than one geocoder is in use
         * @type {String}
         *
         */
        displayName : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * @function
     *
     * @param {String} query The query to be sent to the geocoder service
     * @returns {GeocoderResult[]} geocoderResults An array containing the results from the
     * geocoder service
     */
    GeocoderService.prototype.geocode = DeveloperError.throwInstantiationError;

    return GeocoderService;
});
