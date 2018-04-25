define([
        './Credit',
        './defined'
    ], function(
        Credit,
        defined) {
    'use strict';

    /**
     * Object for setting and retrieving the default BingMaps API key.
     *
     * @exports BingMapsApi
     */
    var BingMapsApi = {};

    /**
     * The default Bing Maps API key to use if one is not provided to the
     * constructor of an object that uses the Bing Maps API.
     *
     * @type {String}
     */
    BingMapsApi.defaultKey = undefined;

    BingMapsApi.getKey = function(providedKey) {
        if (defined(providedKey)) {
            return providedKey;
        }

        return BingMapsApi.defaultKey;
    };

    return BingMapsApi;
});
