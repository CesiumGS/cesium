/*global define*/
define([
    './Cartesian3',
    './defaultValue',
    '../ThirdParty/when'
], function(
    Cartesian3,
    defaultValue,
    when) {
    'use strict';

    /**
     * Provides geocoding through Bing Maps.
     * @alias LongLatGeocoderService
     *
     */
    function LongLatGeocoderService(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this.autoComplete = false;
    }

    LongLatGeocoderService.prototype.cancel = function() {
    };

    /**
     * @function
     *
     * @param {String} query The query to be sent to the geocoder service
     * @returns {Promise<GeocoderResult[]>}
     */
    LongLatGeocoderService.prototype.geocode = function(query, callback) {
        try {
            var splitQuery = query.match(/[^\s,\n]+/g);
            if ((splitQuery.length === 2) || (splitQuery.length === 3)) {
                var longitude = +splitQuery[0];
                var latitude = +splitQuery[1];
                var height = (splitQuery.length === 3) ? +splitQuery[2] : 300.0;

                if (!isNaN(longitude) && !isNaN(latitude) && !isNaN(height)) {
                    var result = {
                        displayName: query,
                        destination: Cartesian3.fromDegrees(longitude, latitude, height)
                    };
                    return when.resolve([result]);
                }
            }
            return when.resolve([]);
        } catch (e) {
            when.reject(e);
        }
    };

    return LongLatGeocoderService;
});
