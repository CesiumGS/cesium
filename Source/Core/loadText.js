/*global define*/
define([
        './loadWithXhr'
    ], function(
        loadWithXhr) {
    'use strict';

    /**
     * Asynchronously loads the given URL as text.  Returns a promise that will resolve to
     * a String once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadText
     *
     * @param {String|Promise.<String>} url The URL to request, or a promise for the URL.
     * @param {Object} [headers] HTTP headers to send with the request.
     * @returns {Promise.<String>} a promise that will resolve to the requested data when loaded.
     *
     *
     * @example
     * // load text from a URL, setting a custom header
     * Cesium.loadText('http://someUrl.com/someJson.txt', {
     *   'X-Custom-Header' : 'some value'
     * }).then(function(text) {
     *     // Do something with the text
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     * 
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest|XMLHttpRequest}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadText(url, headers) {
        return loadWithXhr({
            url : url,
            headers : headers
        });
    }

    return loadText;
});
