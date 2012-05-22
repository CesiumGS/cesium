/*global define*/
define(['dojo/io-query',
        './fillBufferIncrementally',
        './serializeDate'
    ], function(
         ioquery,
         fillBufferIncrementally,
         serializeDate) {
    "use strict";

    function ClockDrivenBufferUpdater(clock, buffer, baseUrl, bufferSize, stepSize, bufferFillFunction) {
        if (typeof bufferFillFunction === 'undefined') {
            bufferFillFunction = fillBufferIncrementally;
        }

        this._clock = clock;
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

        this._bufferSize = bufferSize;
        this._stepSize = stepSize;
    }

    ClockDrivenBufferUpdater.prototype.getStartTime = function() {
        return this._bufferStart;
    };

    ClockDrivenBufferUpdater.prototype.getStopTime = function() {
        return this._bufferStop;
    };

    ClockDrivenBufferUpdater.prototype.setUpdateCallback = function(callback) {
        this._updateCallback = callback;
    };

    ClockDrivenBufferUpdater.prototype.update = function() {
        var currentTime = this._clock.currentTime;

        if (!this._bufferStop) {
            this._bufferStop = currentTime;
        }

        if (!this._bufferStart) {
            this._bufferStart = currentTime;
        }

        if (this._handle && (currentTime.lessThan(this._bufferStart) || currentTime.greaterThan(this._bufferStop))) {
            this._handle.abort();
            delete this._handle;
        }

        var bufferSize = this._bufferSize;

        if (!this._handle) {
            if (currentTime.getSecondsDifference(this._bufferStop) < bufferSize) {
                if (currentTime.greaterThan(this._bufferStart)) {
                    this._bufferStart = this._bufferStop = currentTime;
                }

                var start = serializeDate(this._bufferStop);

                this._bufferStop = this._bufferStop.addSeconds(bufferSize * 2);
                var stop = serializeDate(this._bufferStop);

                var step = this._stepSize;

                if (typeof this._updateCallback !== 'undefined') {
                    this._updateCallback(this, false);
                }

                this._query.start = start;
                this._query.stop = stop;
                this._query.step = step;
                var url = this._baseUrl + '?' + ioquery.objectToQuery(this._query);

                var self = this, storeHandle = true, handle = this._bufferFillFunction(this._buffer, url, function() {
                    storeHandle = false;
                    delete self._handle;
                    if (typeof self._updateCallback !== 'undefined') {
                        self._updateCallback(self, true);
                    }
                });
                if (storeHandle) {
                    this._handle = handle;
                }
            }
        }

        if (this._bufferStart.getSecondsDifference(currentTime) > bufferSize) {
            this._bufferStart = currentTime.addSeconds(-bufferSize / 2);
            this._buffer.deleteDataBefore([this._bufferStart.getJulianDayNumber(), this._bufferStart.getSecondsOfDay()]);
        }
    };

    ClockDrivenBufferUpdater.prototype.abort = function() {
        if (this._handle) {
            this._handle.abort();
            delete this._handle;
        }
    };

    return ClockDrivenBufferUpdater;
});