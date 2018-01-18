define([
        './Check',
        './defined',
        './deprecationWarning',
        './loadWithXhr',
        './Resource'
    ], function(
        Check,
        defined,
        deprecationWarning,
        loadWithXhr,
        Resource) {
    'use strict';

    /**
     * Asynchronously loads the given URL as text.  Returns a promise that will resolve to
     * a String once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadText
     *
     * @param {Resource|String} urlOrResource The URL to request.
     * @returns {Promise.<String>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     *
     * @example
     * // load text from a URL, setting a custom header
     * var resource = new Resource({
     *   url: 'http://someUrl.com/someJson.txt',
     *   headers: {
     *     'X-Custom-Header' : 'some value'
     *   }
     * });
     * Cesium.loadText(resource).then(function(text) {
     *     // Do something with the text
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest|XMLHttpRequest}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadText(urlOrResource, headers, request) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('urlOrResource', urlOrResource);
        //>>includeEnd('debug');

        if (defined(headers)) {
            deprecationWarning('loadText.headers', 'The headers parameter has been deprecated. Set the headers property on the Resource parameter.');
        }

        if (defined(request)) {
            deprecationWarning('loadText.request', 'The request parameter has been deprecated. Set the request property on the Resource parameter.');
        }

        var resource = Resource.createIfNeeded(urlOrResource, {
            headers: headers,
            request: request
        });

        return loadWithXhr(resource);
    }

    return loadText;
});
