/*global define*/
define([
        './defaultValue',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        when) {
    'use strict';

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

        this.screenSpaceError = options.screenSpaceError;

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

        this.active = false;
        this.done = false;
        this.xhr = undefined;
        this.finished = when.defer();
    }

    Request.prototype.stop = function() {
        this.active = false;
        this.xhr = this.xhr && this.xhr.abort();
    };

    Request.prototype.cancel = function() {
        this.active = false;
        this.done = true;
        this.xhr = this.xhr && this.xhr.abort();
    };

    return Request;
});
