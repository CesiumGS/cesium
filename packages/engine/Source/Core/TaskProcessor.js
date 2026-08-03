import Uri from "urijs";
import buildModuleUrl from "./buildModuleUrl.js";
import defined from "./defined.js";
import destroyObject from "./destroyObject.js";
import DeveloperError from "./DeveloperError.js";
import Event from "./Event.js";
import FeatureDetection from "./FeatureDetection.js";
import isCrossOriginUrl from "./isCrossOriginUrl.js";
import RuntimeError from "./RuntimeError.js";
import TrustedServers from "./TrustedServers.js";

function canTransferArrayBuffer() {
  if (!defined(TaskProcessor._canTransferArrayBuffer)) {
    const worker = createWorker("transferTypedArrayTest");
    worker.postMessage = worker.webkitPostMessage ?? worker.postMessage;

    const value = 99;
    const array = new Int8Array([value]);

    let settled = false;
    let settle;
    const promise = new Promise((resolve) => {
      const cleanup = () => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onFailure);
        worker.removeEventListener("messageerror", onFailure);
        worker.terminate();
      };

      settle = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        TaskProcessor._canTransferArrayBuffer = result;
        resolve(result);
      };

      const onMessage = (event) => {
        const array = event.data?.array;

        // Verify that typed arrays round-trip correctly when transferred.
        settle(defined(array) && array[0] === value);
      };

      const onFailure = () => settle(false);

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onFailure);
      worker.addEventListener("messageerror", onFailure);
    });

    TaskProcessor._canTransferArrayBuffer = promise;

    try {
      // postMessage might fail with a DataCloneError
      // if transferring array buffers is not supported.
      worker.postMessage(
        {
          array: array,
        },
        [array.buffer],
      );
    } catch (e) {
      settle(false);
      return TaskProcessor._canTransferArrayBuffer;
    }
  }

  return TaskProcessor._canTransferArrayBuffer;
}

const taskCompletedEvent = new Event();

function urlFromScript(script) {
  let blob;
  try {
    blob = new Blob([script], {
      type: "application/javascript",
    });
  } catch (e) {
    const BlobBuilder =
      window.BlobBuilder ||
      window.WebKitBlobBuilder ||
      window.MozBlobBuilder ||
      window.MSBlobBuilder;
    const blobBuilder = new BlobBuilder();
    blobBuilder.append(script);
    blob = blobBuilder.getBlob("application/javascript");
  }

  const URL = window.URL || window.webkitURL;
  return URL.createObjectURL(blob);
}

function createWorker(url) {
  const uri = new Uri(url);
  const isUri = uri.scheme().length !== 0;
  const moduleID = url.replace(/\.js$/, "");

  const options = {};
  let workerPath;
  let crossOriginUrl;

  // If we are provided a fully resolved URL, check it is cross-origin
  // Or if provided a module ID, check the full absolute URL instead.
  if (isCrossOriginUrl(url)) {
    crossOriginUrl = url;
  } else if (!isUri) {
    const moduleAbsoluteUrl = buildModuleUrl(
      `${TaskProcessor._workerModulePrefix}/${moduleID}.js`,
    );

    if (isCrossOriginUrl(moduleAbsoluteUrl)) {
      crossOriginUrl = moduleAbsoluteUrl;
    }
  }

  if (crossOriginUrl) {
    // To load cross-origin, create a shim worker from a blob URL
    const script = `import "${crossOriginUrl}";`;
    workerPath = urlFromScript(script);
    options.type = "module";
    return new Worker(workerPath, options);
  }

  /* global CESIUM_WORKERS */
  if (!isUri && typeof CESIUM_WORKERS !== "undefined") {
    // If the workers are embedded, create a shim worker from the embedded script data
    const script = `
      importScripts("${urlFromScript(CESIUM_WORKERS)}");
      CesiumWorkers["${moduleID}"]();
    `;
    workerPath = urlFromScript(script);
    return new Worker(workerPath, options);
  }

  workerPath = url;

  if (!isUri) {
    workerPath = buildModuleUrl(
      `${TaskProcessor._workerModulePrefix + moduleID}.js`,
    );
  }

  if (!FeatureDetection.supportsEsmWebWorkers()) {
    throw new RuntimeError(
      "This browser is not supported. Please update your browser to continue.",
    );
  }

  options.type = "module";

  return new Worker(workerPath, options);
}

function getWebAssemblyLoaderConfig(processor, wasmOptions) {
  const config = {
    modulePath: undefined,
    wasmBinaryFile: undefined,
  };

  // Web assembly not supported, use fallback js module if provided
  if (!FeatureDetection.supportsWebAssembly()) {
    if (!defined(wasmOptions.fallbackModulePath)) {
      throw new RuntimeError(
        `This browser does not support Web Assembly, and no backup module was provided for ${processor._workerPath}`,
      );
    }

    config.modulePath = buildModuleUrl(wasmOptions.fallbackModulePath);
    return config;
  }

  // Only the resolved url is sent. The worker requests and compiles the binary
  // itself so that WebAssembly is never handled by the document, allowing
  // applications to scope `wasm-unsafe-eval` to worker responses.
  config.wasmBinaryFile = buildModuleUrl(wasmOptions.wasmBinaryFile);

  // TrustedServers state lives in the module scope of whichever realm registered
  // it, so a worker's registry is always empty. Resolve the credential decision
  // here, where the application called TrustedServers.add, and carry the answer
  // across rather than expecting the worker to re-derive it.
  config.withCredentials = TrustedServers.contains(config.wasmBinaryFile);

  return config;
}

/**
 * A wrapper around a web worker that allows scheduling tasks for a given worker,
 * returning results asynchronously via a promise.
 *
 * The Worker is not constructed until a task is scheduled.
 *
 * @alias TaskProcessor
 * @constructor
 *
 * @param {string} workerPath The Url to the worker. This can either be an absolute path or relative to the Cesium Workers folder.
 * @param {number} [maximumActiveTasks=Number.POSITIVE_INFINITY] The maximum number of active tasks.  Once exceeded,
 *                                        scheduleTask will not queue any more tasks, allowing
 *                                        work to be rescheduled in future frames.
 */
function TaskProcessor(workerPath, maximumActiveTasks) {
  this._workerPath = workerPath;
  this._maximumActiveTasks = maximumActiveTasks ?? Number.POSITIVE_INFINITY;
  this._activeTasks = 0;
  this._nextID = 0;
  this._webAssemblyPromise = undefined;
  this._webAssemblyWorker = undefined;
  this._webAssemblyPending = undefined;
  this._pendingTasks = new Map();
  this._workerFailureHandlers = new Map();
}

function deserializeWorkerError(serializedError) {
  let error = serializedError;
  if (error.name === "RuntimeError") {
    error = new RuntimeError(serializedError.message);
    error.stack = serializedError.stack;
  } else if (error.name === "DeveloperError") {
    error = new DeveloperError(serializedError.message);
    error.stack = serializedError.stack;
  } else if (error.name === "Error") {
    error = new Error(serializedError.message);
    error.stack = serializedError.stack;
  } else if (defined(error.name) && defined(error.message)) {
    // Any other error class the worker threw, such as the EvalError a
    // Content-Security-Policy produces. Rebuilding it as an Error keeps the
    // name and message legible instead of surfacing an opaque object.
    error = new Error(`${serializedError.name}: ${serializedError.message}`);
    error.stack = serializedError.stack;
  }
  return error;
}

function workerFailureToError(event) {
  if (defined(event.error)) {
    if (event.error instanceof Error) {
      return event.error;
    }

    if (defined(event.error.message)) {
      const error = new Error(event.error.message);
      if (defined(event.error.name)) {
        error.name = event.error.name;
      }
      if (defined(event.error.stack)) {
        error.stack = event.error.stack;
      }
      return error;
    }

    return new Error(String(event.error));
  }

  return new Error(event.message ?? "Worker failed");
}

function removeWorkerFailureHandler(processor, worker) {
  const handlers = processor._workerFailureHandlers;
  if (!defined(handlers)) {
    return;
  }

  const handler = handlers.get(worker);
  if (!defined(handler)) {
    return;
  }

  worker.removeEventListener("error", handler);
  worker.removeEventListener("messageerror", handler);
  handlers.delete(worker);
}

function settleTask(processor, id, error, result) {
  if (!defined(processor._pendingTasks)) {
    return;
  }

  const pendingTask = processor._pendingTasks.get(id);
  if (!defined(pendingTask)) {
    return;
  }

  processor._pendingTasks.delete(id);
  pendingTask.worker.removeEventListener("message", pendingTask.listener);

  if (defined(error)) {
    taskCompletedEvent.raiseEvent(error);
    pendingTask.reject(error);
  } else {
    taskCompletedEvent.raiseEvent();
    pendingTask.resolve(result);
  }
}

function settleWebAssembly(processor, worker, error, result) {
  const pending = processor._webAssemblyPending;
  if (!defined(pending) || pending.worker !== worker) {
    return;
  }

  processor._webAssemblyPending = undefined;
  worker.removeEventListener("message", pending.listener);

  if (defined(error)) {
    pending.reject(error);
  } else {
    pending.resolve(result);
  }
}

function cleanupWorker(processor, worker, error) {
  removeWorkerFailureHandler(processor, worker);

  if (defined(error) && defined(processor._pendingTasks)) {
    for (const [id, pendingTask] of Array.from(
      processor._pendingTasks.entries(),
    )) {
      if (pendingTask.worker === worker) {
        settleTask(processor, id, error);
      }
    }
  }

  worker.terminate();

  if (processor._worker === worker) {
    processor._worker = undefined;
  }
  if (processor._webAssemblyWorker === worker) {
    processor._webAssemblyWorker = undefined;
  }
}

function handleWorkerFailure(processor, worker, event) {
  const error = workerFailureToError(event);
  const wasWebAssemblyWorker = processor._webAssemblyWorker === worker;

  settleWebAssembly(processor, worker, error);
  cleanupWorker(processor, worker, error);

  if (wasWebAssemblyWorker) {
    processor._webAssemblyPromise = undefined;
  }
}

function createProcessorWorker(processor) {
  const worker = createWorker(processor._workerPath);
  const failureHandler = (event) =>
    handleWorkerFailure(processor, worker, event);

  worker.addEventListener("error", failureHandler);
  worker.addEventListener("messageerror", failureHandler);
  processor._workerFailureHandlers.set(worker, failureHandler);
  return worker;
}

const emptyTransferableObjectArray = [];
async function runTask(processor, parameters, transferableObjects) {
  const id = processor._nextID++;
  const worker = processor._worker;
  const promise = new Promise((resolve, reject) => {
    const listener = ({ data }) => {
      if (!defined(data) || data.id !== id) {
        return;
      }

      if (defined(data.error)) {
        settleTask(processor, id, deserializeWorkerError(data.error));
      } else {
        settleTask(processor, id, undefined, data.result);
      }
    };

    processor._pendingTasks.set(id, {
      worker: worker,
      listener: listener,
      resolve: resolve,
      reject: reject,
    });
    worker.addEventListener("message", listener);
  });

  try {
    const canTransfer = await Promise.resolve(canTransferArrayBuffer());
    if (!processor._pendingTasks.has(id)) {
      return promise;
    }

    if (!defined(transferableObjects)) {
      transferableObjects = emptyTransferableObjectArray;
    } else if (!canTransfer) {
      transferableObjects.length = 0;
    }

    worker.postMessage(
      {
        id: id,
        baseUrl: buildModuleUrl.getCesiumBaseUrl().url,
        parameters: parameters,
        canTransferArrayBuffer: canTransfer,
      },
      transferableObjects,
    );
  } catch (error) {
    settleTask(processor, id, error);
  }

  return promise;
}

async function scheduleTask(processor, parameters, transferableObjects) {
  ++processor._activeTasks;

  try {
    const result = await runTask(processor, parameters, transferableObjects);
    --processor._activeTasks;
    return result;
  } catch (error) {
    --processor._activeTasks;
    throw error;
  }
}

/**
 * Schedule a task to be processed by the web worker asynchronously.  If there are currently more
 * tasks active than the maximum set by the constructor, will immediately return undefined.
 * Otherwise, returns a promise that will resolve to the result posted back by the worker when
 * finished.
 *
 * @param {object} parameters Any input data that will be posted to the worker.
 * @param {object[]} [transferableObjects] An array of objects contained in parameters that should be
 *                                      transferred to the worker instead of copied.
 * @returns {Promise<object>|undefined} Either a promise that will resolve to the result when available, or undefined
 *                    if there are too many active tasks,
 *
 * @example
 * const taskProcessor = new Cesium.TaskProcessor('myWorkerPath');
 * const promise = taskProcessor.scheduleTask({
 *     someParameter : true,
 *     another : 'hello'
 * });
 * if (!Cesium.defined(promise)) {
 *     // too many active tasks - try again later
 * } else {
 *     promise.then(function(result) {
 *         // use the result of the task
 *     });
 * }
 */
TaskProcessor.prototype.scheduleTask = function (
  parameters,
  transferableObjects,
) {
  if (!defined(this._worker)) {
    this._worker = createProcessorWorker(this);
  }

  if (this._activeTasks >= this._maximumActiveTasks) {
    return undefined;
  }

  return scheduleTask(this, parameters, transferableObjects);
};

/**
 * Posts a message to a web worker with configuration to initialize loading
 * and compiling a web assembly module asynchronously, as well as an optional
 * fallback JavaScript module to use if Web Assembly is not supported.
 *
 * Only the resolved url of the binary is posted. The worker requests and compiles
 * the bytes itself, so WebAssembly is never fetched or compiled by the document.
 *
 * @param {object} [webAssemblyOptions] An object with the following properties:
 * @param {string} [webAssemblyOptions.modulePath] The path of the web assembly JavaScript wrapper module.
 * @param {string} [webAssemblyOptions.wasmBinaryFile] The path of the web assembly binary file.
 * @param {string} [webAssemblyOptions.fallbackModulePath] The path of the fallback JavaScript module to use if web assembly is not supported.
 * @returns {Promise<*>} A promise that resolves to the result when the web worker has loaded and compiled the web assembly module and is ready to process tasks.
 *
 * @exception {RuntimeError} This browser does not support Web Assembly, and no backup module was provided
 */
TaskProcessor.prototype.initWebAssemblyModule = async function (
  webAssemblyOptions,
) {
  if (defined(this._webAssemblyPromise)) {
    return this._webAssemblyPromise;
  }

  let initializationWorker;
  const init = async () => {
    const worker = (this._worker = createProcessorWorker(this));
    initializationWorker = worker;
    this._webAssemblyWorker = worker;
    const wasmConfig = getWebAssemblyLoaderConfig(this, webAssemblyOptions);

    const promise = new Promise((resolve, reject) => {
      const listener = ({ data }) => {
        if (!defined(data)) {
          settleWebAssembly(
            this,
            worker,
            new RuntimeError("Could not configure wasm module"),
          );
          return;
        }

        if (defined(data.error)) {
          settleWebAssembly(this, worker, deserializeWorkerError(data.error));
          return;
        }

        settleWebAssembly(this, worker, undefined, data.result);
      };

      this._webAssemblyPending = {
        worker,
        listener,
        resolve,
        reject,
      };
      worker.addEventListener("message", listener);
    });

    try {
      const canTransfer = await Promise.resolve(canTransferArrayBuffer());
      if (!defined(this._webAssemblyPending)) {
        return promise;
      }

      worker.postMessage({
        canTransferArrayBuffer: canTransfer,
        baseUrl: buildModuleUrl.getCesiumBaseUrl().url,
        parameters: { webAssemblyConfig: wasmConfig },
      });
    } catch (error) {
      settleWebAssembly(this, worker, error);
      throw error;
    }

    return promise;
  };

  const initializationPromise = init();
  const retryablePromise = initializationPromise.catch((error) => {
    if (this._webAssemblyPromise === retryablePromise) {
      this._webAssemblyPromise = undefined;
    }

    if (
      defined(initializationWorker) &&
      this._workerFailureHandlers.has(initializationWorker)
    ) {
      cleanupWorker(this, initializationWorker, error);
    }

    throw error;
  });

  this._webAssemblyPromise = retryablePromise;
  return retryablePromise;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 *
 * @see TaskProcessor#destroy
 */
TaskProcessor.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys this object.  This will immediately terminate the Worker.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 */
TaskProcessor.prototype.destroy = function () {
  const error = new RuntimeError("TaskProcessor was destroyed.");
  for (const worker of this._workerFailureHandlers.keys()) {
    settleWebAssembly(this, worker, error);
    cleanupWorker(this, worker, error);
  }
  return destroyObject(this);
};

/**
 * An event that's raised when a task is completed successfully.  Event handlers are passed
 * the error object is a task fails.
 *
 * @type {Event}
 *
 * @private
 */
TaskProcessor.taskCompletedEvent = taskCompletedEvent;

// exposed for testing purposes
TaskProcessor._defaultWorkerModulePrefix = "Workers/";
TaskProcessor._workerModulePrefix = TaskProcessor._defaultWorkerModulePrefix;
TaskProcessor._canTransferArrayBuffer = undefined;
export default TaskProcessor;
