define([
        './Check',
        './defined',
        './deprecationWarning',
        './Resource'
    ], function(
        Check,
        defined,
        deprecationWarning,
        Resource) {
    'use strict';

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
     * @param {Resource|String} urlOrResource The source URL of the image.
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
     *
     * @deprecated
     */
    function loadImageViaBlob(urlOrResource, request) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('urlOrResource', urlOrResource);
        //>>includeEnd('debug');

        deprecationWarning('loadImageViaBlob', 'loadImageViaBlob is deprecated and will be removed in Cesium 1.44. Please use Resource.fetchImage instead.');

        var resource = Resource.createIfNeeded(urlOrResource, {
            request: request
        });

        return resource.fetchImage(true);
    }

    return loadImageViaBlob;
});
