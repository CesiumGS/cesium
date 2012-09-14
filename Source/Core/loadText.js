/*global define*/
define([
        './DeveloperError',
        '../ThirdParty/when'
    ], function(
        DeveloperError,
        when) {
    "use strict";

    /**
     * Asynchronously loads the given URL as text.  Returns a promise that will resolve to
     * a String once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadText
     *
     * @param {String|Promise} url The URL to request, or a promise for the URL.
     * @param {Object} [headers] HTTP headers to send with the request.
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @exception {DeveloperError} url is required.
     *
     * @example
     * // load text from a URL, setting a custom header
     * loadText('http://someUrl.com/someJson.txt', {
     *   'X-Custom-Header' : 'some value'
     * }).then(function(text) {
     *     //Do something with the text
     * }, function() {
     *     // an error occurred
     * });
     *
     * @see <a href="http://en.wikipedia.org/wiki/XMLHttpRequest">XMLHttpRequest</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     */
    var loadText = function(url, headers) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        return when(url, function(url) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);

            if (typeof headers !== 'undefined') {
                for ( var key in headers) {
                    if (headers.hasOwnProperty(key)) {
                        xhr.setRequestHeader(key, headers[key]);
                    }
                }
            }

            var deferred = when.defer();

            xhr.onload = function(e) {
                deferred.resolve(xhr.response);
            };

            xhr.onerror = function(e) {
                deferred.reject(e);
            };

            xhr.send();

            return deferred.promise;
        });
    };

    return loadText;
});