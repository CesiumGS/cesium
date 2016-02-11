/*global define*/
define([
        './defined'
    ], function(
        defined) {
    'use strict';

    /**
     * Object for setting and retrieving the default BingMaps API key.
     *
     * @exports BingMapsApi
     */
    var BingMapsApi = {
    };

    /**
     * The default Bing Maps API key to use if one is not provided to the
     * constructor of an object that uses the Bing Maps API.  If this property is undefined,
     * Cesium's default key is used, which is only suitable for use early in development.
     * Please generate your own key by visiting
     * {@link https://www.bingmapsportal.com/}
     * as soon as possible and prior to deployment.  When Cesium's default key is used,
     * a message is printed to the console the first time the Bing Maps API is used.
     *
     * @type {String}
     */
    BingMapsApi.defaultKey = undefined;

    var printedBingWarning = false;

    BingMapsApi.getKey = function(providedKey) {
        if (defined(providedKey)) {
            return providedKey;
        }

        if (!defined(BingMapsApi.defaultKey)) {
            if (!printedBingWarning) {
                console.log('This application is using Cesium\'s default Bing Maps key.  Please create a new key for the application as soon as possible and prior to deployment by visiting https://www.bingmapsportal.com/, and provide your key to Cesium by setting the Cesium.BingMapsApi.defaultKey property before constructing the CesiumWidget or any other object that uses the Bing Maps API.');
                printedBingWarning = true;
            }
            return 'Aj1ony_-Typ-KjG9SJWiKSHY23U1KmK7yAmZa9lDmuF2osXWkcZ22VPsqmCt0TCt';
        }

        return BingMapsApi.defaultKey;
    };

    return BingMapsApi;
});
