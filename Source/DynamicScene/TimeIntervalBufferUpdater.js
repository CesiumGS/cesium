/*global define*/
define(['./fillBufferIncrementally',
        '../Core/uriQuery',
        './serializeDate'
       ], function(
         fillBufferIncrementally,
         uriQuery,
         serializeDate) {
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
    function TimeIntervalBufferUpdater(documentManager, baseUrl, bufferFillFunction) {
        if (typeof bufferFillFunction === 'undefined') {
            bufferFillFunction = fillBufferIncrementally;
        }

        this._documentManager = documentManager;
        this._bufferFillFunction = bufferFillFunction;

        var queryIndex = baseUrl.indexOf('?');
        if (queryIndex >= 0) {
            this._query = uriQuery.queryToObject(baseUrl);
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
        var url = this._baseUrl + '?' + uriQuery.objectToQuery(this._query);

        var self = this, storeHandle = true, handle = this._bufferFillFunction(this._buffer, url, function() {
            storeHandle = false;
            self._handle = undefined;
        });
        if (storeHandle) {
            this._handle = handle;
        }
    };


    /**
     * Called during the Cesium update loop.
     * @param {JulianDate} The current time of the animation.
     * @param {DynamicObjectCollection} The buffer to update.
     */
    TimeIntervalBufferUpdater.prototype.update = function(currentTime){

    };

    /**
     * Aborts the buffer fill function.
     */
    TimeIntervalBufferUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle.abort();
            this._handle = undefined;
        }
    };

    return TimeIntervalBufferUpdater;
});