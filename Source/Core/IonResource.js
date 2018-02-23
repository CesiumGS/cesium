define([
        './Check',
        './Credit',
        './defaultValue',
        './defined',
        './Ion',
        './Resource',
        './RuntimeError',
        '../ThirdParty/when'
    ], function(
        Check,
        Credit,
        defaultValue,
        defined,
        Ion,
        Resource,
        RuntimeError,
        when) {
'use strict';

    /**
     * A {@link Resource} instance that encapsulates Cesium ion asset access.
     * This object is normally not instantiated directly, use {@link IonResource.fromAssetId}.
     *
     * @alias IonResource
     * @constructor
     * @augments Resource
     *
     * @param {Object} endpoint The result of the Cesium ion asset endpoint service.
     * @param {Resource} endpointResource The resource used to retreive the endpoint.
     *
     * @see Ion
     * @see IonImageryProvider
     * @see createWorldTerrain
     * @see https://cesium.com
     */
    function IonResource(endpoint, endpointResource) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('endpoint', endpoint);
        Check.defined('endpointResource', endpointResource);
        //>>includeEnd('debug');

        var externalType = endpoint.externalType;
        var options;

        if (!defined(externalType)) {
            options = {
                url: endpoint.url,
                retryAttempts: 1,
                queryParameters: { access_token: endpoint.accessToken },
                retryCallback: createRetryCallback(endpoint, endpointResource)
            };
        } else if (externalType === '3DTILES' || externalType === 'STK_TERRAIN_SERVER') {
            // 3D Tiles and STK Terrain Server external assets can still be represented as an IonResource
            options = { url: endpoint.options.url };
        } else {
            //External imagery assets have additional configuration that can't be represented as a Resource
            throw new RuntimeError('Ion.createResource does not support external imagery assets; use IonImageryProvider instead.');
        }

        Resource.call(this, options);

        /**
         * Gets the credits required for attribution of the asset.
         *
         * @type {Credit[]}
         * @readonly
         */
        this.credits = endpoint.attributions.map(function(attribution) {
            return new Credit({
                text: attribution.text,
                link: attribution.url,
                imageUrl: attribution.image,
                showOnScreen: defined(attribution.collapsible) && !attribution.collapsible
            });
        });

        // The asset endpoint data returned from ion.
        this._ionEndpoint = endpoint;

        // The endpoint resource to fetch when a new token is needed
        this._ionEndpointResource = endpointResource;

        // The primary IonResource from which an instance is derived
        this._ionRoot = undefined;
    }

    if (defined(Object.create)) {
        IonResource.prototype = Object.create(Resource.prototype);
        IonResource.prototype.constructor = IonResource;
    }

    /**
     * Asynchronously creates an instance.
     *
     * @param {Number} assetId The Cesium ion asset id.
     * @param {Object} [options] An object with the following properties:
     * @param {String} [options.accessToken=Ion.defaultAccessToken] The access token to use.
     * @param {String|Resource} [options.server=Ion.defaultServer] The resource to the Cesium ion API server.
     * @returns {Promise.<IonResource>} A Promise to am instance representing the Cesium ion Asset.
     *
     * @example
     * //Load a Cesium3DTileset with asset ID of 124624234
     * viewer.scene.primitives.add(new Cesium.Cesium3DTileset({ url: Cesium.IonResource.fromAssetId(124624234) }));
     *
     * @example
     * //Load a CZML file with asset ID of 10890
     * Cesium.IonResource.fromAssetId(10890)
     *   .then(function (resource) {
     *     viewer.dataSources.add(Cesium.CzmlDataSource.load(resource));
     *   });
     */
    IonResource.fromAssetId = function(assetId, options) {
        var endpointResource = IonResource._createEndpointResource(assetId, options);

        return endpointResource.fetchJson()
            .then(function (endpoint) {
                return new IonResource(endpoint, endpointResource);
            });
    };

    /** @inheritdoc */
    IonResource.prototype.clone = function(result) {
        // We always want to use the root's information because it's the most up-to-date
        var ionRoot = defaultValue(this._ionRoot, this);

        if (!defined(result)) {
            result = new IonResource(ionRoot._ionEndpoint, ionRoot._ionEndpointResource);
        }

        result = Resource.prototype.clone.call(this, result);
        result._ionRoot = ionRoot;
        if (defined(ionRoot.queryParameters.access_token)) {
            result.queryParameters.access_token = ionRoot.queryParameters.access_token;
        }
        return result;
    };

    /**
     * @private
     */
    IonResource._createEndpointResource = function (assetId, options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('assetId', assetId);
        //>>includeEnd('debug');

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var server = defaultValue(options.server, Ion.defaultServer);
        var accessToken = defaultValue(options.accessToken, Ion.defaultAccessToken);
        server = Resource.createIfNeeded(server);

        var resourceOptions = {
            url: 'v1/assets/' + assetId + '/endpoint'
        };

        if (defined(accessToken)) {
            resourceOptions.queryParameters = { access_token: accessToken };
        }

        return server.getDerivedResource(resourceOptions);
    };

    function createRetryCallback(endpoint, endpointResource) {
        // We use a shared pending promise for all derived assets, since they share
        // a common access_token.  If we're already requesting a new token for this
        // asset, we wait on the same promise.
        var pendingPromise;

        var retryCallback = function(that, error) {
            // We only want to retry in the case of invalid credentials (401) or image
            // requests(since Image failures can not provide a status code)
            if (!defined(error) || (error.statusCode !== 401 && !(error.target instanceof Image))) {
                return when.resolve(false);
            }

            if (!defined(pendingPromise)) {
                pendingPromise = endpointResource.fetchJson()
                    .then(function(newEndpoint) {
                        //Set the token for root resource so derived resources automatically pick it up
                        var ionRoot = that._ionRoot;
                        if (defined(ionRoot)) {
                            ionRoot._ionEndpoint = newEndpoint;
                            ionRoot.queryParameters.access_token = newEndpoint.accessToken;
                        }
                        return newEndpoint;
                    })
                    .always(function(newEndpoint) {
                        // Pass or fail, we're done with this promise, the next failure should use a new one.
                        pendingPromise = undefined;

                        // We need this return because our old busted version of when
                        // doesn't conform to spec of returning the result of the above `then`.
                        return newEndpoint;
                    });
            }

            return pendingPromise.then(function(newEndpoint) {
                // Set the new token and endpoint for this resource
                that._ionEndpoint = newEndpoint;
                that.queryParameters.access_token = newEndpoint.accessToken;
                return true;
            });
        };

        //Exposed for testing
        retryCallback._pendingPromise = pendingPromise;

        return retryCallback;
    }

    //Exposed for testing
    IonResource._createRetryCallback = createRetryCallback;

    return IonResource;
});
