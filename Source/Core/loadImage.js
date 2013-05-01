/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './isCrossOriginUrl',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        DeveloperError,
        isCrossOriginUrl,
        when) {
    "use strict";

    var dataUriRegex = /^data:/;

    /**
     * Asynchronously loads the given image URL.  Returns a promise that will resolve to
     * an {@link Image} once loaded, or reject if the image failed to load.
     *
     * @exports loadImage
     *
     * @param {String|Promise} url The source of the image, or a promise for the URL.
     * @param {Boolean} [allowCrossOrigin=true] Whether to request the image using Cross-Origin
     *        Resource Sharing (CORS).  CORS is only actually used if the image URL is actually cross-origin.
     *        Data URIs are never requested using CORS.
     *
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     *
     * @example
     * // load a single image asynchronously
     * loadImage('some/image/url.png').then(function(image) {
     *     // use the loaded image
     * }, function() {
     *     // an error occurred
     * });
     *
     * // load several images in parallel
     * when.all([loadImage('image1.png'), loadImage('image2.png')]).then(function(images) {
     *     // images is an array containing all the loaded images
     * });
     */
    var loadImage = function(url, allowCrossOrigin) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        allowCrossOrigin = defaultValue(allowCrossOrigin, true);

        return when(url, function(url) {
            var crossOrigin;

            // data URIs can't have allowCrossOrigin set.
            if (dataUriRegex.test(url) || !allowCrossOrigin) {
                crossOrigin = false;
            } else {
                crossOrigin = isCrossOriginUrl(url);
            }

            var deferred = when.defer();

            loadImage.createImage(url, crossOrigin, deferred);

            return deferred.promise;
        });
    };

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    loadImage.createImage = function(url, crossOrigin, deferred) {
        var image = new Image();

        image.onload = function(e) {
            deferred.resolve(image);
        };

        image.onerror = function(e) {
            deferred.reject(e);
        };

        if (crossOrigin) {
            image.crossOrigin = '';
        }

        image.src = url;
    };

    loadImage.defaultCreateImage = loadImage.createImage;

    return loadImage;
});
