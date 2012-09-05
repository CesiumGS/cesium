/*global define*/
define(['./fillBufferIncrementally'
    ], function(
         fillBufferIncrementally) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias SystemClockDrivenBufferUpdater
     * @constructor
     * @param {DocumentManager} The document manager.
     * @param {String} The url of the document.
     * @param {Number} [numOfIterations=0] The number of iterations.
     * @param {function} [bufferFillFunction=fillBufferIncrementally] The function used to fill the buffer.
     *
     */
    function SystemClockDrivenBufferUpdater(documentManager, baseUrl, refreshRate, bufferFillFunction) {
        if (typeof bufferFillFunction === 'undefined') {
            bufferFillFunction = fillBufferIncrementally;
        }

        this._documentManager = documentManager;
        this._refreshRate = refreshRate;
        this._bufferFillFunction = bufferFillFunction;
        this._baseUrl = baseUrl;
        this._lastUpdateTime = new Date();
    }

    /**
     * Called during the Cesium update loop.
     * @param {JulianDate} The current time of the animation.
     * @param {DynamicObjectCollection} The buffer to update.
     */
    SystemClockDrivenBufferUpdater.prototype.update = function(currentTime, dynamicObjectCollection) {
        var now = new Date();
        if(typeof this._lastUpdateTime === 'undefined' || now.valueOf() >= this._lastUpdateTime.valueOf() + this._refreshRate.getValue(currentTime) * 1000){
            this._lastUpdateTime = now;
            if (typeof this._handle === 'undefined') {
                var self = this;
                var storeHandle = true;
                var handle = this._bufferFillFunction(dynamicObjectCollection, this._baseUrl.getValue(currentTime),
                        function(item, buffer, url){
                            self._documentManager.process(item, buffer, url);
                        },
                        function(czmlData) {
                            storeHandle = false;
                            self._handle = undefined;
                        }
                );
                if (storeHandle) {
                    this._handle = handle;
                }
            }
        }
    };

    /**
     * Aborts the buffer fill function.
     */
    SystemClockDrivenBufferUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle.abort();
            this._handle = undefined;
        }
    };

    return SystemClockDrivenBufferUpdater;
});