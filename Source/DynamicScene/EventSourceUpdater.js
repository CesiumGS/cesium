/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue'
    ], function(
        DeveloperError,
        defaultValue) {
    "use strict";
    /*global EventSource*/

    /**
     * An updater that uses an <a href="http://www.w3.org/TR/eventsource/">EventSource</a> to
     * listen to events containing CZML packets streamed from a server.
     *
     * @alias EventSourceUpdater
     * @constructor
     *
     * @param {CzmlProcessor} czmlProcessor The CZML processor.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamic object collection to update.
     * @param {DynamicExternalDocument} dynamicExternalDocument The external properties used by the EventSourceUpdater.
     *
     * @exception {DeveloperError} czmlProcessor is required.
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} dynamicExternalDocument is required.
     *
     * @see CzmlProcessor
     * @see <a href="http://www.w3.org/TR/eventsource/">EventSource</a>
     */
    var EventSourceUpdater = function EventSourceUpdater(czmlProcessor, dynamicObjectCollection, dynamicExternalDocument) {
        if (typeof czmlProcessor === 'undefined') {
            throw new DeveloperError('czmlProcessor is required.');
        }
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if (typeof dynamicExternalDocument === 'undefined') {
            throw new DeveloperError('dynamicExternalDocument is required.');
        }

        this._czmlProcessor = czmlProcessor;
        this._dynamicObjectCollection = dynamicObjectCollection;
        this._urlProperty = dynamicExternalDocument.url;
        this._eventNameProperty = dynamicExternalDocument.eventname;
        this._currentUrl = undefined;
        this._currentEventName = undefined;
        this._eventSource = undefined;
    };

    /**
     * Called during the Cesium update loop.
     * @memberof EventSourceUpdater
     *
     * @param {JulianDate} currentTime The current time of the animation.
     *
     * @exception {DeveloperError} currentTime is required.
     */
    EventSourceUpdater.prototype.update = function(currentTime) {
        if (typeof currentTime === 'undefined') {
            throw new DeveloperError('currentTime is required.');
        }

        var eventSource = this._eventSource;
        var url = this._urlProperty.getValue(currentTime);
        if (url !== this._currentUrl) {
            // connect, or re-connect
            if (typeof eventSource !== 'undefined') {
                eventSource.close();
            }
            eventSource = new EventSource(url);
            this._eventSource = eventSource;
            this._currentUrl = url;
        }

        // use a default message type of 'message' if no event name is specified
        var eventName = 'message';
        var eventNameProperty = this._eventNameProperty;
        if (typeof eventNameProperty !== 'undefined') {
            eventName = defaultValue(eventNameProperty.getValue(currentTime), eventName);
        }

        if (eventName !== this._currentEventName) {
            // attach, or re-attach, event listeners
            if (typeof this._currentEventName !== 'undefined') {
                eventSource.removeEventListener(this._currentEventName);
            }

            this._currentEventName = eventName;

            var czmlProcessor = this._czmlProcessor;
            var self = this;
            eventSource.addEventListener(eventName, function(e) {
                czmlProcessor.process(JSON.parse(e.data), self._dynamicObjectCollection, url);
            });
        }
    };

    /**
     * Closes the connection to the event stream.
     *
     * @memberof EventSourceUpdater
     */
    EventSourceUpdater.prototype.abort = function() {
        if (typeof this._eventSource !== 'undefined') {
            this._eventSource.close();
        }
    };

    return EventSourceUpdater;
});