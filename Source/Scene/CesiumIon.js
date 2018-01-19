define([
        './ArcGisMapServerImageryProvider',
        './BingMapsImageryProvider',
        './createTileMapServiceImageryProvider',
        './GoogleEarthEnterpriseMapsProvider',
        './MapboxImageryProvider',
        './SingleTileImageryProvider',
        './UrlTemplateImageryProvider',
        './WebMapServiceImageryProvider',
        './WebMapTileServiceImageryProvider',
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/loadJson',
        '../Core/Resource',
        '../Core/RuntimeError',
        '../ThirdParty/when'
    ], function(
        ArcGisMapServerImageryProvider,
        BingMapsImageryProvider,
        createTileMapServiceImageryProvider,
        GoogleEarthEnterpriseMapsProvider,
        MapboxImageryProvider,
        SingleTileImageryProvider,
        UrlTemplateImageryProvider,
        WebMapServiceImageryProvider,
        WebMapTileServiceImageryProvider,
        Check,
        defaultValue,
        defined,
        loadJson,
        Resource,
        RuntimeError,
        when) {
    'use strict';

    /**
     * Utility object for working with the Cesium ion API.
     *
     * @see https://cesium.com
     *
     * @exports CesiumIon
     *
     * @experimental This class is part of Cesium ion beta functionality and may change without our normal deprecation policy.
     */
    var CesiumIon = {};

    /**
     * The default Cesium ion access token to use.
     *
     * @type {String}
     */
    CesiumIon.defaultAccessToken = undefined;

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
        Check.defined('assetId', assetId);

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var serverUrl = defaultValue(options.serverUrl, CesiumIon.defaultServerUrl);
        var accessToken = defaultValue(options.accessToken, CesiumIon.defaultAccessToken);

        var resourceOptions = {
            url: serverUrl + '/v1/assets/' + assetId + '/endpoint'
        };

        if (defined(accessToken)) {
            resourceOptions.queryParameters = { access_token: accessToken };
        }

        var endpointResource = new Resource(resourceOptions);
        return CesiumIon._loadJson(endpointResource)
            .then(function(endpoint) {
                return CesiumIonResource.create(endpoint, endpointResource);
            });
    };

    /**
     * Creates an {@link ImageryProvider} representing a Cesium ion imagery asset.
     * Unlike {@link CesiumIon.createResource}, this function supports external asset functionality.
     *
     * @param {Number} assetId The Cesium ion asset id.
     * @param {Object} [options] An object with the following properties:
     * @param {String} [options.accessToken=CesiumIon.defaultAccessToken] The access token to use.
     * @param {String} [options.serverUrl=CesiumIon.defaultServerUrl] The url to the Cesium ion API server.
     * @returns {Promise<ImageryProvider>} A promise to an imagery provider presenting the requested Cesium ion Asset.
     *
     * @example
     * //Load an ImageryProvider with asset ID of 2347923
     * Cesium.CesiumIon.createImageryProvider(2347923)
     *   .then(function (imageryProvider) {
     *     viewer.imageryLayers.addProvider(imageryProvider);
     *   });
     */
    CesiumIon.createImageryProvider = function(assetId, options) {
        return CesiumIon.createResource(assetId, options)
            .then(function(resource) {
                return resource.createImageryProvider();
            });
    };

    /**
     * A {@link Resource} instance that encapsulates Cesium ion asset
     * creation and automatic refresh token handling.
     *
     * @private
     */
    function CesiumIonResource(options, endpoint, endpointResource) {
        Resource.call(this, options);

        this.ionData = {
            endpoint: endpoint,
            _endpointResource: endpointResource,
            _pendingPromise: undefined,
            _root: this
        };
    }

    CesiumIonResource.create = function(endpoint, endpointResource) {
        var options = {
            url: endpoint.url,
            retryCallback: createRetryCallback(endpoint, endpointResource),
            retryAttempts: 1
        };

        if (defined(endpoint.accessToken)) {
            options.queryParameters = { access_token: endpoint.accessToken };
        }

        return new CesiumIonResource(options, endpoint, endpointResource);
    };

    if (defined(Object.create)) {
        CesiumIonResource.prototype = Object.create(Resource.prototype);
        CesiumIonResource.prototype.constructor = CesiumIonResource;
    }

    CesiumIonResource.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new CesiumIonResource({
                url: this._url
            });
        }
        result = Resource.prototype.clone.call(this, result);
        result.ionData = this.ionData;
        return result;
    };

    function createRetryCallback(endpoint, endpointResource) {
        return function(that, error) {
            // We only want to retry in the case of invalid credentials (401) or image
            // requests(since Image failures can not provide a status code)
            if (!defined(error) || (error.statusCode !== 401 && !(error.target instanceof Image))) {
                return when.resolve(false);
            }

            var ionData = that.ionData;

            // We use a shared pending promise for all derived assets, since they share
            // a common access_token.  If we're already requesting a new token for this
            // asset, we wait on the same promise.
            var pendingPromise = ionData._pendingPromise;
            if (!defined(pendingPromise)) {
                pendingPromise = CesiumIon._loadJson(endpointResource)
                    .then(function(endpoint) {
                        //Set the token for root resource that this (and other) resources were derived
                        ionData._root.queryParameters.access_token = endpoint.accessToken;
                        return endpoint.accessToken;
                    })
                    .always(function(accessToken) {
                        // Pass or fail, we're done with this promise, the next failure should use a new one.
                        ionData._pendingPromise = undefined;

                        // We need this return because our old busted version of when
                        // doesn't conform to spec of returning the result of the above `then`.
                        return accessToken;
                    });
                ionData._pendingPromise = pendingPromise;
            }

            return pendingPromise.then(function(accessToken) {
                // Set the new token for this resource
                that.queryParameters.access_token = accessToken;
                return true;
            });
        };
    }

    function createFactory(Type) {
        return function(options) {
            return new Type(options);
        };
    }

    // These values are the unofficial list of supported external imagery
    // assets in the Cesium ion beta. They are subject to change.
    var ImageryProviderMapping = {
        ARCGIS_MAPSERVER: createFactory(ArcGisMapServerImageryProvider),
        BING: createFactory(BingMapsImageryProvider),
        GOOGLE_EARTH: createFactory(GoogleEarthEnterpriseMapsProvider),
        MAPBOX: createFactory(MapboxImageryProvider),
        SINGLE_TILE: createFactory(SingleTileImageryProvider),
        TMS: createTileMapServiceImageryProvider,
        URL_TEMPLATE: createFactory(UrlTemplateImageryProvider),
        WMS: createFactory(WebMapServiceImageryProvider),
        WMTS: createFactory(WebMapTileServiceImageryProvider)
    };

    CesiumIonResource.prototype.createImageryProvider = function() {
        var type = this.ionData.endpoint.type;
        if (type === 'IMAGERY') {
            return createTileMapServiceImageryProvider({ url: this });
        }

        var factory = ImageryProviderMapping[type];

        if (!defined(factory)) {
            throw new RuntimeError('Unrecognized Cesium ion imagery type: ' + type);
        }

        return factory(this.ionData.endpoint);
    };

    //Exposed for testing
    CesiumIon._CesiumIonResource = CesiumIonResource;
    CesiumIon._loadJson = loadJson;
    CesiumIon._createRetryCallback = createRetryCallback;

    return CesiumIon;
});
