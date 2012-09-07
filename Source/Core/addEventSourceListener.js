/*global define*/
define(['./DeveloperError'],
        function(DeveloperError) {
    "use strict";

    /**
     * DOC_TBA.
     *
     * @exports addEventSourceListener
     *
     * @exception {DeveloperError} eventSource is required.
     * @exception {DeveloperError} eventName is required.
     * @example
     * addEventSourceListener('http://localhost/test', 'access', function(){});
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