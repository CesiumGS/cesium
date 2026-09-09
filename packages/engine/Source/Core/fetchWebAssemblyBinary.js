import defined from "./defined.js";
import Resource from "./Resource.js";

/**
 * Fetches a WebAssembly binary when a configuration provides its URL and does not already
 * contain the binary.
 *
 * <code>TaskProcessor</code> posts the URL of the binary rather than its bytes, so that the
 * document neither fetches nor compiles WebAssembly. Worker implementations call this function
 * to obtain the bytes and pass them to an Emscripten module factory.
 *
 * The input configuration is not changed. If the configuration already carries
 * <code>wasmBinary</code>, or has no <code>wasmBinaryFile</code>, this function returns undefined.
 *
 * @function fetchWebAssemblyBinary
 *
 * @param {WebAssemblyConfig} webAssemblyConfig The configuration posted by {@link TaskProcessor#initWebAssemblyModule}.
 * @returns {Promise<ArrayBuffer|undefined>} A promise that resolves to the fetched binary, or undefined when no fetch is needed.
 *
 * @private
 * @see TaskProcessor#initWebAssemblyModule
 * @see createTaskProcessorWorker
 */
async function fetchWebAssemblyBinary(webAssemblyConfig) {
  if (
    !defined(webAssemblyConfig.wasmBinaryFile) ||
    defined(webAssemblyConfig.wasmBinary)
  ) {
    return undefined;
  }

  return Resource.fetchArrayBuffer({
    url: webAssemblyConfig.wasmBinaryFile,
    withCredentials: webAssemblyConfig.withCredentials === true,
  });
}

/**
 * The WebAssembly configuration posted to a worker by
 * {@link TaskProcessor#initWebAssemblyModule}, as the first message that worker receives.
 *
 * @typedef {object} WebAssemblyConfig
 *
 * @property {string} [wasmBinaryFile] The absolute url of the WebAssembly binary. Undefined
 *           when the browser does not support WebAssembly and a fallback module is used instead.
 * @property {string} [modulePath] The absolute URL of the JavaScript wrapper module, or the
 *           fallback module when the browser does not support WebAssembly.
 * @property {boolean} [withCredentials=false] Whether the binary's host was registered with
 *           {@link TrustedServers}, in which case the request is made with credentials.
 * @property {ArrayBuffer} [wasmBinary] The binary contents, when they are already available.
 *
 * @private
 */

export default fetchWebAssemblyBinary;
