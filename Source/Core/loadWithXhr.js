/*global define*/
define([
        './defined',
        './defaultValue',
        './DeveloperError',
        './RequestErrorEvent',
        '../ThirdParty/when'
    ], function(
        defined,
        defaultValue,
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
     * @param {Object} options Options for the request.
     * @param {String|Promise} options.url The URL of the data, or a promise for the URL.
     * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
     * @param {String} [options.method='GET'] The HTTP method to use.
     * @param {String} [options.data] The data to send with the request, if any.
     * @param {Object} [options.headers] HTTP headers to send with the request, if any.
     *
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @exception {DeveloperError} options.url is required.
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     *
     * @see loadArrayBuffer
     * @see loadBlob
     * @see loadJson
     * @see loadText
     *
     * @example
     * // Load a single URL asynchronously. In real code, you should use loadBlob instead.
     * loadWithXhr({
     *     url : 'some/url',
     *     responseType : 'blob'
     * }).then(function(blob) {
     *     // use the data
     * }, function() {
     *     // an error occurred
     * });
     */
    var loadWithXhr = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }

        var responseType = options.responseType;
        var method = defaultValue(options.method, 'GET');
        var data = options.data;
        var headers = options.headers;

        return when(options.url, function(url) {
            var deferred = when.defer();

            loadWithXhr.load(url, responseType, method, data, headers, deferred);

            return deferred.promise;
        });
    };

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);

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

        xhr.send(data);
    };

    loadWithXhr.defaultLoad = loadWithXhr.load;

    return loadWithXhr;
});