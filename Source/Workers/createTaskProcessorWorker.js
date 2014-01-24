/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
        defaultValue,
        defined) {
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
     * return Cesium.createTaskProcessorWorker(doCalculation);
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
            result : undefined,
            error : undefined
        };

        return function(event) {
            /*global self*/
            var data = event.data;

            transferableObjects.length = 0;
            responseMessage.id = data.id;
            responseMessage.error = undefined;
            responseMessage.result = undefined;

            try {
                responseMessage.result = workerFunction(data.parameters, transferableObjects);
            } catch (e) {
                responseMessage.error = e;
            }

            if (!defined(postMessage)) {
                postMessage = defaultValue(self.webkitPostMessage, self.postMessage);
            }

            try {
                postMessage(responseMessage, transferableObjects);
            } catch (e) {
                // something went wrong trying to post the message, post a simpler
                // error that we can be sure will be cloneable
                responseMessage.result = undefined;
                responseMessage.error = 'postMessage failed with error: ' + e + '\n  with responseMessage: ' + JSON.stringify(responseMessage);
                postMessage(responseMessage);
            }
        };
    };

    return createTaskProcessorWorker;
});