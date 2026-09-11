import buildModuleUrl from "./buildModuleUrl.js";
import defined from "./defined.js";
import FeatureDetection from "./FeatureDetection.js";
import RuntimeError from "./RuntimeError.js";
import TrustedServers from "./TrustedServers.js";

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

  // TrustedServers state lives in the module scope of whichever realm registered
  // it, so a worker's registry is always empty. Resolve the credential decision
  // here, where the application called TrustedServers.add, and carry the answer
  // across rather than expecting the worker to re-derive it.
  config.withCredentials = TrustedServers.contains(config.wasmBinaryFile);

  return config;
}

/**
 * Handles the WebAssembly initialization exchange for a TaskProcessor worker.
 * TaskProcessor owns the worker and resets this helper when the worker stops.
 *
 * @param {string} workerPath The worker URL or module ID.
 * @param {object} [options] The WebAssembly loader options.
 * @private
 */
function WebAssemblyWorkerInitializer(workerPath, options) {
  this._config = defined(options)
    ? getWebAssemblyLoaderConfig(workerPath, options)
    : undefined;
  this._worker = undefined;
  this._pending = undefined;
  this.promise = undefined;
}

WebAssemblyWorkerInitializer.prototype._settle = function (error, result) {
  const pending = this._pending;
  if (!defined(pending)) {
    return;
  }

  this._pending = undefined;
  this._worker.removeEventListener("message", pending.listener);
  if (defined(error)) {
    pending.reject(error);
  } else {
    pending.resolve(result);
  }
};

WebAssemblyWorkerInitializer.prototype.initialize = function (
  worker,
  canTransferArrayBuffer,
  deserializeError,
) {
  this._worker = worker;
  const response = new Promise((resolve, reject) => {
    const listener = ({ data }) => {
      if (
        !defined(data) ||
        typeof data !== "object" ||
        (!Object.prototype.hasOwnProperty.call(data, "result") &&
          !Object.prototype.hasOwnProperty.call(data, "error"))
      ) {
        this._settle(new RuntimeError("Could not configure wasm module"));
      } else if (defined(data.error)) {
        this._settle(deserializeError(data.error));
      } else {
        this._settle(undefined, data.result);
      }
    };
    this._pending = { listener, resolve, reject };
    worker.addEventListener("message", listener);
  });

  this.promise = (async () => {
    try {
      const canTransfer = await canTransferArrayBuffer();
      if (this._worker === worker && defined(this._pending)) {
        worker.postMessage({
          canTransferArrayBuffer: canTransfer,
          baseUrl: buildModuleUrl.getCesiumBaseUrl().url,
          parameters: { webAssemblyConfig: this._config },
        });
      }
    } catch (error) {
      if (this._worker === worker) {
        this._settle(error);
      }
    }
    return response;
  })();

  return this.promise;
};

WebAssemblyWorkerInitializer.prototype.reset = function (worker, error) {
  if (this._worker !== worker) {
    return;
  }

  this._settle(error);
  this._worker = undefined;
  this.promise = undefined;
};

export default WebAssemblyWorkerInitializer;
