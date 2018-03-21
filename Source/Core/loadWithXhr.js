define([
        '../ThirdParty/when',
        './Check',
        './defaultValue',
        './defineProperties',
        './deprecationWarning',
        './Resource'
    ], function(
        when,
        Check,
        defaultValue,
        defineProperties,
        deprecationWarning,
        Resource) {
    'use strict';

    /**
     * Asynchronously loads the given URL.  Returns a promise that will resolve to
     * the result once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
     *
     * @exports loadWithXhr
     *
     * @param {Object} options Object with the following properties:
     * @param {Resource|String} options.url The URL of the data.
     * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
     * @param {String} [options.method='GET'] The HTTP method to use.
     * @param {String} [options.data] The data to send with the request, if any.
     * @param {Object} [options.headers] HTTP headers to send with the request, if any.
     * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
     * @param {Request} [options.request] The request object.
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
     *
     * @deprecated
     */
    function loadWithXhr(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options', options);
        //>>includeEnd('debug');

        deprecationWarning('loadWithXhr', 'loadWithXhr is deprecated and will be removed in Cesium 1.44. Please use Resource.fetch instead.');

        // Take advantage that most parameters are the same
        var resource = new Resource(options);

        return resource._makeRequest({
            responseType: options.responseType,
            overrideMimeType: options.overrideMimeType,
            method: defaultValue(options.method, 'GET'),
            data: options.data
        });
    }

    defineProperties(loadWithXhr, {
        load : {
            get : function() {
                return Resource._Implementations.loadWithXhr;
            },
            set : function(value) {
                Resource._Implementations.loadWithXhr = value;
            }
        },

        defaultLoad : {
            get : function() {
                return Resource._DefaultImplementations.loadWithXhr;
            }
        }
    });

    return loadWithXhr;
});
