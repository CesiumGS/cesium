define([
        './Check',
        './defined',
        './deprecationWarning',
        './Resource'
    ], function(
        Check,
        defined,
        deprecationWarning,
        Resource) {
    'use strict';

    /**
     * Asynchronously loads the given URL as a blob.  Returns a promise that will resolve to
     * a Blob once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadBlob
     *
     * @param {Resource|String} urlOrResource The URL of the data.
     * @param {Object} [headers] HTTP headers to send with the requests.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<Blob>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     * @example
     * // load a single URL asynchronously
     * Cesium.loadBlob('some/url').then(function(blob) {
     *     // use the data
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     *
     * @deprecated
     */
    function loadBlob(urlOrResource, headers, request) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('urlOrResource', urlOrResource);
        //>>includeEnd('debug');

        deprecationWarning('loadBlob', 'loadBlob is deprecated and will be removed in Cesium 1.44. Please use Resource.fetchBlob instead.');

        var resource = Resource.createIfNeeded(urlOrResource, {
            headers: headers,
            request: request
        });

        return resource.fetchBlob();
    }

    return loadBlob;
});
