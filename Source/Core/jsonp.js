/*global define*/
define([
        './deprecationWarning',
        './loadJsonp'
    ], function(
        deprecationWarning,
        loadJsonp) {
    "use strict";

    /**
     * Requests a resource using JSONP.
     *
     * @exports jsonp
     *
     * @param {String} url The URL to request.
     * @param {Object} [options] Object with the following properties:
     * @param {Object} [options.parameters] Any extra query parameters to append to the URL.
     * @param {String} [options.callbackParameterName='callback'] The callback parameter name that the server expects.
     * @param {Proxy} [options.proxy] A proxy to use for the request. This object is expected to have a getURL function which returns the proxied URL, if needed.
     * @returns {Promise.<Object>} a promise that will resolve to the requested data when loaded.
     *
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     *
     * @example
     * // load a data asynchronously
     * Cesium.jsonp('some/webservice').then(function(data) {
     *     // use the loaded data
     * }).otherwise(function(error) {
     *     // an error occurred
     * });
     *
     * @deprecated
     */
    var jsonp = function(url, options) {
        deprecationWarning('jsonp', 'jsonp is deprecated. Use loadJsonp instead.');
        return loadJsonp(url, options);
    };

    // This is broken out into a separate function so that it can be mocked for testing purposes.
    jsonp.loadAndExecuteScript = function(url, functionName, deferred) {
        loadJsonp.loadAndExecuteScript(url, functionName, deferred);
    };

    jsonp.defaultLoadAndExecuteScript = jsonp.loadAndExecuteScript;

    return jsonp;
});
