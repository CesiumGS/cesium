/*global define*/
define([
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './combine',
        './defaultValue',
        './defined',
        './DeveloperError',
        './objectToQuery',
        './queryToObject'
    ], function(
        Uri,
        when,
        combine,
        defaultValue,
        defined,
        DeveloperError,
        objectToQuery,
        queryToObject) {
    "use strict";

    /**
     * Requests a resource using JSONP.
     *
     * @exports loadJsonp
     *
     * @param {String} url The URL to request.
     * @param {Object} [options] Object with the following properties:
     * @param {Object} [options.parameters] Any extra query parameters to append to the URL.
     * @param {String} [options.callbackParameterName='callback'] The callback parameter name that the server expects.
     * @param {Proxy} [options.proxy] A proxy to use for the request. This object is expected to have a getURL function which returns the proxied URL, if needed.
     * @returns {Promise.<Object>} a promise that will resolve to the requested data when loaded.
     *
     *
     * @example
     * // load a data asynchronously
     * Cesium.loadJsonp('some/webservice').then(function(data) {
     *     // use the loaded data
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     * 
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     */
    function loadJsonp(url, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //generate a unique function name
        var functionName;
        do {
            functionName = 'loadJsonp' + Math.random().toString().substring(2, 8);
        } while (defined(window[functionName]));

        var deferred = when.defer();

        //assign a function with that name in the global scope
        window[functionName] = function(data) {
            deferred.resolve(data);

            try {
                delete window[functionName];
            } catch (e) {
                window[functionName] = undefined;
            }
        };

        var uri = new Uri(url);

        var queryOptions = queryToObject(defaultValue(uri.query, ''));

        if (defined(options.parameters)) {
            queryOptions = combine(options.parameters, queryOptions);
        }

        var callbackParameterName = defaultValue(options.callbackParameterName, 'callback');
        queryOptions[callbackParameterName] = functionName;

        uri.query = objectToQuery(queryOptions);

        url = uri.toString();

        var proxy = options.proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        loadJsonp.loadAndExecuteScript(url, functionName, deferred);

        return deferred.promise;
    }

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    loadJsonp.loadAndExecuteScript = function(url, functionName, deferred) {
        var script = document.createElement('script');
        script.async = true;
        script.src = url;

        var head = document.getElementsByTagName('head')[0];
        script.onload = function() {
            script.onload = undefined;
            head.removeChild(script);
        };
        script.onerror = function(e) {
            deferred.reject(e);
        };

        head.appendChild(script);
    };

    loadJsonp.defaultLoadAndExecuteScript = loadJsonp.loadAndExecuteScript;

    return loadJsonp;
});
