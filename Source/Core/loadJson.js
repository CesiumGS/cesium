/*global define*/
define([
        './clone',
        './defaultValue',
        './loadText',
        './DeveloperError'
    ], function(
        clone,
        defaultValue,
        loadText,
        DeveloperError) {
    "use strict";

    /**
     * Asynchronously loads the given URL as JSON.  Returns a promise that will resolve to
     * a JSON object once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. This function
     * always adds 'Accept: application/json' to the request headers.
     *
     * @exports loadJson
     *
     * @param {String|Promise} url The URL to request, or a promise for the URL.
     * @param {Object} [headers] HTTP headers to send with the request.
     * 'Accept: application/json' is added to the request headers automatically
     * and does not need to be specified.
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @exception {DeveloperError} url is required.
     *
     * @example
     * loadJson('http://someUrl.com/someJson.txt').then(function(jsonData) {
     *     //Do something with the JSON object
     * }, function() {
     *     // an error occurred
     * });
     *
     * @see loadText
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     */
    var loadJson = function loadJson(url, headers) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        // make a copy of headers to allow us to change values before passing to computeVertices
        headers = clone(defaultValue(headers, defaultValue.EMPTY_OBJECT));
        headers.Accept = 'application/json';

        return loadText(url, headers).then(function(value) {
            return JSON.parse(value);
        });
    };

    return loadJson;
});