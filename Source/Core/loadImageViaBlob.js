/*global define*/
define([
        '../ThirdParty/when',
        './loadBlob',
        './loadImage'
    ], function(
        when,
        loadBlob,
        loadImage) {
    "use strict";

    var dataUriRegex = /^data:/;

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
     * @param {String|Promise} url The source of the image, or a promise for the URL.
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     *
     * @example
     * // load a single image asynchronously
     * Cesium.loadImageViaBlob('some/image/url.png').then(function(image) {
     *     var blob = image.blob;
     *     // use the loaded image or XHR
     * }.otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * // load several images in parallel
     * when.all([loadImageViaBlob('image1.png'), loadImageViaBlob('image2.png')]).then(function(images) {
     *     // images is an array containing all the loaded images
     * });
     */
    var loadImageViaBlob = function(url) {
        if (dataUriRegex.test(url)) {
            return loadImage(url);
        }

        return loadBlob(url).then(function(blob) {
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
    };

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

    return xhrBlobSupported ? loadImageViaBlob : loadImage;
});
