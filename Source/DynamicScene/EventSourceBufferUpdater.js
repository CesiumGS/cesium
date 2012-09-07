/*global define*/
define(['../Core/DeveloperError',
        './fillBufferIncrementally',
        '../Core/addEventSourceListener'
    ], function(
         DeveloperError,
         fillBufferIncrementally,
         addEventSourceListener) {
    "use strict";
    /*global EventSource*/

    /**
     * DOC_TBA
     *
     * @alias EventSourceBufferUpdater
     * @constructor
     * @param {DocumentManager} The document manager.
     * @param {String} The url of the document.
     * @param {Number} [numOfIterations=0] The number of iterations.
     * @param {function} [bufferFillFunction=fillBufferIncrementally] The function used to fill the buffer.
     *
     */
    function EventSourceBufferUpdater(documentManager, baseUrl, eventName) {
        if (typeof documentManager === 'undefined') {
            throw new DeveloperError('documentManager is required.');
        }
        if (typeof baseUrl === 'undefined') {
            throw new DeveloperError('baseUrl is required.');
        }
        if (typeof eventName === 'undefined') {
            throw new DeveloperError('eventName is required.');
        }
        this._documentManager = documentManager;
        this._baseUrl = baseUrl;
        this._eventName = eventName;
        this._currentBaseUrl = undefined;
        this._currentEventName = undefined;
        this._eventSource = undefined;
    }

    /**
     * Called during the Cesium update loop.
     * @param {JulianDate} The current time of the animation.
     * @param {DynamicObjectCollection} The buffer to update.
     */
    EventSourceBufferUpdater.prototype.update = function(currentTime, dynamicObjectCollection) {
        var baseUrl = this._baseUrl.getValue(currentTime);
        var eventName = this._eventName.getValue(currentTime);
        var self = this;
        if(baseUrl !== this._currentBaseUrl || eventName !== this._currentEventName){
            this._currentBaseUrl = baseUrl;
            this._currentEventName = eventName;
            this._eventSource = new EventSource(baseUrl);
            addEventSourceListener(this._eventSource, eventName, function(item){
                self._documentManager.process(item, dynamicObjectCollection, baseUrl);
            });
        }
    };

    /**
     * Aborts the buffer fill function.
     */
    EventSourceBufferUpdater.prototype.abort = function() {
        if(typeof this._eventSource !== 'undefined'){
            this._eventSource.close();
        }
    };

    return EventSourceBufferUpdater;
});