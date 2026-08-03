import defined from "./defined.js";
import Resource from "./Resource.js";

/**
 * Loads the WebAssembly binary described by a {@link TaskProcessor#initWebAssemblyModule}
 * configuration, from inside the worker that will compile it.
 *
 * <code>TaskProcessor</code> posts the url of the binary rather than its bytes, so that the
 * document neither fetches nor compiles WebAssembly. Worker implementations call this to
 * obtain the bytes and can pass the resolved configuration to an Emscripten module factory.
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
 * @example
 * import {
 *   createTaskProcessorWorker,
 *   fetchWebAssemblyBinary,
 * } from "@cesium/engine";
 *
 * let module;
 *
 * async function doWork(parameters) {
 *   const wasmConfig = parameters.webAssemblyConfig;
 *   if (Cesium.defined(wasmConfig)) {
 *     module = await createMyModule(await fetchWebAssemblyBinary(wasmConfig));
 *     return true;
 *   }
 *
 *   return module.compute(parameters);
 * }
 *
 * export default createTaskProcessorWorker(doWork);
 *
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
 * @property {string} [modulePath] The absolute url of the fallback JavaScript module, present
 *           only when the browser does not support WebAssembly.
 * @property {boolean} [withCredentials=false] Whether the binary's host was registered with
 *           {@link TrustedServers}, in which case the request is made with credentials.
 * @property {ArrayBuffer} [wasmBinary] The binary contents. Populated by
 *           {@link fetchWebAssemblyBinary}; not present in the posted configuration.
 */

export default fetchWebAssemblyBinary;
