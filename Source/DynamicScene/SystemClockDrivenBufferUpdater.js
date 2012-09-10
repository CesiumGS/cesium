/*global define*/
define(['../Core/DeveloperError',
        '../Core/defaultValue',
        './fillBufferIncrementally'
    ], function(
         DeveloperError,
         defaultValue,
         fillBufferIncrementally) {
    "use strict";

    /**
     * A buffer updater that updates based on the system clock.
     *
     * @alias SystemClockDrivenBufferUpdater
     * @constructor
     *
     * @param {DocumentManager} documentManager The document manager.
     * @param {String} url The url of the document.
     * @param {Number} refreshRate The time in seconds to refresh the buffer.
     * @param {function} [bufferFillFunction={@link fillBufferIncrementally}] The function used to fill the buffer.
     *
     * @exception {DeveloperError} documentManager is required.
     * @exception {DeveloperError} url is required.
     *
     * @see fillBufferIncrementally
     */
    var SystemClockDrivenBufferUpdater = function SystemClockDrivenBufferUpdater(documentManager, url, refreshRate, bufferFillFunction) {
        if (typeof documentManager === 'undefined') {
            throw new DeveloperError('documentManager is required.');
        }
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        if (typeof bufferFillFunction === 'undefined') {
            bufferFillFunction = fillBufferIncrementally;
        }

        this._documentManager = documentManager;
        this._refreshRate = defaultValue(refreshRate, 60);//default to 60 seconds
        this._bufferFillFunction = bufferFillFunction;
        this._url = url;
        this._lastUpdateTime = new Date();
    };

    /**
     * Called during the Cesium update loop.
     * @memberof SystemClockDrivenBufferUpdater
     *
     * @param {JulianDate} currentTime The current time of the animation.
     * @param {DynamicObjectCollection} dynamicObjectCollection The buffer to update.
     */
    SystemClockDrivenBufferUpdater.prototype.update = function(currentTime, dynamicObjectCollection) {
        var now = new Date();
        if(typeof this._lastUpdateTime === 'undefined' || now.valueOf() >= this._lastUpdateTime.valueOf() + this._refreshRate.getValue(currentTime) * 1000){
            this._lastUpdateTime = now;
            if (typeof this._handle === 'undefined') {
                var self = this;
                var storeHandle = true;
                var handle = this._bufferFillFunction(dynamicObjectCollection, this._url.getValue(currentTime),
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
     * @memberof SystemClockDrivenBufferUpdater
     */
    SystemClockDrivenBufferUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle.abort();
            this._handle = undefined;
        }
    };

    return SystemClockDrivenBufferUpdater;
});