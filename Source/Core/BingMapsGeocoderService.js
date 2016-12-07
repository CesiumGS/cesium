/*global define*/
define([
    './BingMapsApi',
    './defaultValue',
    './loadJsonp',
    './Rectangle',
    '../ThirdParty/when',
    './DeveloperError'
], function(
    BingMapsApi,
    defaultValue,
    loadJsonp,
    Rectangle,
    when,
    DeveloperError) {
    'use strict';

   var url = 'https://dev.virtualearth.net/REST/v1/Locations';

    /**
     * Provides geocoding through Bing Maps.
     * @alias BingMapsGeocoderService
     *
     */
    function BingMapsGeocoderService(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this._canceled = false;
        this._key = options.key;

        this.autoComplete = defaultValue(options.autoComplete, false);
    }

    BingMapsGeocoderService.prototype.cancel = function() {
        this._canceled = true;
    };

    /**
     * @function
     *
     * @param {String} query The query to be sent to the geocoder service
     * @param {GeocoderCallback} callback Callback to be called with geocoder results
     */
    BingMapsGeocoderService.prototype.geocode = function(query, callback) {
        this._canceled = false;

        var key = BingMapsApi.getKey(this._key);
        var promise = loadJsonp(url, {
            parameters : {
                query : query,
                key : key
            },
            callbackParameterName : 'jsonp'
        });

        var that = this;

        when(promise, function(result) {
            if (that._canceled) {
                return;
            }
            if (result.resourceSets.length === 0) {
                callback(undefined, []);
                return;
            }

            var results = result.resourceSets[0].resources;

            callback(undefined, results.map(function (resource) {
                var bbox = resource.bbox;
                var south = bbox[0];
                var west = bbox[1];
                var north = bbox[2];
                var east = bbox[3];
                return {
                    displayName: resource.name,
                    destination: Rectangle.fromDegrees(west, south, east, north)
                };
            }));

        }, function() {
            if (that._canceled) {
                return;
            }
            callback(new Error('unknown error when geocoding'));
        });
    };

    return BingMapsGeocoderService;
});
