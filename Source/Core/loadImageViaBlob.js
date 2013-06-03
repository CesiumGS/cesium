/*global define,Blob*/
define([
        './loadBlob',
        './loadImage'
    ], function(
        loadBlob,
        loadImage) {
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
    var loadImageViaBlob = function(url) {
        return loadBlob(url).then(function(blob){
            var blobUrl = window.URL.createObjectURL(blob);

            return loadImage(blobUrl, false).then(function(image) {
                image.blob = blob;
                window.URL.revokeObjectURL(blobUrl);
                return image;
            }, function(e) {
                window.URL.revokeObjectURL(blobUrl);
                return e;
            });

        });
    };

    var xhrBlobSupported = (function() {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        return xhr.responseType === 'blob';
    })();

    return xhrBlobSupported ? loadImageViaBlob : loadImage;
});
