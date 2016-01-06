/*global define*/
define([
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError'
    ], function(
        Uri,
        when,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError) {
    "use strict";

    var activeRequestsByServer = {};
    var activeRequests = 0;

    /**
     * Because browsers throttle the number of parallel requests allowed to each server
     * and across all servers, this class tracks the number of active requests in progress
     * and prioritizes incoming requests.
     *
     * @exports RequestScheduler
     *
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     *
     * @private
     */
    function RequestScheduler() {
    }

    var pageUri = typeof document !== 'undefined' ? new Uri(document.location.href) : new Uri();

    /**
     * Get the server name from a given url.
     *
     * @param {String} url The url.
     * @returns {String} The server name.
     */
    RequestScheduler.getServer = function(url) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        var uri = new Uri(url).resolve(pageUri);
        uri.normalize();
        var server = uri.authority;
        if (!/:/.test(server)) {
            server = server + ':' + (uri.scheme === 'https' ? '443' : '80');
        }
        return server;
    };

    /**
     * Get the number of available slots for the given server.
     *
     * @param {String} url The url to check.
     * @returns {Number} The number of available slots.
     */
    RequestScheduler.getNumberOfAvailableRequestsByServer = function(url) {
        var server = RequestScheduler.getServer(url);
        var activeRequestsForServer = defaultValue(activeRequestsByServer[server], 0);
        return RequestScheduler.maximumRequestsPerServer - activeRequestsForServer;
    };

    /**
     * Get the number of available slots across all servers.
     *
     * @returns {Number} The number of available slots.
     */
    RequestScheduler.getNumberOfAvailableRequests = function() {
        return RequestScheduler.maximumRequests - activeRequests;
    };

    /**
     * Checks if there are available slots to make a request.
     * It considers the total number of available slots across all servers, and
     * if a url is provided, the total number of available slots at the url's server.
     *
     * @param {String} [url] The url to check.
     * @returns {Boolean} Returns true if there are available slots, otherwise false.
     */
    RequestScheduler.hasAvailableRequests = function(url) {
        if (activeRequests >= RequestScheduler.maximumRequests) {
            return false;
        }

        if (defined(url)) {
            var server = RequestScheduler.getServer(url);
            var activeRequestsForServer = defaultValue(activeRequestsByServer[server], 0);
            if (activeRequestsForServer >= RequestScheduler.maximumRequestsPerServer) {
                return false;
            }
        }

        return true;
    };

    /**
     * A function that will make a request if there are available slots to the server.
     * Returns undefined immediately if the request would exceed the maximum, allowing
     * the caller to retry later instead of queueing indefinitely under the browser's control.
     *
     * @param {String} url The URL to request.
     * @param {RequestScheduler~RequestFunction} requestFunction The actual function that
     *        makes the request.
     * @returns {Promise.<Object>|undefined} Either undefined, meaning the request would exceed the maximum number of
     *          parallel requests, or a Promise for the requested data.
     *
     * @example
     * // throttle requests for an image
     * var url = 'http://madeupserver.example.com/myImage.png';
     * var requestFunction = function(url) {
     *   // in this simple example, loadImage could be used directly as requestFunction.
     *   return Cesium.loadImage(url);
     * };
     * var promise = Cesium.RequestScheduler.throttleRequest(url, requestFunction);
     * if (!Cesium.defined(promise)) {
     *   // too many active requests in progress, try again later.
     * } else {
     *   promise.then(function(image) {
     *     // handle loaded image
     *   });
     * }
     *
     */
    RequestScheduler.throttleRequest = function(url, requestFunction) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }

        if (!defined(requestFunction)) {
            throw new DeveloperError('requestFunction is required.');
        }
        //>>includeEnd('debug');

        if (activeRequests >= RequestScheduler.maximumRequests) {
            return undefined;
        }

        var server = RequestScheduler.getServer(url);
        var activeRequestsForServer = defaultValue(activeRequestsByServer[server], 0);
        if (activeRequestsForServer >= RequestScheduler.maximumRequestsPerServer) {
            return undefined;
        }

        ++activeRequests;
        activeRequestsByServer[server] = activeRequestsForServer + 1;

        return when(requestFunction(url), function(result) {
            --activeRequests;
            --activeRequestsByServer[server];
            return result;
        }).otherwise(function(error) {
            --activeRequests;
            --activeRequestsByServer[server];
            return when.reject(error);
        });
    };

    /**
     * Specifies the maximum number of requests that can be simultaneously open to a single server.  If this value is higher than
     * the number of requests per server actually allowed by the web browser, Cesium's ability to prioritize requests will be adversely
     * affected.
     * @type {Number}
     * @default 6
     */
    RequestScheduler.maximumRequestsPerServer = 6;

    /**
     * Specifies the maximum number of requests that can be simultaneously open for all servers.  If this value is higher than
     * the number of requests actually allowed by the web browser, Cesium's ability to prioritize requests will be adversely
     * affected.
     * @type {Number}
     * @default 10
     */
    RequestScheduler.maximumRequests = 10;

    return RequestScheduler;
});
