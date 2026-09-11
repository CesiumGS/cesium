import defined from "./defined.js";
import Resource from "./Resource.js";

/**
 * Returns a WebAssembly binary, fetching it if the configuration provides only its URL.
 *
 * <code>WebAssemblyTaskProcessor</code> posts the URL of the binary rather than its bytes, so that the
 * document neither fetches nor compiles WebAssembly. Worker implementations call this function
 * to obtain the bytes and pass them to an Emscripten module factory.
 *
 * Credentials are not part of this configuration. <code>WebAssemblyTaskProcessor</code> syncs the
 * document's {@link TrustedServers} registry into the worker, so {@link Resource.fetchArrayBuffer}
 * resolves the same credential decision the document would have made, without an explicit override.
 *
 * The input configuration is not changed. Returns undefined if the configuration has neither
 * <code>wasmBinary</code> nor <code>wasmBinaryFile</code>, e.g. when a fallback JS module is used instead.
 *
 * @function fetchWebAssemblyBinary
 *
 * @param {WebAssemblyConfig} webAssemblyConfig The configuration posted by {@link WebAssemblyTaskProcessor#initialize}.
 * @returns {Promise<ArrayBuffer|undefined>} A promise that resolves to the binary, or undefined when there is none to use.
 *
 * @private
 * @see WebAssemblyTaskProcessor#initialize
 * @see createWebAssemblyTaskProcessorWorker
 */
async function fetchWebAssemblyBinary(webAssemblyConfig) {
  if (defined(webAssemblyConfig.wasmBinary)) {
    return webAssemblyConfig.wasmBinary;
  }

  if (!defined(webAssemblyConfig.wasmBinaryFile)) {
    return undefined;
  }

  return Resource.fetchArrayBuffer({
    url: webAssemblyConfig.wasmBinaryFile,
  });
}

/**
 * The WebAssembly configuration posted to a worker by
 * {@link WebAssemblyTaskProcessor#initialize}, as the first message that worker receives.
 *
 * @typedef {object} WebAssemblyConfig
 *
 * @property {string} [wasmBinaryFile] The absolute url of the WebAssembly binary. Undefined
 *           when the browser does not support WebAssembly and a fallback module is used instead.
 * @property {string} [modulePath] The absolute URL of the JavaScript wrapper module, or the
 *           fallback module when the browser does not support WebAssembly.
 * @property {ArrayBuffer} [wasmBinary] The binary contents, when they are already available.
 *
 * @private
 */

export default fetchWebAssemblyBinary;
