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
     * A buffer updater that updates a certain number of iterations.
     *
     * @alias IterationDrivenBufferUpdater
     * @constructor
     * @param {DocumentManager} The document manager.
     * @param {String} The url of the document.
     * @param {Number} [numOfIterations=0] The number of iterations.
     * @param {function} [bufferFillFunction=fillBufferIncrementally] The function used to fill the buffer.
     * @exception {DeveloperError} documentManager is required.
     * @exception {DeveloperError} baseUrl is required.
     *
     */
    function IterationDrivenBufferUpdater(documentManager, baseUrl, numOfIterations, bufferFillFunction) {
        if (typeof documentManager === 'undefined') {
            throw new DeveloperError('documentManager is required.');
        }
        if (typeof baseUrl === 'undefined') {
            throw new DeveloperError('baseUrl is required.');
        }
        if (typeof bufferFillFunction === 'undefined') {
            bufferFillFunction = fillBufferIncrementally;
        }
        this._documentManager = documentManager;
        this._numOfIterations = defaultValue(numOfIterations, 1);
        this._currentIteration = 0;
        this._bufferFillFunction = bufferFillFunction;
        this._baseUrl = baseUrl;
    }

    /**
     * Called during the Cesium update loop.
     * @param {JulianDate} The current time of the animation.
     * @param {DynamicObjectCollection} The buffer to update.
     */
    IterationDrivenBufferUpdater.prototype.update = function(time, dynamicObjectCollection) {
        if(this._currentIteration < this._numOfIterations){
            if (typeof this._handle === 'undefined') {
                var self = this;
                var storeHandle = true;
                var handle = this._bufferFillFunction(dynamicObjectCollection, this._baseUrl.getValue(time),
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
     */
    IterationDrivenBufferUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle.abort();
            this._handle = undefined;
        }
    };

    return IterationDrivenBufferUpdater;
});