import buildModuleUrl from "./buildModuleUrl.js";
import defined from "./defined.js";
import FeatureDetection from "./FeatureDetection.js";
import RuntimeError from "./RuntimeError.js";
import TaskProcessor, {
  canTransferArrayBuffer,
  cleanupWorker,
  createProcessorWorker,
  deserializeWorkerError,
  scheduleWorkerTask,
  settleTask,
} from "./TaskProcessor.js";
import TrustedServers from "./TrustedServers.js";

// Reserved so the initialization handshake can reuse TaskProcessor's pending
// task bookkeeping without colliding with a real task id, which only ever
// counts up from 0.
const INITIALIZE_TASK_ID = -1;

function getWebAssemblyLoaderConfig(workerPath, wasmOptions) {
  const config = {
    modulePath: undefined,
    wasmBinaryFile: undefined,
  };

  // Web assembly not supported, use fallback js module if provided
  if (!FeatureDetection.supportsWebAssembly()) {
    if (!defined(wasmOptions.fallbackModulePath)) {
      throw new RuntimeError(
        `This browser does not support Web Assembly, and no backup module was provided for ${workerPath}`,
      );
    }

    config.modulePath = buildModuleUrl(wasmOptions.fallbackModulePath);
    return config;
  }

  // Only the resolved url is sent. The worker requests and compiles the binary
  // itself so that WebAssembly is never handled by the document, allowing
  // applications to scope `wasm-unsafe-eval` to worker responses.
  config.wasmBinaryFile = buildModuleUrl(wasmOptions.wasmBinaryFile);
  if (defined(wasmOptions.modulePath)) {
    config.modulePath = buildModuleUrl(wasmOptions.modulePath);
  }

  return config;
}

async function initialize(processor) {
  const worker = (processor._worker = createProcessorWorker(processor));

  const promise = new Promise((resolve, reject) => {
    const listener = ({ data }) => {
      if (!defined(data) || data.id !== INITIALIZE_TASK_ID) {
        return;
      }

      if (
        !Object.prototype.hasOwnProperty.call(data, "result") &&
        !Object.prototype.hasOwnProperty.call(data, "error")
      ) {
        settleTask(
          processor,
          INITIALIZE_TASK_ID,
          new RuntimeError("Could not configure wasm module"),
        );
      } else if (defined(data.error)) {
        settleTask(
          processor,
          INITIALIZE_TASK_ID,
          deserializeWorkerError(data.error),
        );
      } else {
        settleTask(processor, INITIALIZE_TASK_ID, undefined, data.result);
      }
    };

    processor._pendingTasks.set(INITIALIZE_TASK_ID, {
      worker: worker,
      listener: listener,
      resolve: resolve,
      reject: reject,
    });
    worker.addEventListener("message", listener);
  });

  try {
    const canTransfer = await canTransferArrayBuffer();
    if (!processor._pendingTasks.has(INITIALIZE_TASK_ID)) {
      // Already settled, e.g. the worker failed while the transfer probe ran.
      return promise;
    }

    worker.postMessage({
      type: "initializeWebAssembly",
      id: INITIALIZE_TASK_ID,
      baseUrl: buildModuleUrl.getCesiumBaseUrl().url,
      trustedServers: TrustedServers.pack(),
      canTransferArrayBuffer: canTransfer,
      webAssemblyConfig: processor._webAssemblyConfig,
    });
  } catch (error) {
    settleTask(processor, INITIALIZE_TASK_ID, error);
  }

  return promise;
}

/**
 * A {@link TaskProcessor} whose worker also loads and compiles a WebAssembly
 * module before it can accept ordinary tasks.
 *
 * The worker itself requests and compiles the WebAssembly binary, so the
 * document never fetches or compiles WebAssembly; only the resolved binary
 * URL is posted to the worker. Pair the worker side with
 * {@link createWebAssemblyTaskProcessorWorker}.
 *
 * {@link WebAssemblyTaskProcessor#initialize} must resolve before the first
 * call to {@link TaskProcessor#scheduleTask}. If the worker fails after a
 * successful initialization, the next scheduled task transparently
 * reinitializes a replacement worker first.
 *
 * @alias WebAssemblyTaskProcessor
 * @constructor
 * @extends TaskProcessor
 *
 * @param {string} workerPath The Url to the worker. This can either be an absolute path or relative to the Cesium Workers folder.
 * @param {object} webAssemblyOptions An object with the following properties:
 * @param {string} [webAssemblyOptions.modulePath] The path of the web assembly JavaScript wrapper module.
 * @param {string} [webAssemblyOptions.wasmBinaryFile] The path of the web assembly binary file.
 * @param {string} [webAssemblyOptions.fallbackModulePath] The path of the fallback JavaScript module to use if web assembly is not supported.
 * @param {number} [maximumActiveTasks=Number.POSITIVE_INFINITY] The maximum number of active tasks.  Once exceeded,
 *                                        scheduleTask will not queue any more tasks, allowing
 *                                        work to be rescheduled in future frames.
 *
 * @exception {RuntimeError} This browser does not support Web Assembly, and no backup module was provided
 */
function WebAssemblyTaskProcessor(
  workerPath,
  webAssemblyOptions,
  maximumActiveTasks,
) {
  TaskProcessor.call(this, workerPath, maximumActiveTasks);
  this._webAssemblyConfig = getWebAssemblyLoaderConfig(
    workerPath,
    webAssemblyOptions,
  );
  this._initializePromise = undefined;
}

WebAssemblyTaskProcessor.prototype = Object.create(TaskProcessor.prototype);
WebAssemblyTaskProcessor.prototype.constructor = WebAssemblyTaskProcessor;

/**
 * Loads and compiles the WebAssembly module in the worker. Idempotent: once
 * resolved, later calls return the same promise without posting again. If
 * initialization fails, the next call retries with a new worker.
 *
 * @returns {Promise<*>} A promise that resolves to the result posted back by the worker once it is ready to process tasks.
 */
WebAssemblyTaskProcessor.prototype.initialize = function () {
  if (!defined(this._initializePromise)) {
    this._initializePromise = initialize(this).catch((error) => {
      this._initializePromise = undefined;
      // A worker failure event already cleans itself up; this only covers
      // failures that don't raise one, e.g. a malformed reply or a
      // synchronous postMessage throw.
      if (defined(this._worker)) {
        cleanupWorker(this, this._worker, error);
      }
      throw error;
    });
  }

  return this._initializePromise;
};

/**
 * @override
 */
WebAssemblyTaskProcessor.prototype.scheduleTask = function (
  parameters,
  transferableObjects,
) {
  if (!defined(this._worker)) {
    // The worker either has not started yet, or a previous one failed and
    // was cleaned up. Either way, a replacement worker must load and compile
    // WebAssembly again before it can run this task.
    this._initializePromise = undefined;
  }

  if (this._activeTasks >= this._maximumActiveTasks) {
    return undefined;
  }

  return scheduleWorkerTask(
    this,
    parameters,
    transferableObjects,
    this.initialize(),
  );
};

export default WebAssemblyTaskProcessor;
