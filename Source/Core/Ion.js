define([
        './Resource'
    ], function(
        Resource) {
    'use strict';

    /**
     * Default settings for accessing the Cesium Ion API.
     * @exports Ion
     *
     * @see IonResource
     * @see IonImageryProvider
     * @see createWorldTerrain
     * @see https://cesium.com
     */
    var Ion = {};

    /**
     * Gets or sets the default Cesium ion access token.
     *
     * @type {String}
     */
    Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NDViM2NkNi0xYTE2LTRlZTUtODBlNy05M2Q4ODg4M2NmMTQiLCJpZCI6MjU5LCJpYXQiOjE1MTgxOTc4MDh9.sld5jPORDf_lWavMEsugh6vHPnjR6j3qd1aBkQTswNM';

    /**
     * Gets or sets the default Cesium ion server.
     *
     * @type {String|Resource}
     * @default https://api.cesium.com
     */
    Ion.defaultServer = new Resource({ url: 'https://api.cesium.com/' });

    return Ion;
});
