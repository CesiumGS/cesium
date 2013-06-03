/*global define,Blob*/
define([
        './defaultValue',
        './DeveloperError',
        './RequestErrorEvent',
        './isCrossOriginUrl',
        './loadImage',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        DeveloperError,
        RequestErrorEvent,
        isCrossOriginUrl,
        loadImage,
        when) {
    "use strict";

    /**
     * Asynchronously loads the given image URL by first downloading it using
     * XMLHttpRequest and then loading the image from the buffer via a blob URL.
     * This allows access to more information that is not accessible via normal
     * Image-based downloading, such as response headers.  This function
     * returns a promise that will resolve to
     * an {@link Image} once loaded, or reject if the image failed to load.  The
     * returned image will have a "xhr" property with the XMLHttpRequest
     * that was used to download the buffer.
     *
     * @exports loadImageViaBlob
     *
     * @param {String|Promise} url The source of the image, or a promise for the URL.
     *
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     *
     * @example
     * // load a single image asynchronously
     * loadImageViaBlob('some/image/url.png').then(function(image) {
     *     var xhr = image.xhr;
     *     // use the loaded image or XHR
     * }, function() {
     *     // an error occurred
     * });
     *
     * // load several images in parallel
     * when.all([loadImageViaBlob('image1.png'), loadImageViaBlob('image2.png')]).then(function(images) {
     *     // images is an array containing all the loaded images
     * });
     */
    var loadImageViaBlob = function(url, allowCrossOrigin) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        return when(url, function(url) {
            if (typeof url === 'undefined') {
                return undefined;
            }

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';

            var deferred = when.defer();
            var promise = deferred.promise;

            var blobUrl;
            xhr.onload = function(e) {
                if (xhr.status === 200) {
                    var blob = new Blob([xhr.response], {type:xhr.getResponseHeader('Content-Type')});
                    blobUrl = window.URL.createObjectURL(blob);

                    when(promise, function(image) {
                        image.xhr = xhr;
                        window.URL.revokeObjectURL(blobUrl);
                    }, function() {
                        window.URL.revokeObjectURL(blobUrl);
                    });

                    loadImage.createImage(url, true, deferred);
                } else {
                    deferred.reject(new RequestErrorEvent(xhr.status, xhr.response));
                }
            };
            xhr.onerror = function(e) {
                deferred.reject(new RequestErrorEvent());
            };

            xhr.send();

            return promise;
        });
    };

    return loadImageViaBlob;
});
