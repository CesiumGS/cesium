define([
        '../Core/WebGLConstants',
        '../Core/oneTimeWarning'
    ], function(
        WebGLConstants,
        oneTimeWarning) {
    'use strict';

    /**
     * Represents a timer query.
     *
     *
     * @param {Object} frameState The current FrameState.
     * @param {Function} callback The callback to execute after the frame time is measured. Takes the frame time in millisecond as a parameter.
     * @private
     */
    function TimerQuery(frameState, callback) {
        var context = frameState.context;
        if (!processingSupported(context)) {
            oneTimeWarning('TimerQuery', 'Timer queries are not supported -- missing extension!');
            return;
        }

        var startQuery = context.createQuery();
        var endQuery = context.createQuery();

        this._startQuery = startQuery;
        this._endQuery = endQuery;
        this._context = context;

        frameState.beforeRender.push(function() {
            var available = context.getQueryParameter(endQuery, WebGLConstants.QUERY_RESULT_AVAILABLE_EXT);
            var disjoint = context.disjointTimerQuery;
            if (available && !disjoint) {
                var timeStart = context.getQueryParameter(startQuery, WebGLConstants.QUERY_RESULT_EXT);
                var timeEnd = context.getQueryParameter(endQuery, WebGLConstants.QUERY_RESULT_EXT);

                // Converts from nanoseconds to milliseconds
                var timeElapsed = (timeEnd - timeStart) / 1e6;

                callback(timeElapsed);
            }
        });
    }

    function processingSupported(context) {
        return context.timerQuery;
    }

    TimerQuery.prototype.begin = function() {
        if (processingSupported(this._context)) {
            this._context.queryCounter(this._startQuery, WebGLConstants.TIMESTAMP_EXT);
        }
    };

    TimerQuery.prototype.end = function() {
        if (processingSupported(this._context)) {
            this._context.queryCounter(this._endQuery, WebGLConstants.TIMESTAMP_EXT);
        }
    };

    return TimerQuery;
});
