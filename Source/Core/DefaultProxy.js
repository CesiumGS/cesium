/*global define*/
define(function() {
    "use strict";

    /**
     * A simple proxy that appends the desired resource as the sole query parameter
     * to the given proxy URL.
     *
     * @alias DefaultProxy
     * @constructor
     *
     * @param {String} proxy The proxy URL that will be used to requests all resources.
     */
    var DefaultProxy = function(proxy) {
        this.proxy = proxy;
    };

    /**
     * Get the final URL to use to request a given resource.
     *
     * @param {String} resource The resource to request.
     */
    DefaultProxy.prototype.getURL = function(resource) {
        return this.proxy + '?' + encodeURIComponent(resource);
    };

    return DefaultProxy;
});