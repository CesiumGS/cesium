/*global define*/
define(['../Core/DeveloperError',
        './fillBufferIncrementally',
        '../Core/incrementalGet'
    ], function(
         DeveloperError,
         fillBufferIncrementally,
         incrementalGet) {
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
        this._documentManager = documentManager;
        this._url = url;
        this._eventName = eventName;
        this._currentUrl = undefined;
        this._currentEventName = undefined;
        this._eventSource = undefined;
        this._handle = undefined;
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

        var eventName = this._eventName;
        var eventNameValue;
        if(typeof eventName !== 'undefined'){
            eventNameValue = eventName.getValue(currentTime);
        }

        var self = this;
        if(typeof eventNameValue === 'undefined' && url !== this._currentUrl){
            this._currentUrl = url;
            if(typeof this._handle !== 'undefined'){
                this._handle.abort();
            }
            this._handle = incrementalGet(url, function(data){
                self._documentManager.process(data, dynamicObjectCollection, url);
            });
        }
        else if(eventNameValue !== this._currentEventName && url !== this._currentUrl){
            this._currentUrl = url;
            this._currentEventName = eventNameValue;
            if(typeof this._eventSource !== 'undefined'){
                this._eventSource.close();
            }
            this._eventSource = new EventSource(url);
            this._eventSource.addEventListener(eventNameValue, function (e) {
                self._documentManager.process(JSON.parse(e.data), dynamicObjectCollection, url);
            });
        }
        else if (eventNameValue !== this._currentEventName && url === this._currentUrl){
            if(typeof this._currentEventName !== 'undefined'){
                this._eventSource.removeEventListener(this._currentEventName);
            }
            this._currentEventName = eventNameValue;
            this._eventSource.addEventListener(eventNameValue, function (e) {
                self._documentManager.process(JSON.parse(e.data), dynamicObjectCollection, url);
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
        if(typeof this._handle !== 'undefined'){
            this._handle.abort();
        }
    };

    return EventSourceBufferUpdater;
});