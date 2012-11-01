/*global define*/
define([
        './DeveloperError',
        '../ThirdParty/when'
    ], function(
        DeveloperError,
        when) {
    "use strict";

    /**
     * Asynchronously loads the given URL as raw binary data.  Returns a promise that will resolve to
     * an ArrayBuffer once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadArrayBuffer
     *
     * @param {String|Promise} url The URL of the binary data, or a promise for the URL.
     * @param {Object} [headers] HTTP headers to send with the requests.
     *
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     *
     * @example
     * // load a single URL asynchronously
     * loadArrayBuffer('some/url').then(function(arrayBuffer) {
     *     // use the data
     * }, function() {
     *     // an error occurred
     * });
     */
    var loadArrayBuffer = function(url, headers) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        return when(url, function(url) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);

            if (typeof headers !== 'undefined') {
                for ( var key in headers) {
                    if (headers.hasOwnProperty(key)) {
                        xhr.setRequestHeader(key, headers[key]);
                    }
                }
            }

            xhr.responseType = 'arraybuffer';

            var deferred = when.defer();

            xhr.onload = function(e) {
                if (xhr.status === 200) {
                    deferred.resolve(xhr.response);
                } else {
                    deferred.reject(e);
                }
            };

            xhr.onerror = function(e) {
                deferred.reject(e);
            };

            xhr.send();

            return deferred.promise;
        });
    };

    return loadArrayBuffer;
});