/*global define*/
define([
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './defaultValue'
    ], function(
        Uri,
        when,
        defaultValue) {
    "use strict";

    var maximumRequestsPerServer = 6;
    var activeRequests = {};

    var pageUri = new Uri(document.location.href);
    function getServer(url) {
        var uri = new Uri(url).resolve(pageUri);
        uri.normalize();
        var server = uri.authority;
        if (!/:/.test(server)) {
            server = server + ':' + (uri.scheme === 'https' ? '443' : '80');
        }
        return server;
    }

    /**
     * Because browsers throttle the number of parallel requests allowed to each server,
     * this function tracks the number of active requests in progress to each server, and
     * returns undefined immediately if the request would exceed the maximum, allowing
     * the caller to retry later, instead of queueing indefinitely under the browser's control.
     *
     * @exports throttleRequestByServer
     *
     * @param {String} url The URL to request.
     * @param {throttleRequestByServer~RequestFunction} requestFunction The actual function that
     *        makes the request.
     * @returns {Promise} Either undefined, meaning the request would exceed the maximum number of
     *          parallel requests, or a Promise for the requested data.
     *
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     *
     * @example
     * // throttle requests for an image
     * var url = 'http://madeupserver.example.com/myImage.png';
     * var requestFunction = function(url) {
     *   // in this simple example, loadImage could be used directly as requestFunction.
     *   return Cesium.loadImage(url);
     * };
     * var promise = Cesium.throttleRequestByServer(url, requestFunction);
     * if (!Cesium.defined(promise)) {
     *   // too many active requests in progress, try again later.
     * } else {
     *   promise.then(function(image) {
     *     // handle loaded image
     *   });
     * }
     */
    var throttleRequestByServer = function(url, requestFunction) {
        var server = getServer(url);

        var activeRequestsForServer = defaultValue(activeRequests[server], 0);
        if (activeRequestsForServer > maximumRequestsPerServer) {
            return undefined;
        }

        activeRequests[server] = activeRequestsForServer + 1;

        return when(requestFunction(url), function(result) {
            activeRequests[server]--;
            return result;
        }).otherwise(function(error) {
            activeRequests[server]--;
            return when.reject(error);
        });
    };

    /**
     * A function that will make a request if there are available slots to the server.
     * @callback throttleRequestByServer~RequestFunction
     *
     * @param {String} url The url to request.
     * @returns {Promise} A promise for the requested data.
     */

    return throttleRequestByServer;
});