/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA.
     *
     * @exports updateBufferOnEvent
     *
     * @example
     * updateBufferOnEvent("http://localhost/test", function(json){}, function(){});
     */
    var updateBufferOnEvent = function(eventSource, eventName, dynamicObjectCollection, updatedFunction) {
        eventSource.addEventListener(eventName, function (e) {
            if (updatedFunction) {
                updatedFunction(JSON.parse(e.data));
            }
        });
    };

    return updateBufferOnEvent;
});