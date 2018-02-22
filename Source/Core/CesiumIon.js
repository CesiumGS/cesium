define([
        './Check',
        './Credit',
        './defaultValue',
        './defined',
        './Resource',
        './RuntimeError',
        './CesiumIonResource'
    ], function(
        Check,
        Credit,
        defaultValue,
        defined,
        Resource,
        RuntimeError,
        CesiumIonResource) {
    'use strict';

    /**
     * Utility object for working with the Cesium ion API.
     *
     * @see https://cesium.com
     *
     * @exports CesiumIon
     */
    var CesiumIon = {};

    /**
     * The default Cesium ion access token to use.
     *
     * @type {String}
     */
    CesiumIon.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NDViM2NkNi0xYTE2LTRlZTUtODBlNy05M2Q4ODg4M2NmMTQiLCJpZCI6MjU5LCJpYXQiOjE1MTgxOTc4MDh9.sld5jPORDf_lWavMEsugh6vHPnjR6j3qd1aBkQTswNM';

    /**
     * The default Cesium ion server to use.
     *
     * @type {String}
     * @default https://api.cesium.com
     */
    CesiumIon.defaultServerUrl = 'https://api.cesium.com';

    /**
     * Asynchronously creates a {@link Resource} representing a Cesium ion asset.
     *
     * @param {Number} assetId The Cesium ion asset id.
     * @param {Object} [options] An object with the following properties:
     * @param {String} [options.accessToken=CesiumIon.defaultAccessToken] The access token to use.
     * @param {String} [options.serverUrl=CesiumIon.defaultServerUrl] The url to the Cesium ion API server.
     * @returns {Promise.<Resource>} A Promise to a Resource representing the Cesium ion Asset.
     *
     * @example
     * //Load a Cesium3DTileset with asset ID of 124624234
     * Cesium.CesiumIon.createResource(124624234)
     *   .then(function (resource) {
     *     viewer.scene.primitives.add(new Cesium.Cesium3DTileset({ url: resource }));
     * });
     *
     * @example
     * //Load a CZML file with asset ID of 10890
     * Cesium.CesiumIon.createResource(10890)
     *   .then(function (resource) {
     *     viewer.dataSources.add(Cesium.CzmlDataSource.load(resource));
     *   });
     *
     * @example
     * //Load an ImageryProvider with asset ID of 2347923
     * Cesium.CesiumIon.createResource(2347923)
     *   .then(function (resource) {
     *     viewer.imageryLayers.addProvider(Cesium.createTileMapServiceImageryProvider({url : resource }));
     *   });
     */
    CesiumIon.createResource = function(assetId, options) {
        var endpointResource = CesiumIon._createEndpointResource(assetId, options);

        return CesiumIon._loadJson(endpointResource)
            .then(function (endpoint) {

                var externalType = endpoint.externalType;
                if (!defined(externalType)) {
                    return CesiumIonResource.create(endpoint, endpointResource);
                }

                // 3D Tiles and STK Terrain Server external assets can still be represented as a resource
                // object, just not the CesiumIonResource object.
                if (externalType === '3DTILES' || externalType === 'STK_TERRAIN_SERVER') {
                    var resource = new Resource({ url: endpoint.options.url });

                    resource.credits = endpoint.attributions.map(function(attribution) {
                        return new Credit({
                            text: attribution.text,
                            link: attribution.url,
                            imageUrl: attribution.image,
                            showOnScreen: defined(attribution.collapsible) && !attribution.collapsible
                        });
                    });
                    resource.ionEndpoint = endpoint;
                    var oldClone = resource.clone;
                    resource.clone = function(result) {
                        result = oldClone.apply(resource, result);
                        result.ionEndpoint = this.ionEndpoint;
                        result.credits = this.credits;
                        return result;
                    };
                    return resource;
                }

                //External imagery assets have additional configuration that can't be represented as a Resource
                throw new RuntimeError('CesiumIon.createResource does not support external imagery assets; use IonImageryProvider instead.');
            });
    };

    /**
     * @private
     */
    CesiumIon._createEndpointResource = function (assetId, options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('assetId', assetId);
        //>>includeEnd('debug');

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var serverUrl = defaultValue(options.serverUrl, CesiumIon.defaultServerUrl);
        var accessToken = defaultValue(options.accessToken, CesiumIon.defaultAccessToken);

        var resourceOptions = {
            url: serverUrl + '/v1/assets/' + assetId + '/endpoint'
        };

        if (defined(accessToken)) {
            resourceOptions.queryParameters = { access_token: accessToken };
        }

        return new Resource(resourceOptions);
    };

    //Exposed for testing
    CesiumIon._loadJson = function(resource) {
        return resource.fetchJson();
    };

    return CesiumIon;
});
