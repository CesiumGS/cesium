/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
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
     * @param {DynamicProperty} urlProperty A dynamic property whose value is the URL of the event stream.
     * @param {DynamicProperty} [eventNameProperty] A dynamic property whose value is the name of the
     * event in the stream to listen to.  If the property is undefined, or has a value of undefined,
     * all messages on the stream will be interpreted as CZML packets.
     *
     * @exception {DeveloperError} czmlProcessor is required.
     * @exception {DeveloperError} url is required.
     *
     * @see CzmlProcessor
     * @see <a href="http://www.w3.org/TR/eventsource/">EventSource</a>
     */
    var EventSourceUpdater = function EventSourceUpdater(czmlProcessor, urlProperty, eventNameProperty) {
        if (typeof czmlProcessor === 'undefined') {
            throw new DeveloperError('czmlProcessor is required.');
        }
        if (typeof urlProperty === 'undefined') {
            throw new DeveloperError('urlProperty is required.');
        }

        this._czmlProcessor = czmlProcessor;
        this._urlProperty = urlProperty;
        this._eventNameProperty = eventNameProperty;
        this._currentUrl = undefined;
        this._currentEventName = undefined;
        this._eventSource = undefined;
    };

    /**
     * Called during the Cesium update loop.
     * @memberof EventSourceUpdater
     *
     * @param {JulianDate} currentTime The current time of the animation.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamic object collection to update.
     */
    EventSourceUpdater.prototype.update = function(currentTime, dynamicObjectCollection) {
        var eventSource = this._eventSource;
        var url = this._urlProperty.getValue(currentTime);
        if (url !== this._currentUrl) {
            // connect, or re-connect
            if (typeof eventSource !== 'undefined') {
                eventSource.close();
            }
            eventSource = new EventSource(url);
            this._eventSource = eventSource;
        }

        // use a default message type of 'message' if no event name is specified
        var eventName = 'message';
        var eventNameProperty = this._eventNameProperty;
        if (typeof eventNameProperty !== 'undefined') {
            eventName = eventNameProperty.getValue(currentTime);
        }

        if (eventName !== this._currentEventName) {
            // attach, or re-attach, event listeners
            if (typeof this._currentEventName !== 'undefined') {
                eventSource.removeEventListener(this._currentEventName);
            }

            this._currentEventName = eventName;

            var czmlProcessor = this._czmlProcessor;
            eventSource.addEventListener(eventName, function(e) {
                czmlProcessor.process(JSON.parse(e.data), dynamicObjectCollection, url);
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