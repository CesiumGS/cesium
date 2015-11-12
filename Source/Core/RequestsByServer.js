/*global define*/
define([
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        Uri,
        when,
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    var maximumRequestsPerServer = 6;
    var activeRequests = {};

    /**
     * @private
     */
    var RequestsByServer = function() {
    };

    var pageUri = new Uri(document.location.href);

    RequestsByServer.getServer = function(url) {
        var uri = new Uri(url).resolve(pageUri);
        uri.normalize();
        var server = uri.authority;
        if (!/:/.test(server)) {
            server = server + ':' + (uri.scheme === 'https' ? '443' : '80');
        }
        return server;
    };

    RequestsByServer.getNumberOfAvailableRequests = function(server) {
        var activeRequestsForServer = defaultValue(activeRequests[server], 0);
        return maximumRequestsPerServer - activeRequestsForServer;
    };

    RequestsByServer.throttleRequest = function(url, requestFunction) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }

        if (!defined(requestFunction)) {
            throw new DeveloperError('requestFunction is required.');
        }
        //>>includeEnd('debug');

        var server = RequestsByServer.getServer(url);

        var activeRequestsForServer = defaultValue(activeRequests[server], 0);
        if (activeRequestsForServer >= maximumRequestsPerServer) {
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

    return RequestsByServer;
});