/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        './fillBufferIncrementally'
    ], function(
         DeveloperError,
         defaultValue,
         fillBufferIncrementally) {
    "use strict";

    /**
     * A buffer updater that updates for a certain number of iterations.
     *
     * @alias IterationDrivenBufferUpdater
     * @constructor
     *
     * @param {DocumentManager} documentManager The document manager.
     * @param {String} url The url of the document.
     * @param {Number} [numOfIterations=0] The number of iterations.
     * @param {function} [bufferFillFunction={@link fillBufferIncrementally}] The function used to fill the buffer.
     *
     * @exception {DeveloperError} documentManager is required.
     * @exception {DeveloperError} url is required.
     *
     */
    var IterationDrivenBufferUpdater = function IterationDrivenBufferUpdater(documentManager, url, numOfIterations, bufferFillFunction) {
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
        this._numOfIterations = defaultValue(numOfIterations, 1);
        this._currentIteration = 0;
        this._bufferFillFunction = bufferFillFunction;
        this._url = url;
    };

    /**
     * Called during the Cesium update loop.
     * @memberof IterationDrivenBufferUpdater
     *
     * @param {JulianDate} currentTime The current time of the animation.
     * @param {DynamicObjectCollection} dynamicObjectCollection The buffer to update.
     */
    IterationDrivenBufferUpdater.prototype.update = function(time, dynamicObjectCollection) {
        if(this._currentIteration < this._numOfIterations){
            if (typeof this._handle === 'undefined') {
                var self = this;
                var storeHandle = true;
                var handle = this._bufferFillFunction(dynamicObjectCollection, this._url.getValue(time),
                        function(item, buffer, url){
                            self._documentManager.process(item, buffer, url);
                        },
                        function(czmlData) {
                            storeHandle = false;
                            self._handle = undefined;
                            ++self._currentIteration;
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
     * @memberof IterationDrivenBufferUpdater
     */
    IterationDrivenBufferUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle.abort();
            this._handle = undefined;
        }
    };

    return IterationDrivenBufferUpdater;
});