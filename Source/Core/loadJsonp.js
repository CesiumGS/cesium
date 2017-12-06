define([
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './combine',
        './defaultValue',
        './defined',
        './DeveloperError',
        './objectToQuery',
        './queryToObject',
        './Request',
        './RequestScheduler',
        './Resource'
    ], function(
        Uri,
        when,
        combine,
        defaultValue,
        defined,
        DeveloperError,
        objectToQuery,
        queryToObject,
        Request,
        RequestScheduler,
        Resource) {
    'use strict';

    /**
     * Requests a resource using JSONP.
     *
     * @exports loadJsonp
     *
     * @param {Resource|String} urlOrResource The URL to request.
     * @param {Object} [options] Object with the following properties: //TODO deprecated
     * @param {Object} [options.parameters] Any extra query parameters to append to the URL.
     * @param {String} [options.callbackParameterName='callback'] The callback parameter name that the server expects.
     * @param {DefaultProxy} [options.proxy] A proxy to use for the request. This object is expected to have a getURL function which returns the proxied URL, if needed.
     * @param {String} [callbackParameterName='callback'] The callback parameter name that the server expects.
     * @param {Request} [request] The request object. Intended for internal use only.
     * @returns {Promise.<Object>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
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
    function loadJsonp(urlOrResource, callbackParameterName, request) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(urlOrResource)) {
            throw new DeveloperError('urlOrResource is required.');
        }
        //>>includeEnd('debug');

        //generate a unique function name
        var functionName;
        do {
            functionName = 'loadJsonp' + Math.random().toString().substring(2, 8);
        } while (defined(window[functionName]));



        if (typeof urlOrResource === 'string') {
            urlOrResource = new Resource({
                url: urlOrResource,
                request: request
            });
        }
        if (typeof callbackParameterName === 'object') {
            //TODO deprecation warning
            var options = callbackParameterName;
            if (defined(options.parameters)) {
                urlOrResource.addQueryParameters(options.parameters);
            }
            if (defined(options.proxy)) {
                urlOrResource.proxy = options.proxy;
            }
            callbackParameterName = options.callbackParameterName;
        }
        if (defined(request)) {
            //TODO deprecate
            urlOrResource.request = request;
        }

        var callbackQuery = {};
        callbackParameterName = defaultValue(callbackParameterName, 'callback');
        callbackQuery[callbackParameterName] = functionName;
        urlOrResource.addQueryParameters(callbackQuery);

        request = defined(urlOrResource.request) ? urlOrResource.request : new Request();
        var url = urlOrResource.url;
        request.url = url;
        request.requestFunction = function() {
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

            loadJsonp.loadAndExecuteScript(url, functionName, deferred);
            return deferred.promise;
        };

        return RequestScheduler.request(request);
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
