/*global define*/
define([
        './clone',
        './defined',
        './loadText',
        './DeveloperError'
    ], function(
        clone,
        defined,
        loadText,
        DeveloperError) {
    "use strict";

    var defaultHeaders = {
        Accept : 'application/json,*/*;q=0.01'
    };

    // note: &#42;&#47;&#42; below is */* but that ends the comment block early
    /**
     * Asynchronously loads the given URL as JSON.  Returns a promise that will resolve to
     * a JSON object once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. This function
     * adds 'Accept: application/json,&#42;&#47;&#42;;q=0.01' to the request headers, if not
     * already specified.
     *
     * @exports loadJson
     *
     * @param {String|Promise} url The URL to request, or a promise for the URL.
     * @param {Object} [headers] HTTP headers to send with the request.
     * 'Accept: application/json,&#42;&#47;&#42;;q=0.01' is added to the request headers automatically
     * if not specified.
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
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }

        if (!defined(headers)) {
            headers = defaultHeaders;
        } else if (!defined(headers.Accept)) {
            // clone before adding the Accept header
            headers = clone(headers);
            headers.Accept = defaultHeaders.Accept;
        }

        return loadText(url, headers).then(function(value) {
            return JSON.parse(value);
        });
    };

    return loadJson;
});