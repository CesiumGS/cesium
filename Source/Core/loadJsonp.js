define([
        './clone',
        './defined',
        './defineProperties',
        './deprecationWarning',
        './DeveloperError',
        './Resource'
    ], function(
        clone,
        defined,
        defineProperties,
        deprecationWarning,
        DeveloperError,
        Resource) {
    'use strict';

    /**
     * Requests a resource using JSONP.
     *
     * @exports loadJsonp
     *
     * @param {Resource|String} urlOrResource The URL to request.
     * @param {String} [callbackParameterName='callback'] The callback parameter name that the server expects.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<Object>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
     *
     *
     * @example
     * // load a data asynchronously
     * resource.loadJsonp().then(function(data) {
     *     // use the loaded data
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     *
     * @deprecated
     */
    function loadJsonp(urlOrResource, callbackParameterName, request) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(urlOrResource)) {
            throw new DeveloperError('urlOrResource is required.');
        }
        //>>includeEnd('debug');

        deprecationWarning('loadJsonp', 'loadJsonp is deprecated and will be removed in Cesium 1.44. Please use Resource.fetchJsonp instead.');

        var proxy;
        var queryParameters;
        if (typeof callbackParameterName === 'object') {
            var options = callbackParameterName;
            if (defined(options.parameters)) {
                queryParameters = clone(options.parameters);
            }
            if (defined(options.proxy)) {
                proxy = options.proxy;
            }
            callbackParameterName = options.callbackParameterName;
        }

        var resource = Resource.createIfNeeded(urlOrResource, {
            proxy : proxy,
            queryParameters : queryParameters,
            request: request
        });

        return resource.fetchJsonp(callbackParameterName);
    }

    defineProperties(loadJsonp, {
        loadAndExecuteScript : {
            get : function() {
                return Resource._Implementations.loadAndExecuteScript;
            },
            set : function(value) {
                Resource._Implementations.loadAndExecuteScript = value;
            }
        },

        defaultLoadAndExecuteScript : {
            get : function() {
                return Resource._DefaultImplementations.loadAndExecuteScript;
            }
        }
    });

    return loadJsonp;
});
