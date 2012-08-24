/*global define*/
define(['./fillBufferIncrementally'
    ], function(
         fillBufferIncrementally) {
    "use strict";

    function SystemClockDrivenBufferUpdater(buffer, baseUrl, refreshRate, updaterFunctions, bufferFillFunction) {
        if (typeof bufferFillFunction === 'undefined') {
            bufferFillFunction = fillBufferIncrementally;
        }

        this._refreshRate = refreshRate;
        this._buffer = buffer;
        this._bufferFillFunction = bufferFillFunction;
        this._baseUrl = baseUrl;
        this._updaterFunctions = updaterFunctions;
        this._lastUpdateTime = undefined;
        this._compareTime = new Date();
    }

    SystemClockDrivenBufferUpdater.prototype.getStartTime = function() {
        return this._lastUpdateTime;
    };

    SystemClockDrivenBufferUpdater.prototype.getStopTime = function() {
        return this._lastUpdateTime;
    };

    SystemClockDrivenBufferUpdater.prototype.update = function() {
        var currentTime = new Date();
        if(typeof this._lastUpdateTime === 'undefined' || currentTime.valueOf() >= this._lastUpdateTime.valueOf() + this._refreshRate){
            this._lastUpdateTime = currentTime;
            if (typeof this._handle === 'undefined') {
                var self = this;
                var storeHandle = true;
                var handle = this._bufferFillFunction(this._buffer, this._baseUrl, this._updaterFunctions, function() {
                    storeHandle = false;
                    self._handle = undefined;
                });
                if (storeHandle) {
                    this._handle = handle;
                }
            }
        }
    };

    SystemClockDrivenBufferUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle.abort();
            this._handle = undefined;
        }
    };

    return SystemClockDrivenBufferUpdater;
});