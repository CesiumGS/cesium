define([
        '../ThirdParty/when',
        './Check',
        './clone',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Request',
        './RequestErrorEvent',
        './RequestScheduler',
        './RequestState',
        './Resource',
        './RuntimeError',
        './TrustedServers'
    ], function(
        when,
        Check,
        clone,
        defaultValue,
        defined,
        DeveloperError,
        Request,
        RequestErrorEvent,
        RequestScheduler,
        RequestState,
        Resource,
        RuntimeError,
        TrustedServers) {
    'use strict';

    /**
     * Asynchronously loads the given URL.  Returns a promise that will resolve to
     * the result once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadWithXhr
     *
     * @param {Resource|Object} optionsOrResource Object with the following properties:
     * @param {String} optionsOrResource.url The URL of the data.
     * @param {String} [optionsOrResource.responseType] The type of response.  This controls the type of item returned.
     * @param {String} [optionsOrResource.method='GET'] The HTTP method to use.
     * @param {String} [optionsOrResource.data] The data to send with the request, if any.
     * @param {Object} [optionsOrResource.headers] HTTP headers to send with the request, if any.
     * @param {String} [optionsOrResource.overrideMimeType] Overrides the MIME type returned by the server.
     * @param {Request} [optionsOrResource.request] The request object.
     * @returns {Promise.<Object>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     *
     * @example
     * // Load a single URL asynchronously. In real code, you should use loadBlob instead.
     * Cesium.loadWithXhr({
     *     url : 'some/url',
     *     responseType : 'blob'
     * }).then(function(blob) {
     *     // use the data
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * @see loadArrayBuffer
     * @see loadBlob
     * @see loadJson
     * @see loadText
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */

    function loadWithXhr(optionsOrResource) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('optionsOrResource', optionsOrResource);
        //>>includeEnd('debug');

        var resource;
        if (optionsOrResource instanceof Resource) {
            resource = optionsOrResource.clone();
        } else {
            // Take advantage that the options are the same
            resource = new Resource(optionsOrResource);
        }

        if (!defined(resource.request)) {
            resource.request = new Request();
        }

        return makeRequest(resource);
    }

    function makeRequest(optionsOrResource) {
        var request = optionsOrResource.request;
        request.url = optionsOrResource.url;

        request.requestFunction = function() {
            var responseType = optionsOrResource.responseType;
            var method = optionsOrResource.method;
            var data = optionsOrResource.data;
            var headers = optionsOrResource.headers;
            var overrideMimeType = optionsOrResource.overrideMimeType;
            var deferred = when.defer();
            var xhr = loadWithXhr.load(optionsOrResource.url, responseType, method, data, headers, deferred, overrideMimeType);
            if (defined(xhr) && defined(xhr.abort)) {
                request.cancelFunction = function() {
                    xhr.abort();
                };
            }
            return deferred.promise;
        };

        var promise = RequestScheduler.request(request);
        if (!defined(promise)) {
            return;
        }

        return promise
            .then(function(data) {
                return data;
            })
            .otherwise(function(e) {
                if ((request.state !== RequestState.FAILED) || !defined(optionsOrResource.retryOnError)) {
                    return when.reject(e);
                }

                return optionsOrResource.retryOnError(e)
                    .then(function(retry) {
                        if (retry) {
                            // Reset request so it can try again
                            request.state = RequestState.UNISSUED;
                            request.deferred = undefined;

                            return makeRequest(optionsOrResource);
                        }

                        return when.reject(e);
                    });
            });
    }

    var dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;

    function decodeDataUriText(isBase64, data) {
        var result = decodeURIComponent(data);
        if (isBase64) {
            return atob(result);
        }
        return result;
    }

    function decodeDataUriArrayBuffer(isBase64, data) {
        var byteString = decodeDataUriText(isBase64, data);
        var buffer = new ArrayBuffer(byteString.length);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < byteString.length; i++) {
            view[i] = byteString.charCodeAt(i);
        }
        return buffer;
    }

    function decodeDataUri(dataUriRegexResult, responseType) {
        responseType = defaultValue(responseType, '');
        var mimeType = dataUriRegexResult[1];
        var isBase64 = !!dataUriRegexResult[2];
        var data = dataUriRegexResult[3];

        switch (responseType) {
            case '':
            case 'text':
                return decodeDataUriText(isBase64, data);
            case 'arraybuffer':
                return decodeDataUriArrayBuffer(isBase64, data);
            case 'blob':
                var buffer = decodeDataUriArrayBuffer(isBase64, data);
                return new Blob([buffer], {
                    type : mimeType
                });
            case 'document':
                var parser = new DOMParser();
                return parser.parseFromString(decodeDataUriText(isBase64, data), mimeType);
            case 'json':
                return JSON.parse(decodeDataUriText(isBase64, data));
            default:
                //>>includeStart('debug', pragmas.debug);
                throw new DeveloperError('Unhandled responseType: ' + responseType);
                //>>includeEnd('debug');
        }
    }

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
        var dataUriRegexResult = dataUriRegex.exec(url);
        if (dataUriRegexResult !== null) {
            deferred.resolve(decodeDataUri(dataUriRegexResult, responseType));
            return;
        }

        var xhr = new XMLHttpRequest();

        if (TrustedServers.contains(url)) {
            xhr.withCredentials = true;
        }

        if (defined(overrideMimeType) && defined(xhr.overrideMimeType)) {
            xhr.overrideMimeType(overrideMimeType);
        }

        xhr.open(method, url, true);

        if (defined(headers)) {
            for (var key in headers) {
                if (headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, headers[key]);
                }
            }
        }

        if (defined(responseType)) {
            xhr.responseType = responseType;
        }

        // While non-standard, file protocol always returns a status of 0 on success
        var localFile = false;
        if (typeof url === 'string') {
            localFile = url.indexOf('file://') === 0;
        }

        xhr.onload = function() {
            if ((xhr.status < 200 || xhr.status >= 300) && !(localFile && xhr.status === 0)) {
                deferred.reject(new RequestErrorEvent(xhr.status, xhr.response, xhr.getAllResponseHeaders()));
                return;
            }

            var response = xhr.response;
            var browserResponseType = xhr.responseType;

            //All modern browsers will go into either the first or second if block or last else block.
            //Other code paths support older browsers that either do not support the supplied responseType
            //or do not support the xhr.response property.
            if (xhr.status === 204) {
                // accept no content
                deferred.resolve();
            } else if (defined(response) && (!defined(responseType) || (browserResponseType === responseType))) {
                deferred.resolve(response);
            } else if ((responseType === 'json') && typeof response === 'string') {
                try {
                    deferred.resolve(JSON.parse(response));
                } catch (e) {
                    deferred.reject(e);
                }
            } else if ((browserResponseType === '' || browserResponseType === 'document') && defined(xhr.responseXML) && xhr.responseXML.hasChildNodes()) {
                deferred.resolve(xhr.responseXML);
            } else if ((browserResponseType === '' || browserResponseType === 'text') && defined(xhr.responseText)) {
                deferred.resolve(xhr.responseText);
            } else {
                deferred.reject(new RuntimeError('Invalid XMLHttpRequest response type.'));
            }
        };

        xhr.onerror = function(e) {
            deferred.reject(new RequestErrorEvent());
        };

        xhr.send(data);

        return xhr;
    };

    loadWithXhr.defaultLoad = loadWithXhr.load;

    return loadWithXhr;
});
