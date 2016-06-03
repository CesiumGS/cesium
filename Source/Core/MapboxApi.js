/*global define*/
define([
        './defined'
    ], function(
        defined) {
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

    var printedMpaboxWarning = false;

    MapboxApi.getAccessToken = function(providedToken) {
        if (defined(providedToken)) {
            return providedToken;
        }

        if (!defined(MapboxApi.defaultAccessToken)) {
            if (!printedMpaboxWarning) {
                console.log('This application is using Cesium\'s default Mapbox access token.  Please create a new access token for the application as soon as possible and prior to deployment by visiting https://www.mapbox.com/account/apps/, and provide your token to Cesium by setting the Cesium.MapboxApi.defaultAccessToken property before constructing the CesiumWidget or any other object that uses the Mapbox API.');
                printedMpaboxWarning = true;
            }
            return 'pk.eyJ1IjoiYW5hbHl0aWNhbGdyYXBoaWNzIiwiYSI6IjA2YzBjOTM3YzFlYzljYmQ5NDAxZWI1Y2ZjNzZlM2E1In0.vDZL2SPFEpi_f7ziAIP_yw';
        }

        return MapboxApi.defaultAccessToken;
    };

    return MapboxApi;
});
