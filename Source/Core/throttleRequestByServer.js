/*global define*/
define([
        './defaultValue',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        when) {
    "use strict";

    var maximumRequestsPerServer = 6;
    var activeRequests = {};
    var anchor;

    function getServer(url) {
        if (typeof anchor === 'undefined') {
            anchor = document.createElement('a');
        }
        anchor.href = url;
        return anchor.hostname + '%' + anchor.port;
    }

    /**
     * Because browsers throttle the number of parallel requests allowed to each server,
     * this function tracks the number of active requests that have been made, and
     * returns undefined immediately if the request would exceed the maximum, allowing
     * the caller to retry later.
     *
     * @param {String} url The URL to request.
     * @param {Function} requestFunction The actual function that makes the request.
     * This function is expected to return a Promise for the requested data.
     *
     * @return {Promise} Either undefined, meaning the request would exceed the maximum
     * number of parallel requests, or a Promise that returns the requested data.
     *
     * @see <a href='http://wiki.commonjs.org/wiki/Promises/A'>CommonJS Promises/A</a>
     */
    function throttleRequestByServer(url, requestFunction) {
        var server = getServer(url);

        var activeRequestsForServer = defaultValue(activeRequests[server], 0);
        if (activeRequestsForServer > maximumRequestsPerServer) {
            return undefined;
        }

        activeRequests[server] = activeRequestsForServer + 1;

        return when(requestFunction(url), function(result) {
            activeRequests[server]--;
            return result;
        });
    }

    return throttleRequestByServer;
});