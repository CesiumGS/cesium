/*global define*/
define([
        '../ThirdParty/Uri',
        './defined',
        './DeveloperError'
    ], function(
        Uri,
        defined,
        DeveloperError) {
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
     * @param {String} host The host to be added.
     * @param {Number} port The port used to access the host.
     *
     * @example
     * // Add a trusted server
     * TrustedServers.add('my.server.com', 80);
     */
    TrustedServers.add = function(host, port) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(host)) {
            throw new DeveloperError('host is required.');
        }
        if (!defined(port) || port <= 0) {
            throw new DeveloperError('port is required to be greater than 0.');
        }
        //>>includeEnd('debug');

        var authority = host.toLowerCase() + ':' + port;
        if (!defined(_servers[authority])) {
            _servers[authority] = true;
        }
    };

    /**
     * Removes a trusted server from the registry
     *
     * @param {String} host The host to be removed.
     * @param {Number} port The port used to access the host.
     *
     * @example
     * // Remove a trusted server
     * TrustedServers.remove('my.server.com', 80);
     */
    TrustedServers.remove = function(host, port) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(host)) {
            throw new DeveloperError('host is required.');
        }
        if (!defined(port) || port <= 0) {
            throw new DeveloperError('port is required to be greater than 0.');
        }
        //>>includeEnd('debug');

        var authority = host.toLowerCase() + ':' + port;
        if (defined(_servers[authority])) {
            delete _servers[authority];
        }
    };

    function getAuthority(url) {
        var uri = new Uri(url);
        uri.normalize();

        // Removes username:password@ so we just have host[:port]
        var authority = uri.getAuthority();
        if (!defined(authority)) {
            return undefined; // Relative URL
        }

        if (authority.indexOf('@') !== -1) {
            var parts = authority.split('@');
            authority = parts[1];
        }

        // If the port is missing add one based on the scheme
        if (authority.indexOf(':') === -1) {
            var scheme = uri.getScheme();
            if (!defined(scheme)) {
                scheme = window.location.protocol;
                scheme = scheme.substring(0, scheme.length-1);
            }
            if (scheme === 'http') {
                authority += ':80';
            } else if (scheme === 'https') {
                authority += ':443';
            } else {
                return undefined;
            }
        }

        return authority;
    }

    /**
     * Tests whether a server is trusted or not. The server must have been added with the port if it is included in the url.
     *
     * @param {String} url The url to be tested against the trusted list
     *
     * @returns {boolean} Returns true if url is trusted, false otherwise.
     *
     * @example
     * // Add server
     * TrustedServers.add('my.server.com', 81);
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
        var authority = getAuthority(url);
        if (defined(authority) && defined(_servers[authority])) {
            return true;
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
        _servers = {};
    };
    
    return TrustedServers;
});
