/*global define*/
define(['./DeveloperError'],
        function(DeveloperError) {
    "use strict";

    /**
     * Adds an event listener to an existing EventSource.
     *
     * @exports addEventSourceListener
     *
     * @exception {DeveloperError} eventSource is required.
     * @exception {DeveloperError} eventName is required.
     * @example
     * addEventSourceListener(new EventSource('http://localhost/test'), 'access', function(){});
     */
    var addEventSourceListener = function(eventSource, eventName, updatedFunction) {
        if (typeof eventSource === 'undefined') {
            throw new DeveloperError('eventName is required.');
        }
        if (typeof eventName === 'undefined') {
            throw new DeveloperError('eventName is required.');
        }
        eventSource.addEventListener(eventName, function (e) {
            if (updatedFunction) {
                updatedFunction(JSON.parse(e.data));
            }
        });
    };

    return addEventSourceListener;
});