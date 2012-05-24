/*global define*/
define(['dojo/io-query',
        './fillBufferIncrementally',
        './serializeDate'
    ], function(
         ioquery,
         fillBufferIncrementally,
         serializeDate) {
    "use strict";

    function TimeIntervalBufferUpdater(buffer, baseUrl, bufferFillFunction) {
        if (typeof bufferFillFunction === 'undefined') {
            bufferFillFunction = fillBufferIncrementally;
        }

        this._buffer = buffer;
        this._bufferFillFunction = bufferFillFunction;

        var queryIndex = baseUrl.indexOf("?");
        if (queryIndex >= 0) {
            this._query = ioquery.queryToObject(baseUrl.substring(queryIndex + 1, baseUrl.length));
            this._baseUrl = baseUrl.substring(0, queryIndex);
        } else {
            this._query = {};
            this._baseUrl = baseUrl;
        }
    }

    TimeIntervalBufferUpdater.prototype.setRange = function(startTime, stopTime, stepSize) {
        if (typeof this._handle !== 'undefined') {
            this._handle.abort();
            this._handle = undefined;
        }

        this._bufferStart = startTime;
        this._bufferStop = stopTime;
        this._stepSize = stepSize;

        var start = serializeDate(this._bufferStart);
        var stop = serializeDate(this._bufferStop);
        var step = this._stepSize;

        this._query.start = start;
        this._query.stop = stop;
        this._query.step = step;
        var url = this._baseUrl + '?' + ioquery.objectToQuery(this._query);

        var self = this, storeHandle = true, handle = this._bufferFillFunction(this._buffer, url, function() {
            storeHandle = false;
            self._handle = undefined;
        });
        if (storeHandle) {
            this._handle = handle;
        }
    };

    TimeIntervalBufferUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle.abort();
            this._handle = undefined;
        }
    };

    return TimeIntervalBufferUpdater;
});