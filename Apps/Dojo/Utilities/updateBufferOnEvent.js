/*global define*/
define(function() {
    "use strict";

    function updateBufferOnEvent(eventSource, eventName, edslBuffer, bufferUpdated) {
        eventSource.addEventListener(eventName, function(e) {
            edslBuffer.addData(JSON.parse(e.data));
            if (bufferUpdated) {
                bufferUpdated();
            }
        });
    }

    return updateBufferOnEvent;
});