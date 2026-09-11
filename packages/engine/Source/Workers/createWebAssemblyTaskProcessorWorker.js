import {
  createTaskMessageHandler,
  onWorkerMessageError,
  serializeWorkerError,
} from "./createTaskProcessorWorker.js";
import TrustedServers from "../Core/TrustedServers.js";

/**
 * Creates an adapter function to allow a WebAssembly initialization function
 * and a calculation function to operate as a Web Worker, paired with
 * {@link WebAssemblyTaskProcessor}.
 *
 * The first message a worker built with this function receives loads and
 * compiles a WebAssembly module. Every later message is an ordinary task,
 * handled the same way {@link createTaskProcessorWorker} handles it.
 *
 * @function createWebAssemblyTaskProcessorWorker
 *
 * @param {createWebAssemblyTaskProcessorWorker.InitializeWebAssemblyFunction} initializeWebAssembly Loads and compiles the WebAssembly module described by the posted configuration.
 * @param {createTaskProcessorWorker.WorkerFunction} workerFunction The calculation function,
 *        which takes parameters and returns a result.
 * @returns {createTaskProcessorWorker.TaskProcessorWorkerFunction} A function that adapts the
 *          calculation function to work as a Web Worker onmessage listener with WebAssemblyTaskProcessor.
 *
 * @example
 * async function initializeWebAssembly(webAssemblyConfig) {
 *   const wasmBinary = await fetchWebAssemblyBinary(webAssemblyConfig);
 *   myModule = await createMyModule({ wasmBinary: wasmBinary });
 *   return true;
 * }
 *
 * function doCalculation(parameters, transferableObjects) {
 *   // calculate some result using myModule and the inputs in parameters
 *   return result;
 * }
 *
 * return Cesium.createWebAssemblyTaskProcessorWorker(initializeWebAssembly, doCalculation);
 *
 * @see WebAssemblyTaskProcessor
 * @see createTaskProcessorWorker
 */
function createWebAssemblyTaskProcessorWorker(
  initializeWebAssembly,
  workerFunction,
) {
  const handleTaskMessage = createTaskMessageHandler(workerFunction);

  async function onMessageHandler(event) {
    const { data } = event;

    if (data.type !== "initializeWebAssembly") {
      return handleTaskMessage(event);
    }

    self.CESIUM_BASE_URL = data.baseUrl;
    TrustedServers.unpack(data.trustedServers ?? []);

    const responseMessage = {
      type: "initializeWebAssembly",
      id: data.id,
      result: undefined,
      error: undefined,
    };

    try {
      responseMessage.result = await initializeWebAssembly(
        data.webAssemblyConfig,
      );
    } catch (error) {
      responseMessage.error = serializeWorkerError(error);
    }

    postMessage(responseMessage);
  }

  self.onmessage = onMessageHandler;
  self.onmessageerror = onWorkerMessageError;
  return self;
}

/**
 * A function that loads and compiles a WebAssembly module in a Web Worker.
 * @callback createWebAssemblyTaskProcessorWorker.InitializeWebAssemblyFunction
 *
 * @param {WebAssemblyConfig} webAssemblyConfig The configuration posted by {@link WebAssemblyTaskProcessor#initialize}.
 * @returns {*} A result reported back to {@link WebAssemblyTaskProcessor#initialize}.
 */

export default createWebAssemblyTaskProcessorWorker;
