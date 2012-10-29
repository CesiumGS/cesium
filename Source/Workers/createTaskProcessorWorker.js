/*global define*/
define(function() {
    "use strict";

    /**
     * Creates an adapter function to allow a calculation function to operate as a Web Worker,
     * paired with TaskProcessor, to receive tasks and return results.
     *
     * @exports createTaskProcessorWorker
     *
     * @param {Function} workerFunction A function that takes as input two arguments:
     * a parameters object, and an array into which transferable result objects can be pushed,
     * and returns as output a result object.
     * @returns {Function} An adapter function that handles the interaction with TaskProcessor,
     * specifically, task ID management and posting a response message containing the result.
     *
     * @example
     * function doCalculation(parameters, transferableObjects) {
     *   // calculate some result using the inputs in parameters
     *   return result;
     * }
     *
     * return createTaskProcessorWorker(doCalculation);
     * // the resulting function is compatible with TaskProcessor
     *
     * @see TaskProcessor
     * @see <a href='http://www.w3.org/TR/workers/'>Web Workers</a>
     * @see <a href='http://www.w3.org/TR/html5/common-dom-interfaces.html#transferable-objects'>Transferable objects</a>
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