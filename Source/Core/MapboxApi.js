/*global define*/
define([
    './defined',
    './Credit'
], function(
    defined,
    Credit) {
    'use strict';

    var MapboxApi = {
    };

    /**
     * The default Mapbox API access token to use if one is not provided to the
     * constructor of an object that uses the Mapbox API.  If this property is undefined,
     * Cesium's default access token is used, which is only suitable for use early in development.
     * Please supply your own access token as soon as possible and prior to deployment.
     * Visit {@link https://www.mapbox.com/help/create-api-access-token/} for details.
     * When Cesium's default access token is used, a message is printed to the console the first
     * time the Mapbox API is used.
     *
     * @type {String}
     */
    MapboxApi.defaultAccessToken = undefined;

    var printedMapboxWarning = false;
    var errorCredit;
    var errorString = 'This application is using Cesium\'s default Mapbox access token.  Please create a new access token for the application as soon as possible and prior to deployment by visiting https://www.mapbox.com/account/apps/, and provide your token to Cesium by setting the Cesium.MapboxApi.defaultAccessToken property before constructing the CesiumWidget or any other object that uses the Mapbox API.';


    MapboxApi.getAccessToken = function(providedToken) {
        if (defined(providedToken)) {
            return providedToken;
        }

        if (!defined(MapboxApi.defaultAccessToken)) {
            if (!printedMapboxWarning) {
                console.log(errorString);
                printedMapboxWarning = true;
            }
            return 'pk.eyJ1IjoiYW5hbHl0aWNhbGdyYXBoaWNzIiwiYSI6ImNpd204Zm4wejAwNzYyeW5uNjYyZmFwdWEifQ.7i-VIZZWX8pd1bTfxIVj9g';
        }

        return MapboxApi.defaultAccessToken;
    };

    MapboxApi.getErrorCredit = function(providedToken) {
        if (defined(providedToken) || defined(MapboxApi.defaultAccessToken)) {
            return undefined;
        }

        if (!defined(errorCredit)) {
            errorCredit = new Credit(errorString);
        }

        return errorCredit;
    };

    return MapboxApi;
});
