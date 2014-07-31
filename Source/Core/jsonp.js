/*global define*/
define([
        '../ThirdParty/when',
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        when,
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    function pushQueryParameter(array, name, value) {
        array.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
    }

    /**
     * Requests a resource using JSONP.
     *
     * @exports jsonp
     *
     * @param {String} url The URL to request.
     * @param {Object} [options] Object with the following properties:
     * @param {Object} [options.parameters] Any extra query parameters to append to the URL.
     * @param {String} [options.callbackParameterName='callback'] The callback parameter name that the server expects.
     * @param {Object} [options.proxy] A proxy to use for the request. This object is expected to have a getURL function which returns the proxied URL, if needed.
     * @returns {Object} a promise that will resolve to the requested data when loaded.
     *
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     *
     * @example
     * // load a data asynchronously
     * Cesium.jsonp('some/webservice').then(function(data) {
     *     // use the loaded data
     * }.otherwise(function(error) {
     *     // an error occurred
     * });
     */
    var jsonp = function(url, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var deferred = when.defer();

        //generate a unique function name
        var functionName;
        do {
            functionName = 'jsonp' + Math.random().toString().substring(2, 8);
        } while (defined(window[functionName]));

        //assign a function with that name in the global scope
        window[functionName] = function(data) {
            deferred.resolve(data);

            try {
                delete window[functionName];
            } catch (e) {
                window[functionName] = undefined;
            }
        };

        var callbackParameterName = defaultValue(options.callbackParameterName, 'callback');
        var queryParts = [];
        pushQueryParameter(queryParts, callbackParameterName, functionName);

        var parameters = defaultValue(options.parameters, defaultValue.EMPTY_OBJECT);
        for ( var name in parameters) {
            if (parameters.hasOwnProperty(name)) {
                pushQueryParameter(queryParts, name, parameters[name]);
            }
        }

        if (queryParts.length > 0) {
            if (url.indexOf('?') === -1) {
                url += '?';
            } else {
                url += '&';
            }

            url += queryParts.join('&');
        }

        var proxy = options.proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        jsonp.loadAndExecuteScript(url, functionName, deferred);

        return deferred.promise;
    };

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    jsonp.loadAndExecuteScript = function(url, functionName, deferred) {
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

    jsonp.defaultLoadAndExecuteScript = jsonp.loadAndExecuteScript;

    return jsonp;
});