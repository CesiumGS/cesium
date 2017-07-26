define([
        '../Core/WebGLConstants'
    ], function(
        WebGLConstants) {
    'use strict';

    /**
     * Represents a timer query.
     *
     * @private
     */
    function TimerQuery(frameState, callback) {
        var context = frameState.context;
        var startQuery = context.createQuery();
        var endQuery = context.createQuery();

        this._context = context;
        this._startQuery = startQuery;
        this._endQuery = endQuery;

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

    TimerQuery.prototype.begin = function() {
        this._context.queryCounter(this._startQuery, WebGLConstants.TIMESTAMP_EXT);
    };

    TimerQuery.prototype.end = function() {
        this._context.queryCounter(this._endQuery);
    };

    return TimerQuery;
});
