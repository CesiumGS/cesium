import formatError from "../Core/formatError.js";

/**
 * Creates an adapter function to allow a calculation function to operate as a Web Worker,
 * paired with TaskProcessor, to receive tasks and return results.
 *
 * @function createTaskProcessorWorker
 *
 * @param {createTaskProcessorWorker.WorkerFunction} workerFunction The calculation function,
 *        which takes parameters and returns a result.
 * @returns {createTaskProcessorWorker.TaskProcessorWorkerFunction} A function that adapts the
 *          calculation function to work as a Web Worker onmessage listener with TaskProcessor.
 *
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
 * @see {@link http://www.w3.org/TR/workers/|Web Workers}
 * @see {@link http://www.w3.org/TR/html5/common-dom-interfaces.html#transferable-objects|Transferable objects}
 */
function createTaskProcessorWorker(workerFunction) {
  async function onMessageHandler({ data }) {
    const transferableObjects = [];
    const responseMessage = {
      id: data.id,
      result: undefined,
      error: undefined,
    };

    self.CESIUM_BASE_URL = data.baseUrl;

    try {
      const result = await workerFunction(data.parameters, transferableObjects);
      responseMessage.result = result;
    } catch (error) {
      if (error instanceof Error) {
        responseMessage.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        responseMessage.error = error;
      }
    }

    if (!data.canTransferArrayBuffer) {
      transferableObjects.length = 0;
    }

    try {
      postMessage(responseMessage, transferableObjects);
    } catch (error) {
      // something went wrong trying to post the message, post a simpler
      // error that we can be sure will be cloneable
      responseMessage.result = undefined;
      responseMessage.error = `postMessage failed with error: ${formatError(
        error,
      )}\n  with responseMessage: ${JSON.stringify(responseMessage)}`;
      postMessage(responseMessage);
    }
  }

  function onMessageErrorHandler(event) {
    postMessage({
      id: event.data?.id,
      error: `postMessage failed with error: ${JSON.stringify(event)}`,
    });
  }

  self.onmessage = onMessageHandler;
  self.onmessageerror = onMessageErrorHandler;
  return self;
}

/**
 * A function that performs a calculation in a Web Worker.
 * @callback createTaskProcessorWorker.WorkerFunction
 *
 * @param {object} parameters Parameters to the calculation.
 * @param {Array} transferableObjects An array that should be filled with references to objects inside
 *        the result that should be transferred back to the main document instead of copied.
 * @returns {object} The result of the calculation.
 *
 * @example
 * function calculate(parameters, transferableObjects) {
 *   // perform whatever calculation is necessary.
 *   const typedArray = new Float32Array(0);
 *
 *   // typed arrays are transferable
 *   transferableObjects.push(typedArray)
 *
 *   return {
 *      typedArray : typedArray
 *   };
 * }
 */

/**
 * A Web Worker message event handler function that handles the interaction with TaskProcessor,
 * specifically, task ID management and posting a response message containing the result.
 * @callback createTaskProcessorWorker.TaskProcessorWorkerFunction
 *
 * @param {object} event The onmessage event object.
 */
export default createTaskProcessorWorker;
