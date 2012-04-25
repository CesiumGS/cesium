/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * An enumeration describing when to use a proxy URL to load images.
     *
     * @exports ProxyUsagePolicy
     *
     * @see BingMapsTileProvider
     */
    var ProxyUsagePolicy = {
        /**
         * Use CORS (Cross-Origin Resource Sharing) for all images that are
         * known to support it, fall back on the proxy for other images.
         *
         * @constant
         * @type {Enumeration}
         */
        USE_CORS : new Enumeration(0, "USE_CORS"),

        /**
         * Request all images through the proxy.
         *
         * @constant
         * @type {Enumeration}
         */
        ALWAYS : new Enumeration(1, "ALWAYS")
    };

    return ProxyUsagePolicy;
});