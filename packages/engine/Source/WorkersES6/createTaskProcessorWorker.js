import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import formatError from "../Core/formatError.js";

// createXXXGeometry functions may return Geometry or a Promise that resolves to Geometry
// if the function requires access to ApproximateTerrainHeights.
// For fully synchronous functions, just wrapping the function call in a Promise doesn't
// handle errors correctly, hence try-catch
function callAndWrap(workerFunction, parameters, transferableObjects) {
  let resultOrPromise;
  try {
    resultOrPromise = workerFunction(parameters, transferableObjects);
    return resultOrPromise; // errors handled by Promise
  } catch (e) {
    return Promise.reject(e);
  }
}

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
  let postMessage;

  return function (event) {
    const data = event.data;

    const transferableObjects = [];
    const responseMessage = {
      id: data.id,
      result: undefined,
      error: undefined,
    };

    return Promise.resolve(
      callAndWrap(workerFunction, data.parameters, transferableObjects)
    )
      .then(function (result) {
        responseMessage.result = result;
      })
      .catch(function (e) {
        if (e instanceof Error) {
          // Errors can't be posted in a message, copy the properties
          responseMessage.error = {
            name: e.name,
            message: e.message,
            stack: e.stack,
          };
        } else {
          responseMessage.error = e;
        }
      })
      .finally(function () {
        if (!defined(postMessage)) {
          postMessage = defaultValue(self.webkitPostMessage, self.postMessage);
        }

        if (!data.canTransferArrayBuffer) {
          transferableObjects.length = 0;
        }

        try {
          postMessage(responseMessage, transferableObjects);
        } catch (e) {
          // something went wrong trying to post the message, post a simpler
          // error that we can be sure will be cloneable
          responseMessage.result = undefined;
          responseMessage.error = `postMessage failed with error: ${formatError(
            e
          )}\n  with responseMessage: ${JSON.stringify(responseMessage)}`;
          postMessage(responseMessage);
        }
      });
  };
}

/**
 * A function that performs a calculation in a Web Worker.
 * @callback createTaskProcessorWorker.WorkerFunction
 *
 * @param {Object} parameters Parameters to the calculation.
 * @param {Array} transferableObjects An array that should be filled with references to objects inside
 *        the result that should be transferred back to the main document instead of copied.
 * @returns {Object} The result of the calculation.
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
 * @param {Object} event The onmessage event object.
 */
export default createTaskProcessorWorker;
