/*global define*/
define(['./fillBufferIncrementally'
    ], function(
         fillBufferIncrementally) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias IterationDrivenBufferUpdater
     * @constructor
     * @param {DocumentManager} The document manager.
     * @param {String} The url of the document.
     * @param {Number} [numOfIterations=0] The number of iterations.
     * @param {function} [bufferFillFunction=fillBufferIncrementally] The function used to fill the buffer.
     *
     */
    function IterationDrivenBufferUpdater(documentManager, baseUrl, numOfIterations, bufferFillFunction) {
        if (typeof bufferFillFunction === 'undefined') {
            bufferFillFunction = fillBufferIncrementally;
        }
        this._documentManager = documentManager;
        this._numOfIterations = numOfIterations;
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