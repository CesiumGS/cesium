define([
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './clone',
        './combine',
        './defaultValue',
        './defined',
        './deprecationWarning',
        './DeveloperError',
        './objectToQuery',
        './queryToObject',
        './Request',
        './RequestScheduler',
        './RequestState',
        './Resource'
    ], function(
        Uri,
        when,
        clone,
        combine,
        defaultValue,
        defined,
        deprecationWarning,
        DeveloperError,
        objectToQuery,
        queryToObject,
        Request,
        RequestScheduler,
        RequestState,
        Resource) {
    'use strict';

    /**
     * Requests a resource using JSONP.
     *
     * @exports loadJsonp
     *
     * @param {Resource|String} urlOrResource The URL to request.
     * @param {String} [callbackParameterName='callback'] The callback parameter name that the server expects.
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
        if (defined(request)) {
            deprecationWarning('loadJsonp.request', 'The request parameter has been deprecated. Set the request property on the Resource parameter.');
        }

        var proxy;
        var queryParameters;
        if (typeof callbackParameterName === 'object') {
            deprecationWarning('loadJsonp.callbackParameterName', 'Passing an Object as the second parameter is deprecated. The proxy and parameters options should now be set on the Resource instance.');
            var options = callbackParameterName;
            if (defined(options.parameters)) {
                queryParameters = clone(options.parameters);
            }
            if (defined(options.proxy)) {
                proxy = options.proxy;
            }
            callbackParameterName = options.callbackParameterName;
        }
        callbackParameterName = defaultValue(callbackParameterName, 'callback');

        //generate a unique function name
        var functionName;
        do {
            functionName = 'loadJsonp' + Math.random().toString().substring(2, 8);
        } while (defined(window[functionName]));

        var resource = Resource.createIfNeeded(urlOrResource, {
            proxy : proxy,
            queryParameters : queryParameters,
            request: request
        });
        resource.request = defaultValue(resource.request, new Request());

        return makeRequest(resource, callbackParameterName, functionName);
    }

    function makeRequest(resource, callbackParameterName, functionName) {
        var callbackQuery = {};
        callbackQuery[callbackParameterName] = functionName;
        resource.addQueryParameters(callbackQuery);

        var request = resource.request;
        request.url = resource.url;
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

            loadJsonp.loadAndExecuteScript(resource.url, functionName, deferred);
            return deferred.promise;
        };

        var promise = RequestScheduler.request(request);
        if (!defined(promise)) {
            return;
        }

        return promise
            .otherwise(function(e) {
                if (request.state !== RequestState.FAILED) {
                    return when.reject(e);
                }
                return resource.retryOnError(e)
                    .then(function(retry) {
                        if (retry) {
                            // Reset request so it can try again
                            request.state = RequestState.UNISSUED;
                            request.deferred = undefined;

                            return makeRequest(resource, callbackParameterName, functionName);
                        }

                        return when.reject(e);
                    });
            });
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
