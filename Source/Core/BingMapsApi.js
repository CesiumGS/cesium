/*global define*/
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
    var errorCredit;
    var errorString = 'This application is using Cesium\'s default Bing Maps key.  Please create a new key for the application as soon as possible and prior to deployment by visiting https://www.bingmapsportal.com/, and provide your key to Cesium by setting the Cesium.BingMapsApi.defaultKey property before constructing the CesiumWidget or any other object that uses the Bing Maps API.';

    BingMapsApi.getKey = function(providedKey) {
        if (defined(providedKey)) {
            return providedKey;
        }

        if (!defined(BingMapsApi.defaultKey)) {
            if (!printedBingWarning) {
                console.log(errorString);
                printedBingWarning = true;
            }
            return 'AnjT_wAj_juA_MsD8NhcEAVSjCYpV-e50lUypkWm1JPxVu0XyVqabsvD3r2DQpX-';
        }

        return BingMapsApi.defaultKey;
    };

    BingMapsApi.getErrorCredit = function(providedKey) {
        if (defined(providedKey) || defined(BingMapsApi.defaultKey)) {
            return undefined;
        }

        if (!defined(errorCredit)) {
            errorCredit = new Credit(errorString);
        }

        return errorCredit;
    };

    return BingMapsApi;
});
