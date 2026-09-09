import defined from "./defined.js";
import Resource from "./Resource.js";

/**
 * Fetches a WebAssembly binary when a configuration provides its URL and does not already
 * contain the binary.
 *
 * <code>TaskProcessor</code> posts the URL of the binary rather than its bytes, so that the
 * document neither fetches nor compiles WebAssembly. Worker implementations call this function
 * to obtain the bytes and can pass the resolved configuration to an Emscripten module factory.
 *
 * The configuration is mutated in place: <code>wasmBinary</code> is assigned onto the object
 * that was passed in, and that same object is returned. A configuration that already carries
 * <code>wasmBinary</code>, or that has no <code>wasmBinaryFile</code>, is returned untouched.
 *
 * @function fetchWebAssemblyBinary
 *
 * @param {WebAssemblyConfig} webAssemblyConfig The configuration posted by {@link TaskProcessor#initWebAssemblyModule}.
 * @returns {Promise<WebAssemblyConfig>} A promise that resolves to the configuration with <code>wasmBinary</code> populated.
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
    return webAssemblyConfig;
  }

  webAssemblyConfig.wasmBinary = await Resource.fetchArrayBuffer({
    url: webAssemblyConfig.wasmBinaryFile,
    withCredentials: webAssemblyConfig.withCredentials === true,
  });

  return webAssemblyConfig;
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
 * @property {ArrayBuffer} [wasmBinary] The binary contents. Populated by
 *           {@link fetchWebAssemblyBinary}; not present in the posted configuration.
 *
 * @private
 */

export default fetchWebAssemblyBinary;
