define([
        './loadWithXhr'
    ], function(
        loadWithXhr) {
    'use strict';

    /**
     * Asynchronously loads the given URL as raw binary data.  Returns a promise that will resolve to
     * an ArrayBuffer once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadArrayBuffer
     *
     * @param {String} url The URL of the binary data.
     * @param {Object} [headers] HTTP headers to send with the requests.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<ArrayBuffer>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     * @example
     * // load a single URL asynchronously
     * Cesium.loadArrayBuffer('some/url').then(function(arrayBuffer) {
     *     // use the data
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadArrayBuffer(url, headers, request) {
        return loadWithXhr({
            url : url,
            responseType : 'arraybuffer',
            headers : headers,
            request : request
        });
    }

    return loadArrayBuffer;
});
