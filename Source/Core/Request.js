/*global define*/
define([
        './defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * Stores information for making a request using {@link RequestScheduler}.
     *
     * @exports Request
     *
     * @private
     */
    function Request(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The URL to request.
         */
        this.url = options.url;

        /**
         * Extra parameters to send with the request. For example, HTTP headers or jsonp parameters.
         */
        this.parameters = options.parameters;

        /**
         * The actual function that makes the request.
         */
        this.requestFunction = options.requestFunction;

        /**
         * Type of request. Used for more fine-grained priority sorting.
         */
        this.type = options.type;

        /**
         * Specifies that the request should be deferred until an open slot is available.
         * A deferred request will always return a promise, which is suitable for data
         * sources and utility functions.
         */
        this.defer = defaultValue(options.defer, false);

        /**
         * The distance from the camera, used to prioritize requests.
         */
        this.distance = defaultValue(options.distance, 0.0);

        // Helper members for RequestScheduler

        /**
         * A promise for when a deferred request can start.
         *
         * @private
         */
        this.startPromise = undefined;

        /**
         * Reference to a {@link RequestScheduler~RequestServer}.
         *
         * @private
         */
        this.server = options.server;
    }

    return Request;
});
