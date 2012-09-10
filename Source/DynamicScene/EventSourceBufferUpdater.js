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
     * An updater that uses <a href="http://www.w3.org/TR/eventsource/">EventSource</a> to listen to named events pushed
     * from the server.
     *
     * @alias EventSourceBufferUpdater
     * @constructor
     *
     * @param {DocumentManager} documentManager The document manager.
     * @param {String} url The url of the document.
     * @param {String} eventName The name of the event in the <a href="http://www.w3.org/TR/eventsource/">EventSource</a> to listen to.
     *
     * @exception {DeveloperError} documentManager is required.
     * @exception {DeveloperError} url is required.
     * @exception {DeveloperError} eventName is required.
     *
     * @see {DocumentManager}
     * @see <a href="http://www.w3.org/TR/eventsource/">EventSource</a>
     */
    var EventSourceBufferUpdater = function EventSourceBufferUpdater(documentManager, url, eventName) {
        if (typeof documentManager === 'undefined') {
            throw new DeveloperError('documentManager is required.');
        }
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }
        if (typeof eventName === 'undefined') {
            throw new DeveloperError('eventName is required.');
        }
        this._documentManager = documentManager;
        this._url = url;
        this._eventName = eventName;
        this._currentUrl = undefined;
        this._currentEventName = undefined;
        this._eventSource = undefined;
    };

    /**
     * Called during the Cesium update loop.
     * @memberof EventSourceBufferUpdater
     *
     * @param {JulianDate} currentTime The current time of the animation.
     * @param {DynamicObjectCollection} dynamicObjectCollection The buffer to update.
     */
    EventSourceBufferUpdater.prototype.update = function(currentTime, dynamicObjectCollection) {
        var url = this._url.getValue(currentTime);
        var eventName = this._eventName.getValue(currentTime);
        var self = this;
        if(url !== this._currentUrl || eventName !== this._currentEventName){
            this._currentUrl = url;
            this._currentEventName = eventName;
            this._eventSource = new EventSource(url);
            addEventSourceListener(this._eventSource, eventName, function(item){
                self._documentManager.process(item, dynamicObjectCollection, url);
            });
        }
    };

    /**
     * Aborts the buffer fill function.
     * @memberof EventSourceBufferUpdater
     */
    EventSourceBufferUpdater.prototype.abort = function() {
        if(typeof this._eventSource !== 'undefined'){
            this._eventSource.close();
        }
    };

    return EventSourceBufferUpdater;
});