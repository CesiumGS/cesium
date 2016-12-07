/*global define*/
define([
    './BingMapsApi',
    './defaultValue',
    './defineProperties',
    './loadJsonp',
    './Rectangle',
], function(
    BingMapsApi,
    defaultValue,
    defineProperties,
    loadJsonp,
    Rectangle) {
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

        this._url = 'https://dev.virtualearth.net/REST/v1/Locations';
        this._key = BingMapsApi.getKey(options.key);

        this.autoComplete = defaultValue(options.autoComplete, false);
    }

    defineProperties(BingMapsGeocoderService.prototype, {
        /**
         * The URL endpoint for the Bing geocoder service
         * @type {String}
         */
        url : {
            get : function () {
                return this._url;
            }
        },

        /**
         * The key for the Bing geocoder service
         * @type {String}
         */
        key : {
            get : function () {
                return this._key;
            }
        }
    });

    BingMapsGeocoderService.prototype.cancel = function() {
        this._canceled = true;
    };

    /**
     * @function
     *
     * @param {String} query The query to be sent to the geocoder service
     * @returns {Promise<GeocoderResult[]>}
     */
    BingMapsGeocoderService.prototype.geocode = function(query) {
        this._canceled = false;

        var key = this.key;
        var promise = loadJsonp(url, {
            parameters : {
                query : query,
                key : key
            },
            callbackParameterName : 'jsonp'
        });

        var that = this;

        return promise.then(function(result) {
            if (that._canceled) {
                return;
            }
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
                    destination: Rectangle.fromDegrees(west, south, east, north)
                };
            });
        });
    };

    return BingMapsGeocoderService;
});
