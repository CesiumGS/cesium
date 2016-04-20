/*global define*/
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
     * @param {String|Promise.<String>} url The URL of the binary data, or a promise for the URL.
     * @param {Object} [headers] HTTP headers to send with the requests.
     * @returns {Promise.<ArrayBuffer>} a promise that will resolve to the requested data when loaded.
     *
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
    function loadArrayBuffer(url, headers) {
        return loadWithXhr({
            url : url,
            responseType : 'arraybuffer',
            headers : headers
        });
    }

    return loadArrayBuffer;
});
