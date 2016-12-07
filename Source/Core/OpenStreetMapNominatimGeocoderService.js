/*global define*/
define([
    './Cartesian3',
    './defaultValue',
    './loadJson',
    './Rectangle'
], function(
    Cartesian3,
    defaultValue,
    loadJson,
    Rectangle) {
    'use strict';

    /**
     * Provides geocoding through OpenStreetMap Nominatim.
     * @alias OpenStreetMapNominatimGeocoder
     *
     */
    function OpenStreetMapNominatimGeocoder(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this.displayName = defaultValue(options.displayName, 'Nominatim');
        this._canceled = false;
        this.autoComplete = defaultValue(options.autoComplete, true);
    }

    OpenStreetMapNominatimGeocoder.prototype.cancel = function() {
        this._canceled = true;
    };

    /**
     * @function
     *
     * @param {String} query The query to be sent to the geocoder service
     * @returns {Promise<GeocoderResult[]>}
     */
    OpenStreetMapNominatimGeocoder.prototype.geocode = function (input) {
        var endpoint = 'http://nominatim.openstreetmap.org/search?';
        var query = 'format=json&q=' + input;
        var requestString = endpoint + query;
        return loadJson(requestString)
            .then(function (results) {
                var bboxDegrees;
                return results.map(function (resultObject) {
                    bboxDegrees = resultObject.boundingbox;
                    return {
                        displayName: resultObject.display_name,
                        destination: Rectangle.fromDegrees(
                            bboxDegrees[2],
                            bboxDegrees[0],
                            bboxDegrees[3],
                            bboxDegrees[1]
                        )
                    };
                });
            })
    };

    return OpenStreetMapNominatimGeocoder;
});