/*global define*/
define(['../Core/DeveloperError',
        './fillIncrementally',
        '../Core/incrementalGet'
    ], function(
         DeveloperError,
         fillIncrementally,
         incrementalGet) {
    "use strict";
    /*global EventSource*/

    /**
     * An updater that uses <a href="http://www.w3.org/TR/eventsource/">EventSource</a> to listen to named events pushed
     * from the server.
     *
     * @alias EventSourceUpdater
     * @constructor
     *
     * @param {CzmlProcessor} czmlProcessor The CZML processor.
     * @param {String} url The url of the document.
     * @param {String} eventName The name of the event in the <a href="http://www.w3.org/TR/eventsource/">EventSource</a> to listen to.
     *
     * @exception {DeveloperError} czmlProcessor is required.
     * @exception {DeveloperError} url is required.
     *
     * @see {CzmlProcessor}
     * @see <a href="http://www.w3.org/TR/eventsource/">EventSource</a>
     */
    var EventSourceUpdater = function EventSourceUpdater(czmlProcessor, url, eventName) {
        if (typeof czmlProcessor === 'undefined') {
            throw new DeveloperError('czmlProcessor is required.');
        }
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }
        this._czmlProcessor = czmlProcessor;
        this._url = url;
        this._eventName = eventName;
        this._currentUrl = undefined;
        this._currentEventName = undefined;
        this._eventSource = undefined;
        this._handle = undefined;
    };

    /**
     * Called during the Cesium update loop.
     * @memberof EventSourceUpdater
     *
     * @param {JulianDate} currentTime The current time of the animation.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamic object collection to update.
     */
    EventSourceUpdater.prototype.update = function(currentTime, dynamicObjectCollection) {
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
                self._czmlProcessor.process(data, dynamicObjectCollection, url);
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
                self._czmlProcessor.process(JSON.parse(e.data), dynamicObjectCollection, url);
            });
        }
        else if (eventNameValue !== this._currentEventName && url === this._currentUrl){
            if(typeof this._currentEventName !== 'undefined'){
                this._eventSource.removeEventListener(this._currentEventName);
            }
            this._currentEventName = eventNameValue;
            this._eventSource.addEventListener(eventNameValue, function (e) {
                self._czmlProcessor.process(JSON.parse(e.data), dynamicObjectCollection, url);
            });
        }
    };

    /**
     * Aborts the connection to the <a href="http://www.w3.org/TR/eventsource/">EventSource</a>.
     * @memberof EventSourceUpdater
     */
    EventSourceUpdater.prototype.abort = function() {
        if(typeof this._eventSource !== 'undefined'){
            this._eventSource.close();
        }
        if(typeof this._handle !== 'undefined'){
            this._handle.abort();
        }
    };

    return EventSourceUpdater;
});