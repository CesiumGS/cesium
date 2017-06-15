/*global define*/
define([
        '../ThirdParty/when',
        './Check',
        './defaultValue',
        './defined',
        './deprecationWarning',
        './DeveloperError',
        './isCrossOriginUrl',
        './isDataUri',
        './Request',
        './RequestScheduler',
        './TrustedServers'
    ], function(
        when,
        Check,
        defaultValue,
        defined,
        deprecationWarning,
        DeveloperError,
        isCrossOriginUrl,
        isDataUri,
        Request,
        RequestScheduler,
        TrustedServers) {
    'use strict';

    /**
     * Asynchronously loads the given image URL.  Returns a promise that will resolve to
     * an {@link Image} once loaded, or reject if the image failed to load.
     *
     * @exports loadImage
     *
     * @param {String} url The source URL of the image.
     * @param {Boolean} [allowCrossOrigin=true] Whether to request the image using Cross-Origin
     *        Resource Sharing (CORS).  CORS is only actually used if the image URL is actually cross-origin.
     *        Data URIs are never requested using CORS.
     * @param {Request} [request] The request object. Intended for internal use only.
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
    function loadImage(url, allowCrossOrigin, request) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('url', url);
        //>>includeEnd('debug');

        allowCrossOrigin = defaultValue(allowCrossOrigin, true);

        if (typeof url !== 'string') {
            // Returning a promise here is okay because it is unlikely that anyone using the deprecated functionality is also
            // providing a Request object marked as throttled.
            deprecationWarning('url promise', 'url as a Promise is deprecated and will be removed in 1.37');
            return url.then(function(url) {
                return makeRequest(url, allowCrossOrigin, request);
            });
        }

        return makeRequest(url, allowCrossOrigin, request);
    }

    function makeRequest(url, allowCrossOrigin, request) {
        request = defined(request) ? request : new Request();
        request.url = url;
        request.requestFunction = function() {
            var crossOrigin;

            // data URIs can't have allowCrossOrigin set.
            if (isDataUri(url) || !allowCrossOrigin) {
                crossOrigin = false;
            } else {
                crossOrigin = isCrossOriginUrl(url);
            }

            var deferred = when.defer();

            loadImage.createImage(url, crossOrigin, deferred);

            return deferred.promise;
        };

        return RequestScheduler.request(request);
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
