define(function() {
    'use strict';

    /**
     * A simple proxy that appends the desired resource as the sole query parameter
     * to the given proxy URL.
     *
     * @alias DefaultProxy
     * @constructor
     *
     * @param {String} proxy The proxy URL that will be used to requests all resources.
     */
    function DefaultProxy(proxy) {
        this.proxy = proxy;
    }

    /**
     * Get the final URL to use to request a given resource.
     *
     * @param {String} resource The resource to request.
     * @returns {String} proxied resource
     */
    DefaultProxy.prototype.getURL = function(resource) {
        var prefix = this.proxy.indexOf('?') === -1 ? '?' : '';
        return this.proxy + prefix + encodeURIComponent(resource);
    };

    return DefaultProxy;
});
