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
     * @typedef {Function} GeocoderCallback
     * @param {Error | undefined} error The error that occurred during geocoding
     * @param {GeocoderResult[]} [results]
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
        /**
         * Indicates whether this geocoding service is to be used for autocomplete.
         *
         * @type {boolean}
         * @default false
         */
        this.autoComplete = false;
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
     * @param {GeocoderCallback} callback Callback to be called with geocoder results
     */
    GeocoderService.prototype.geocode = DeveloperError.throwInstantiationError;

    return GeocoderService;
});
