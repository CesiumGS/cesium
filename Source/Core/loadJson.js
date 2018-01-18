define([
        './clone',
        './defined',
        './deprecationWarning',
        './DeveloperError',
        './loadText',
        './Resource'
    ], function(
        clone,
        defined,
        deprecationWarning,
        DeveloperError,
        loadText,
        Resource) {
    'use strict';

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
     * @param {Resource|String} urlOrResource The URL to request.
     * @returns {Promise.<Object>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     *
     * @example
     * Cesium.loadJson('http://someUrl.com/someJson.txt').then(function(jsonData) {
     *     // Do something with the JSON object
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * @see loadText
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadJson(urlOrResource, headers, request) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(urlOrResource)) {
            throw new DeveloperError('urlOrResource is required.');
        }
        //>>includeEnd('debug');

        if (defined(headers)) {
            deprecationWarning('loadJson.headers', 'The headers parameter has been deprecated. Set the headers property on the Resource parameter.');
        }

        if (defined(request)) {
            deprecationWarning('loadJson.request', 'The request parameter has been deprecated. Set the request property on the Resource parameter.');
        }

        var resource = Resource.createIfNeeded(urlOrResource, {
            headers: headers,
            request: request
        });

        resource.headers.Accept = defaultHeaders.Accept;

        var textPromise = loadText(resource);
        if (!defined(textPromise)) {
            return undefined;
        }

        return textPromise.then(function(value) {
            if (!defined(value)) {
                return;
            }
            return JSON.parse(value);
        });
    }

    return loadJson;
});
