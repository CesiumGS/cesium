import Uri from "urijs";
import buildModuleUrl from "./buildModuleUrl.js";
import defaultValue from "./defaultValue.js";
import defer from "./defer.js";
import defined from "./defined.js";
import destroyObject from "./destroyObject.js";
import DeveloperError from "./DeveloperError.js";
import Event from "./Event.js";
import FeatureDetection from "./FeatureDetection.js";
import isCrossOriginUrl from "./isCrossOriginUrl.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";

function canTransferArrayBuffer() {
  if (!defined(TaskProcessor._canTransferArrayBuffer)) {
    const worker = new Worker(
      getWorkerUrl("Workers/transferTypedArrayTest.js")
    );
    worker.postMessage = defaultValue(
      worker.webkitPostMessage,
      worker.postMessage
    );

    const value = 99;
    const array = new Int8Array([value]);

    try {
      // postMessage might fail with a DataCloneError
      // if transferring array buffers is not supported.
      worker.postMessage(
        {
          array: array,
        },
        [array.buffer]
      );
    } catch (e) {
      TaskProcessor._canTransferArrayBuffer = false;
      return TaskProcessor._canTransferArrayBuffer;
    }

    const deferred = defer();

    worker.onmessage = function (event) {
      const array = event.data.array;

      // some versions of Firefox silently fail to transfer typed arrays.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=841904
      // Check to make sure the value round-trips successfully.
      const result = defined(array) && array[0] === value;
      deferred.resolve(result);

      worker.terminate();

      TaskProcessor._canTransferArrayBuffer = result;
    };

    TaskProcessor._canTransferArrayBuffer = deferred.promise;
  }

  return TaskProcessor._canTransferArrayBuffer;
}

const taskCompletedEvent = new Event();

function completeTask(processor, data) {
  --processor._activeTasks;

  const id = data.id;
  if (!defined(id)) {
    // This is not one of ours.
    return;
  }

  const deferreds = processor._deferreds;
  const deferred = deferreds[id];

  if (defined(data.error)) {
    let error = data.error;
    if (error.name === "RuntimeError") {
      error = new RuntimeError(data.error.message);
      error.stack = data.error.stack;
    } else if (error.name === "DeveloperError") {
      error = new DeveloperError(data.error.message);
      error.stack = data.error.stack;
    }
    taskCompletedEvent.raiseEvent(error);
    deferred.reject(error);
  } else {
    taskCompletedEvent.raiseEvent();
    deferred.resolve(data.result);
  }

  delete deferreds[id];
}

function getWorkerUrl(moduleID) {
  let url = buildModuleUrl(moduleID);

  if (isCrossOriginUrl(url)) {
    //to load cross-origin, create a shim worker from a blob URL
    const script = `importScripts("${url}");`;

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
    url = URL.createObjectURL(blob);
  }

  return url;
}

let bootstrapperUrlResult;
function getBootstrapperUrl() {
  if (!defined(bootstrapperUrlResult)) {
    bootstrapperUrlResult = getWorkerUrl("Workers/cesiumWorkerBootstrapper.js");
  }
  return bootstrapperUrlResult;
}

function createWorker(processor) {
  const worker = new Worker(getBootstrapperUrl());
  worker.postMessage = defaultValue(
    worker.webkitPostMessage,
    worker.postMessage
  );

  const bootstrapMessage = {
    loaderConfig: {
      paths: {
        Workers: buildModuleUrl("Workers"),
      },
      baseUrl: buildModuleUrl.getCesiumBaseUrl().url,
    },
    workerModule: processor._workerPath,
  };

  worker.postMessage(bootstrapMessage);
  worker.onmessage = function (event) {
    completeTask(processor, event.data);
  };

  return worker;
}

function getWebAssemblyLoaderConfig(processor, wasmOptions) {
  const config = {
    modulePath: undefined,
    wasmBinaryFile: undefined,
    wasmBinary: undefined,
  };

  // Web assembly not supported, use fallback js module if provided
  if (!FeatureDetection.supportsWebAssembly()) {
    if (!defined(wasmOptions.fallbackModulePath)) {
      throw new RuntimeError(
        `This browser does not support Web Assembly, and no backup module was provided for ${processor._workerPath}`
      );
    }

    config.modulePath = buildModuleUrl(wasmOptions.fallbackModulePath);
    return Promise.resolve(config);
  }

  config.modulePath = buildModuleUrl(wasmOptions.modulePath);
  config.wasmBinaryFile = buildModuleUrl(wasmOptions.wasmBinaryFile);

  return Resource.fetchArrayBuffer({
    url: config.wasmBinaryFile,
  }).then(function (arrayBuffer) {
    config.wasmBinary = arrayBuffer;
    return config;
  });
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
 * @param {String} workerPath The Url to the worker. This can either be an absolute path or relative to the Cesium Workers folder.
 * @param {Number} [maximumActiveTasks=Number.POSITIVE_INFINITY] The maximum number of active tasks.  Once exceeded,
 *                                        scheduleTask will not queue any more tasks, allowing
 *                                        work to be rescheduled in future frames.
 */
function TaskProcessor(workerPath, maximumActiveTasks) {
  const uri = new Uri(workerPath);
  this._workerPath =
    uri.scheme().length !== 0 && uri.fragment().length === 0
      ? workerPath
      : TaskProcessor._workerModulePrefix + workerPath;
  this._maximumActiveTasks = defaultValue(
    maximumActiveTasks,
    Number.POSITIVE_INFINITY
  );
  this._activeTasks = 0;
  this._deferreds = {};
  this._nextID = 0;
}

const emptyTransferableObjectArray = [];

/**
 * Schedule a task to be processed by the web worker asynchronously.  If there are currently more
 * tasks active than the maximum set by the constructor, will immediately return undefined.
 * Otherwise, returns a promise that will resolve to the result posted back by the worker when
 * finished.
 *
 * @param {Object} parameters Any input data that will be posted to the worker.
 * @param {Object[]} [transferableObjects] An array of objects contained in parameters that should be
 *                                      transferred to the worker instead of copied.
 * @returns {Promise.<Object>|undefined} Either a promise that will resolve to the result when available, or undefined
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
  transferableObjects
) {
  if (!defined(this._worker)) {
    this._worker = createWorker(this);
  }

  if (this._activeTasks >= this._maximumActiveTasks) {
    return undefined;
  }

  ++this._activeTasks;

  const processor = this;
  return Promise.resolve(canTransferArrayBuffer()).then(function (
    canTransferArrayBuffer
  ) {
    if (!defined(transferableObjects)) {
      transferableObjects = emptyTransferableObjectArray;
    } else if (!canTransferArrayBuffer) {
      transferableObjects.length = 0;
    }

    const id = processor._nextID++;
    const deferred = defer();
    processor._deferreds[id] = deferred;

    processor._worker.postMessage(
      {
        id: id,
        parameters: parameters,
        canTransferArrayBuffer: canTransferArrayBuffer,
      },
      transferableObjects
    );

    return deferred.promise;
  });
};

/**
 * Posts a message to a web worker with configuration to initialize loading
 * and compiling a web assembly module asychronously, as well as an optional
 * fallback JavaScript module to use if Web Assembly is not supported.
 *
 * @param {Object} [webAssemblyOptions] An object with the following properties:
 * @param {String} [webAssemblyOptions.modulePath] The path of the web assembly JavaScript wrapper module.
 * @param {String} [webAssemblyOptions.wasmBinaryFile] The path of the web assembly binary file.
 * @param {String} [webAssemblyOptions.fallbackModulePath] The path of the fallback JavaScript module to use if web assembly is not supported.
 * @returns {Promise.<Object>} A promise that resolves to the result when the web worker has loaded and compiled the web assembly module and is ready to process tasks.
 */
TaskProcessor.prototype.initWebAssemblyModule = function (webAssemblyOptions) {
  if (!defined(this._worker)) {
    this._worker = createWorker(this);
  }

  const deferred = defer();
  const processor = this;
  const worker = this._worker;
  getWebAssemblyLoaderConfig(this, webAssemblyOptions).then(function (
    wasmConfig
  ) {
    return Promise.resolve(canTransferArrayBuffer()).then(function (
      canTransferArrayBuffer
    ) {
      let transferableObjects;
      const binary = wasmConfig.wasmBinary;
      if (defined(binary) && canTransferArrayBuffer) {
        transferableObjects = [binary];
      }

      worker.onmessage = function (event) {
        worker.onmessage = function (event) {
          completeTask(processor, event.data);
        };

        deferred.resolve(event.data);
      };

      worker.postMessage(
        { webAssemblyConfig: wasmConfig },
        transferableObjects
      );
    });
  });

  return deferred.promise;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
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
  if (defined(this._worker)) {
    this._worker.terminate();
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
