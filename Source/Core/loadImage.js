/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        DeveloperError,
        when) {
    "use strict";

    var dataUriRegex = /^data:/;

    /**
     * Asynchronously loads the given image URL.  Returns a promise that will resolve to
     * an {@link Image} once loaded, or reject if the image failed to load.
     *
     * @exports loadImage
     *
     * @param {String} url The source of the image.
     * @param {Boolean} [crossOrigin=true] Whether to request the image using Cross-Origin
     * Resource Sharing (CORS).  Data URIs are never requested using CORS.
     *
     * @returns {Object} a promise that will resolve to the requested data when loaded.
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
    var loadImage = function(url, crossOrigin) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        crossOrigin = defaultValue(crossOrigin, true);

        // data URIs can't have crossOrigin set.
        if (dataUriRegex.test(url)) {
            crossOrigin = false;
        }

        var deferred = when.defer();
        var image = new Image();

        if (crossOrigin) {
            image.crossOrigin = '';
        }

        image.onload = function(e) {
            deferred.resolve(image);
        };

        image.onerror = function(e) {
            deferred.reject();
        };

        image.src = url;

        return deferred.promise;
    };

    return loadImage;
});