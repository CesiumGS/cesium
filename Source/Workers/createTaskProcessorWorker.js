/*global define*/
define(function() {
    "use strict";

    /**
     * Given a worker function that takes as input a parameters object
     * and an array into which transferrable result objects can be pushed,
     * and returns as output a result object, create an adapter function to handle
     * the TaskProcessor task ID management and response message posting.
     */
    var createTaskProcessorWorker = function(workerFunction) {
        var postMessage;
        var transferableObjects = [];
        var responseMessage = {
            id : undefined,
            result : undefined
        };

        return function(event) {
            /*global self*/
            var data = event.data;

            responseMessage.id = data.id;
            transferableObjects.length = 0;
            responseMessage.result = workerFunction(data.parameters, transferableObjects);

            if (typeof postMessage === 'undefined') {
                postMessage = typeof self.webkitPostMessage !== 'undefined' ? self.webkitPostMessage : self.postMessage;
            }

            postMessage(responseMessage, transferableObjects);
        };
    };

    return createTaskProcessorWorker;
});