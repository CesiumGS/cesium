/*global define*/
define(['./DeveloperError'],
        function(DeveloperError) {
    "use strict";

    /**
     * Adds an event listener to an existing EventSource. EventSource is a API for opening an HTTP connection for
     * receiving push notifications from a server in the form of DOM events.
     *
     * @exports addEventSourceListener
     *
     * @param {EventSource} eventSource The EventSource to add an event listener to.
     * @param {String} eventName The event to listen to.
     * @param {Function} updatedFunction The function to call when the event is received.
     *
     * @exception {DeveloperError} eventSource is required.
     * @exception {DeveloperError} eventName is required.
     *
     * @example
     * addEventSourceListener(new EventSource('http://localhost/test'), 'access', function(czml){
     *  //process czml
     * });
     *
     * @see <a href="http://www.w3.org/TR/eventsource/">EventSource</a>
     * @see incrementalGet
     */
    var addEventSourceListener = function(eventSource, eventName, updatedFunction) {
        if (typeof eventSource === 'undefined') {
            throw new DeveloperError('eventName is required.');
        }
        if (typeof eventName === 'undefined') {
            throw new DeveloperError('eventName is required.');
        }
        eventSource.addEventListener(eventName, function (e) {
            if (typeof updatedFunction !== 'undefined') {
                updatedFunction(JSON.parse(e.data));
            }
        });
    };

    return addEventSourceListener;
});