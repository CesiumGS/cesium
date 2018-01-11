define([
        './BingMapsApi',
        './Check',
        './defaultValue',
        './defined',
        './defineProperties',
        './loadJsonp',
        './Rectangle'
    ], function(
        BingMapsApi,
        Check,
        defaultValue,
        defined,
        defineProperties,
        loadJsonp,
        Rectangle) {
    'use strict';

    var url = 'https://dev.virtualearth.net/REST/v1/Locations';

    /**
     * Provides geocoding through Bing Maps.
     * @alias BingMapsGeocoderService
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Scene} options.scene The scene
     * @param {String} [options.key] A key to use with the Bing Maps geocoding service
     */
    function BingMapsGeocoderService(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options.scene', options.scene);
        //>>includeEnd('debug');

        var key = options.key;
        this._key = BingMapsApi.getKey(key);

        if (defined(key)) {
            var errorCredit = BingMapsApi.getErrorCredit(key);
            if (defined(errorCredit)) {
                options.scene._frameState.creditDisplay.addDefaultCredit(errorCredit);
            }
        }
    }

    defineProperties(BingMapsGeocoderService.prototype, {
        /**
         * The URL endpoint for the Bing geocoder service
         * @type {String}
         * @memberof {BingMapsGeocoderService.prototype}
         * @readonly
         */
        url : {
            get : function () {
                return url;
            }
        },

        /**
         * The key for the Bing geocoder service
         * @type {String}
         * @memberof {BingMapsGeocoderService.prototype}
         * @readonly
         */
        key : {
            get : function () {
                return this._key;
            }
        }
    });

    /**
     * @function
     *
     * @param {String} query The query to be sent to the geocoder service
     * @returns {Promise<GeocoderResult[]>}
     */
    BingMapsGeocoderService.prototype.geocode = function(query) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('query', query);
        //>>includeEnd('debug');

        var key = this.key;
        var promise = loadJsonp(url, {
            parameters : {
                query : query,
                key : key
            },
            callbackParameterName : 'jsonp'
        });

        return promise.then(function(result) {
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
