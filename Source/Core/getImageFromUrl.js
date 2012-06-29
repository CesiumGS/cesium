/*global define*/
define(['./DeveloperError'
       ], function(
        DeveloperError) {
    "use strict";

    /**
     * Asynchronously loads the provided url into an Image.
     * @exports getImageFromUrl
     *
     * @param {String} url The url of the image to retrieve.  Both data and cross-origin urls are supported.
     * @param {Function} onLoad The function to call once the image is loaded.
     * @param {Function} [onError] The function to call if an image load error is encountered.
     * @param {Function} [onAbort] The function to call if the image load is aborted.
     *
     * @exception {DeveloperError} url is a required string parameter.
     * @exception {DeveloperError} onLoad is a required function parameter.
     * @exception {DeveloperError} onError must be a function.
     * @exception {DeveloperError} onAbort must be a function.
     *
     * @return {Image} A new Image instance with the onload, onerror, onabort, and src properties set.
     *
     * @example
     * getImageFromUrl('http://cesium.agi.com/Cesium-Logo-onBlack.jpg', function(logoImage) {
     *     //logoImage loaded and ready for use.
     * });
     */
    var getImageFromUrl = function(url, onLoad, onError, onAbort) {
        if (typeof url !== 'string') {
            throw new DeveloperError('url is a required string parameter.');
        }

        if (typeof onLoad !== 'function') {
            throw new DeveloperError('onLoad is a required function parameter.');
        }

        if (typeof onError !== 'function' && typeof onError !== 'undefined') {
            throw new DeveloperError('onError must be a function.');
        }

        if (typeof onAbort !== 'function' && typeof onError !== 'undefined') {
            throw new DeveloperError('onAbort must be a function.');
        }

        var image = new Image();
        image.onload = function() {
            onLoad(image);
        };

        if (typeof onError !== 'undefined') {
            image.onerror = function() {
                onError(image);
            };
        }

        if (typeof onAbort !== 'undefined') {
            image.onabort = function() {
                onAbort(image);
            };
        }

        //Only add the crossOrigin flag for non-data URLs
        if (url.substr(0, 5) !== 'data:') {
            image.crossOrigin = '';
        }

        image.src = url;
        return image;
    };

    return getImageFromUrl;
});