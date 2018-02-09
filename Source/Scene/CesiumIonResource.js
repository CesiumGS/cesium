define([
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/loadJson',
        '../Core/Resource',
        '../Core/RuntimeError',
        '../ThirdParty/when',
        './ArcGisMapServerImageryProvider',
        './BingMapsImageryProvider',
        './createTileMapServiceImageryProvider',
        './GoogleEarthEnterpriseMapsProvider',
        './MapboxImageryProvider',
        './SingleTileImageryProvider',
        './UrlTemplateImageryProvider',
        './WebMapServiceImageryProvider',
        './WebMapTileServiceImageryProvider'
    ], function(
        Check,
        defaultValue,
        defined,
        loadJson,
        Resource,
        RuntimeError,
        when,
        ArcGisMapServerImageryProvider,
        BingMapsImageryProvider,
        createTileMapServiceImageryProvider,
        GoogleEarthEnterpriseMapsProvider,
        MapboxImageryProvider,
        SingleTileImageryProvider,
        UrlTemplateImageryProvider,
        WebMapServiceImageryProvider,
        WebMapTileServiceImageryProvider) {
'use strict';

    /**
     * A {@link Resource} instance that encapsulates Cesium ion asset
     * creation and automatic refresh token handling. This object
     * should not be created directly, use CesiumIonResource.create.
     *
     * @private
     */
    function CesiumIonResource(options, endpoint, endpointResource) {
        Resource.call(this, options);

        // The asset endpoint data returned from ion.
        this.ionEndpoint = endpoint;

        // The endpoint resource to fetch when a new token is needed
        this.ionEndpointResource = endpointResource;

        // The primary CesiumIonResource from which an instance is derived
        this.ionRoot = undefined;
    }

    CesiumIonResource.create = function (endpoint, endpointResource) {
        var options = {
            url: endpoint.url,
            retryAttempts: 1,
            queryParameters: { access_token: endpoint.accessToken },
            retryCallback: createRetryCallback(endpoint, endpointResource)
        };

        return new CesiumIonResource(options, endpoint, endpointResource);
    };

    if (defined(Object.create)) {
        CesiumIonResource.prototype = Object.create(Resource.prototype);
        CesiumIonResource.prototype.constructor = CesiumIonResource;
    }

    CesiumIonResource.prototype.clone = function(result) {
        // We always want to use the root's information because it's the most up-to-date
        var ionRoot = defaultValue(this.ionRoot, this);

        if (!defined(result)) {
            result = new CesiumIonResource({ url: this._url }, ionRoot.ionEndpoint, ionRoot.ionEndpointResource);
        }

        result = Resource.prototype.clone.call(this, result);
        result.ionRoot = ionRoot;
        result.queryParameters.access_token = ionRoot.queryParameters.access_token;
        return result;
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
                pendingPromise = CesiumIonResource._loadJson(endpointResource)
                    .then(function(newEndpoint) {
                        //Set the token for root resource so derived resources automatically pick it up
                        var ionRoot = that.ionRoot;
                        if (defined(ionRoot)) {
                            ionRoot.ionEndpoint = newEndpoint;
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
                that.ionEndpoint = newEndpoint;
                that.queryParameters.access_token = newEndpoint.accessToken;
                return true;
            });
        };

        //Exposed for testing
        retryCallback._pendingPromise = pendingPromise;

        return retryCallback;
    }

    CesiumIonResource._CesiumIonResource = CesiumIonResource;
    CesiumIonResource._createRetryCallback = createRetryCallback;
    CesiumIonResource._loadJson = loadJson;

    return CesiumIonResource;
});
