/*global define*/
define([
    './defined',
    './defineProperties',
    './DeveloperError',
    '../ThirdParty/Uri'
], function(
    defined,
    defineProperties,
    DeveloperError,
    Uri) {
    'use strict';
    
    /**
     * A singleton that contains all of the servers that are trusted. Credentials will be sent with
     * any requests to these servers.
     *
     * @exports TrustedServers
     *
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     */
    var TrustedServers = {};
    var _servers = {};

    /**
     * Adds a trusted server to the registry
     *
     * @param {String} authority The server that is trusted. Can include a port if it is needed. (eg. my.server.com or my.server.com:8080)
     *
     * @example
     * // Add a trusted server
     * TrustedServers.add('my.server.com:81');
     */
    TrustedServers.add = function(authority) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(authority)) {
            throw new DeveloperError('authority is required.');
        }
        //>>includeEnd('debug');

        authority = authority.toLowerCase();
        if (!defined(_servers[authority])) {
            _servers[authority] = true;
        }
    };

    /**
     * Removes a trusted server from the registry
     *
     * @param {String} authority The server that is trusted. Should be exact authority that was added. (eg. my.server.com or my.server.com:8080)
     *
     * @example
     * // Remove a trusted server
     * TrustedServers.remove('my.server.com:81');
     */
    TrustedServers.remove = function(authority) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(authority)) {
            throw new DeveloperError('authority is required.');
        }
        //>>includeEnd('debug');

        authority = authority.toLowerCase();
        if (defined(_servers[authority])) {
            delete _servers[authority];
        }
    };

    /**
     * Tests whether a server is trusted or not. The server must have been added with the port if it is included in the url.
     *
     * @param {String} url The url to be tested against the trusted list
     *
     * @returns {boolean} Returns true if url is trusted, false otherwise.
     *
     * @example
     * // Add server
     * TrustedServers.add('my.server.com:81');
     *
     * // Check if server is trusted
     * if (TrustedServers.contains('https://my.server.com:81/path/to/file.png')) {
     *     // my.server.com:81 is trusted
     * }
     * if (TrustedServers.contains('https://my.server.com/path/to/file.png')) {
     *     // my.server.com isn't trusted
     * }
     */
    TrustedServers.contains = function(url) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');
        var uri = new Uri(url);
        uri.normalize();
        var authority = uri.getAuthority();
        if (!defined(authority)) {
            return false;
        }

        if (defined(_servers[authority])) {
            return true;
        }

        if (authority.indexOf(':') === -1) {
            var scheme = uri.getScheme();
            if (scheme === 'http') {
                authority += ':80';
            } else if (scheme === 'https') {
                authority += ':443';
            } else {
                return false;
            }

            if (defined(_servers[authority])) {
                return true;
            }
        }

        return false;
    };

    /**
     * Clears the registry
     *
     * @example
     * // Remove a trusted server
     * TrustedServers.clear();
     */
    TrustedServers.clear = function() {
        _servers = [];
    };
    
    return TrustedServers;
});
