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
     * Get a promise for an image that will be loaded asynchronously.
     *
     * @param {String} url The source of the image.
     * @param {Boolean} [crossOrigin=true] Whether to request the image using CORS.
     */
    function loadImage(url, crossOrigin) {
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

        image.onload = function() {
            deferred.resolve(image);
        };
        image.onerror = function() {
            deferred.reject();
        };

        image.src = url;

        return deferred.promise;
    }

    return loadImage;
});