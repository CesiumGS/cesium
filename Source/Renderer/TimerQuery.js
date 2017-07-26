define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/WebGLConstants'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        WebGLConstants) {
    'use strict';

    /**
     * Represents a timer query.
     *
     * @private
     */
    function TimerQuery(context, frameState, callback) {
        var startQuery = context.createQuery();
        var endQuery = context.createQuery();

        this._context = context;
        this._startQuery = startQuery;
        this._endQuery = endQuery;

        frameState.afterRender.push(function() {
            var available = context.getQueryObject(endQuery, WebGLConstants.QUERY_RESULT_AVAILABLE_EXT);
            var disjoint = context.disjointTimerQuery;
            if (available && !disjoint) {
                var timeStart = context.getQueryObject(startQuery, WebGLConstants.QUERY_RESULT_EXT);
                var timeEnd = context.getQueryObject(endQuery, WebGLConstants.QUERY_RESULT_EXT);

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
        this._context.queryCounter(this._endQuery, WebGLConstants.TIMESTAMP_EXT);
    };
});
