define([
        '../ThirdParty/when',
        './Check',
        './defaultValue',
        './defined',
        './deprecationWarning',
        './isBlobUri',
        './isCrossOriginUrl',
        './isDataUri',
        './Request',
        './RequestScheduler',
        './RequestState',
        './Resource',
        './TrustedServers'
    ], function(
        when,
        Check,
        defaultValue,
        defined,
        deprecationWarning,
        isBlobUri,
        isCrossOriginUrl,
        isDataUri,
        Request,
        RequestScheduler,
        RequestState,
        Resource,
        TrustedServers) {
    'use strict';

    /**
     * Asynchronously loads the given image URL.  Returns a promise that will resolve to
     * an {@link Image} once loaded, or reject if the image failed to load.
     *
     * @exports loadImage
     *
     * @param {Resource|String} urlOrResource The source URL of the image.
     * @returns {Promise.<Image>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     *
     * @example
     * // load a single image asynchronously
     * Cesium.loadImage('some/image/url.png').then(function(image) {
     *     // use the loaded image
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * // load several images in parallel
     * when.all([loadImage('image1.png'), loadImage('image2.png')]).then(function(images) {
     *     // images is an array containing all the loaded images
     * });
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadImage(urlOrResource, allowCrossOrigin, request) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('urlOrResource', urlOrResource);
        //>>includeEnd('debug');

        if (defined(allowCrossOrigin)) {
            deprecationWarning('loadImage.allowCrossOrigin', 'The allowCrossOrigin parameter has been deprecated. It no longer needs to be specified.');
        }

        if (defined(request)) {
            deprecationWarning('loadImage.request', 'The request parameter has been deprecated. Set the request property on the Resource parameter.');
        }

        // If the user specifies the request we should use it, not a cloned version, (createIfNeeded will clone the Resource).
        request = defaultValue(urlOrResource.request, request);

        var resource = Resource.createIfNeeded(urlOrResource, {
            request: request
        });
        resource.request = defaultValue(resource.request, new Request());

        return makeRequest(resource, defaultValue(allowCrossOrigin, true));
    }

    function makeRequest(resource, allowCrossOrigin) {
        var request = resource.request;
        request.url = resource.url;
        request.requestFunction = function() {
            var crossOrigin;
            var url = resource.url;

            // data URIs can't have allowCrossOrigin set.
            if (isDataUri(url) || isBlobUri(url)) {
                crossOrigin = false;
            } else {
                crossOrigin = isCrossOriginUrl(url);
            }

            var deferred = when.defer();

            loadImage.createImage(url, crossOrigin && allowCrossOrigin, deferred);

            return deferred.promise;
        };

        var promise = RequestScheduler.request(request);
        if (!defined(promise)) {
            return;
        }

        return promise
            .otherwise(function(e) {
                //Don't retry cancelled or otherwise aborted requests
                if (request.state !== RequestState.FAILED) {
                    return when.reject(e);
                }

                return resource.retryOnError(e)
                    .then(function(retry) {
                        if (retry) {
                            // Reset request so it can try again
                            request.state = RequestState.UNISSUED;
                            request.deferred = undefined;

                            return makeRequest(resource, allowCrossOrigin);
                        }
                        return when.reject(e);
                    });
            });
    }

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    loadImage.createImage = function(url, crossOrigin, deferred) {
        var image = new Image();

        image.onload = function() {
            deferred.resolve(image);
        };

        image.onerror = function(e) {
            deferred.reject(e);
        };

        if (crossOrigin) {
            if (TrustedServers.contains(url)) {
                image.crossOrigin = 'use-credentials';
            } else {
                image.crossOrigin = '';
            }
        }

        image.src = url;
    };

    loadImage.defaultCreateImage = loadImage.createImage;

    return loadImage;
});
