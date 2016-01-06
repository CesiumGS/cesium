/*global define*/
define([
        './defaultValue',
        './defined',
        './formatError'
    ], function(
        defaultValue,
        defined,
        formatError) {
    "use strict";

    /**
     * Provides details about an error that occurred in an {@link ImageryProvider} or a {@link TerrainProvider}.
     *
     * @alias TileProviderError
     * @constructor
     *
     * @param {ImageryProvider|TerrainProvider} provider The imagery or terrain provider that experienced the error.
     * @param {String} message A message describing the error.
     * @param {Number} [x] The X coordinate of the tile that experienced the error, or undefined if the error
     *        is not specific to a particular tile.
     * @param {Number} [y] The Y coordinate of the tile that experienced the error, or undefined if the error
     *        is not specific to a particular tile.
     * @param {Number} [level] The level of the tile that experienced the error, or undefined if the error
     *        is not specific to a particular tile.
     * @param {Number} [timesRetried=0] The number of times this operation has been retried.
     * @param {Error} [error] The error or exception that occurred, if any.
     */
    function TileProviderError(provider, message, x, y, level, timesRetried, error) {
        /**
         * The {@link ImageryProvider} or {@link TerrainProvider} that experienced the error.
         * @type {ImageryProvider|TerrainProvider}
         */
        this.provider = provider;

        /**
         * The message describing the error.
         * @type {String}
         */
        this.message = message;

        /**
         * The X coordinate of the tile that experienced the error.  If the error is not specific
         * to a particular tile, this property will be undefined.
         * @type {Number}
         */
        this.x = x;

        /**
         * The Y coordinate of the tile that experienced the error.  If the error is not specific
         * to a particular tile, this property will be undefined.
         * @type {Number}
         */
        this.y = y;

        /**
         * The level-of-detail of the tile that experienced the error.  If the error is not specific
         * to a particular tile, this property will be undefined.
         * @type {Number}
         */
        this.level = level;

        /**
         * The number of times this operation has been retried.
         * @type {Number}
         * @default 0
         */
        this.timesRetried = defaultValue(timesRetried, 0);

        /**
         * True if the failed operation should be retried; otherwise, false.  The imagery or terrain provider
         * will set the initial value of this property before raising the event, but any listeners
         * can change it.  The value after the last listener is invoked will be acted upon.
         * @type {Boolean}
         * @default false
         */
        this.retry = false;

        /**
         * The error or exception that occurred, if any.
         * @type {Error}
         */
        this.error = error;
    }

    /**
     * Handles an error in an {@link ImageryProvider} or {@link TerrainProvider} by raising an event if it has any listeners, or by
     * logging the error to the console if the event has no listeners.  This method also tracks the number
     * of times the operation has been retried and will automatically retry if requested to do so by the
     * event listeners.
     *
     * @param {TileProviderError} previousError The error instance returned by this function the last
     *        time it was called for this error, or undefined if this is the first time this error has
     *        occurred.
     * @param {ImageryProvider|TerrainProvider} provider The imagery or terrain provider that encountered the error.
     * @param {Event} event The event to raise to inform listeners of the error.
     * @param {String} message The message describing the error.
     * @param {Number} x The X coordinate of the tile that experienced the error, or undefined if the
     *        error is not specific to a particular tile.
     * @param {Number} y The Y coordinate of the tile that experienced the error, or undefined if the
     *        error is not specific to a particular tile.
     * @param {Number} level The level-of-detail of the tile that experienced the error, or undefined if the
     *        error is not specific to a particular tile.
     * @param {TileProviderError~RetryFunction} retryFunction The function to call to retry the operation.  If undefined, the
     *        operation will not be retried.
     * @param {Error} [errorDetails] The error or exception that occurred, if any.
     * @returns {TileProviderError} The error instance that was passed to the event listeners and that
     *          should be passed to this function the next time it is called for the same error in order
     *          to track retry counts.
     */
    TileProviderError.handleError = function(previousError, provider, event, message, x, y, level, retryFunction, errorDetails) {
        var error = previousError;
        if (!defined(previousError)) {
            error = new TileProviderError(provider, message, x, y, level, 0, errorDetails);
        } else {
            error.provider = provider;
            error.message = message;
            error.x = x;
            error.y = y;
            error.level = level;
            error.retry = false;
            error.error = errorDetails;
            ++error.timesRetried;
        }

        if (event.numberOfListeners > 0) {
            event.raiseEvent(error);
        } else {
            console.log('An error occurred in "' + provider.constructor.name + '": ' + formatError(message));
        }

        if (error.retry && defined(retryFunction)) {
            retryFunction();
        }

        return error;
    };

    /**
     * Handles success of an operation by resetting the retry count of a previous error, if any.  This way,
     * if the error occurs again in the future, the listeners will be informed that it has not yet been retried.
     *
     * @param {TileProviderError} previousError The previous error, or undefined if this operation has
     *        not previously resulted in an error.
     */
    TileProviderError.handleSuccess = function(previousError) {
        if (defined(previousError)) {
            previousError.timesRetried = -1;
        }
    };

    /**
     * A function that will be called to retry the operation.
     * @callback TileProviderError~RetryFunction
     */

    return TileProviderError;
});
