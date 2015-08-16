/*global define*/
define([
    '../ThirdParty/when'
], function (
    when
) {
    "use strict";
    /**
     * Asynchronously loads the given image URL.  Returns a promise that will resolve to
     * an {@link Image} once loaded, or reject if the image failed to load.
     *
     * @exports loadImageViaCallback
     *
     * @param {String|Promise} url The source of the image, or a promise for the URL.
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     *
     * @example
     * // load a single image asynchronously
     * Cesium.loadImageViaCallback('some/image/url.png').then(function(image) {
     *     // use the loaded image
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * // load several images in parallel
     * when.all([loadImageViaCallback('image1.png'), loadImageViaCallback('image2.png')]).then(function(images) {
     *     // images is an array containing all the loaded images
     * });
     */
    var loadImageViaCallback = function (onSrcReady) {
        return when(onSrcReady, function (onSrcReady) {
            var deferred = when.defer();
            onSrcReady(function (srcString) {
                loadImageViaCallback.createImage(srcString, deferred);
            });
            return deferred.promise;
        });
    };

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    loadImageViaCallback.createImage = function (srcString, deferred) {
        var image = new Image();
        image.src = srcString;
        image.onload = function (e) {
            deferred.resolve(image);
        };

        image.onerror = function (e) {
            deferred.reject(e);
        };
    };

    loadImageViaCallback.defaultCreateImage = loadImageViaCallback.createImage;
    return loadImageViaCallback;
});