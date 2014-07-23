/*global define*/
define([
        './loadWithXhr'
    ], function(
        loadWithXhr) {
    "use strict";

    /**
     * Asynchronously loads the given URL as a blob.  Returns a promise that will resolve to
     * a Blob once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadBlob
     *
     * @param {String|Promise} url The URL of the data, or a promise for the URL.
     * @param {Object} [headers] HTTP headers to send with the requests.
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     *
     * @example
     * // load a single URL asynchronously
     * Cesium.loadBlob('some/url').then(function(blob) {
     *     // use the data
     * }.otherwise(function(error) {
     *     // an error occurred
     * });
     */
    var loadBlob = function(url, headers) {
        return loadWithXhr({
            url : url,
            responseType : 'blob',
            headers : headers
        });
    };

    return loadBlob;
});