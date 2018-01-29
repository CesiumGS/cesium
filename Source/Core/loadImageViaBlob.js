define([
        '../ThirdParty/when',
        './defined',
        './isDataUri',
        './loadBlob',
        './loadImage'
    ], function(
        when,
        defined,
        isDataUri,
        loadBlob,
        loadImage) {
    'use strict';

    var xhrBlobSupported = (function() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '#', true);
            xhr.responseType = 'blob';
            return xhr.responseType === 'blob';
        } catch (e) {
            return false;
        }
    })();

    /**
     * Asynchronously loads the given image URL by first downloading it as a blob using
     * XMLHttpRequest and then loading the image from the buffer via a blob URL.
     * This allows access to more information that is not accessible via normal
     * Image-based downloading, such as the size of the response.  This function
     * returns a promise that will resolve to
     * an {@link Image} once loaded, or reject if the image failed to load.  The
     * returned image will have a "blob" property with the Blob itself.  If the browser
     * does not support an XMLHttpRequests with a responseType of 'blob', or if the
     * provided URI is a data URI, this function is equivalent to calling {@link loadImage},
     * and the extra blob property will not be present.
     *
     * @exports loadImageViaBlob
     *
     * @param {String} url The source URL of the image.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<Image>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     *
     * @example
     * // load a single image asynchronously
     * Cesium.loadImageViaBlob('some/image/url.png').then(function(image) {
     *     var blob = image.blob;
     *     // use the loaded image or XHR
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * // load several images in parallel
     * when.all([loadImageViaBlob('image1.png'), loadImageViaBlob('image2.png')]).then(function(images) {
     *     // images is an array containing all the loaded images
     * });
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadImageViaBlob(url, request) {
        if (!xhrBlobSupported || isDataUri(url)) {
            return loadImage(url, undefined, request);
        }

        var blobPromise = loadBlob(url, undefined, request);
        if (!defined(blobPromise)) {
            return undefined;
        }

        return blobPromise.then(function(blob) {
            if (!defined(blob)) {
                return;
            }
            var blobUrl = window.URL.createObjectURL(blob);

            return loadImage(blobUrl, false).then(function(image) {
                image.blob = blob;
                window.URL.revokeObjectURL(blobUrl);
                return image;
            }, function(error) {
                window.URL.revokeObjectURL(blobUrl);
                return when.reject(error);
            });
        });
    }

    return loadImageViaBlob;
});
