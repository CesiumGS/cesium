/*global define*/
define([
        './defined',
        './DeveloperError',
        './RequestErrorEvent',
        '../ThirdParty/when'
    ], function(
        defined,
        DeveloperError,
        RequestErrorEvent,
        when) {
    "use strict";

    /**
     * Asynchronously loads the given URL.  Returns a promise that will resolve to
     * the result once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadWithXhr
     *
     * @param {String|Promise} url The URL of the data, or a promise for the URL.
     * @param {String} responseType The type of response.  This controls the type of item returned.
     * @param {Object} [headers] HTTP headers to send with the requests.
     *
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     *
     * @see loadArrayBuffer
     * @see loadBlob
     * @see loadText
     *
     * @example
     * // load a single URL asynchronously
     * loadWithXhr('some/url', 'blob').then(function(blob) {
     *     // use the data
     * }, function() {
     *     // an error occurred
     * });
     */
    var loadWithXhr = function(url, responseType, headers) {
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }

        return when(url, function(url) {
            var deferred = when.defer();

            loadWithXhr.load(url, responseType, headers, deferred);

            return deferred.promise;
        });
    };

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    loadWithXhr.load = function(url, responseType, headers, deferred) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        if (defined(headers)) {
            for ( var key in headers) {
                if (headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, headers[key]);
                }
            }
        }

        if (defined(responseType)) {
            xhr.responseType = responseType;
        }

        xhr.onload = function(e) {
            if (xhr.status === 200) {
                deferred.resolve(xhr.response);
            } else {
                deferred.reject(new RequestErrorEvent(xhr.status, xhr.response));
            }
        };

        xhr.onerror = function(e) {
            deferred.reject(new RequestErrorEvent());
        };

        xhr.send();
    };

    loadWithXhr.defaultLoad = loadWithXhr.load;

    return loadWithXhr;
});