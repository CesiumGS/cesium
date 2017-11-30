define([
    './defaultValue'
], function(defaultValue) {
    'use strict';

    /**
     * Stores information for handling a request
     *
     * @alias RequestOptions
     * @constructor
     *
     * @param {Object} [options] An object with the following properties:
     * @param {Number} [options.retryAttempts] The number of times to retry a failed request.
     * @param {RequestOptions~RetryOnErrorCallback} [options.retryOnError] A function that determines whether or not to retry a request.
     * @param {RequestOptions~BeforeRequestCallback} [options.beforeRequest] A function that is called before the request is opened.
     */
    function RequestOptions(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The function that makes the actual data request.
         * @type {RequestOptions~BeforeRequestCallback}
         */
        this.beforeRequest = options.beforeRequest;

        /**
         * The function that makes the actual data request.
         * @type {RequestOptions~RetryOnErrorCallback}
         */
        this.retryOnError = options.retryOnError;

        /**
         * Gets and sets the number of times to retry a failed request.
         * @type {Number}
         */
        this.retryAttempts = options.retryAttempts;
    }

    /**
     * A function that determines whether or not to retry a request
     * @callback RequestOptions~RetryOnErrorCallback
     * @returns {Promise<Boolean>} A promise for whether or not to retry the request
     */

    /**
     * A function that is called before the request is opened.
     * @callback RequestOptions~BeforeRequestCallback
     * @params {String} url The url for the request
     * @return {String} The url to use for the request
     */

    return RequestOptions;
});
