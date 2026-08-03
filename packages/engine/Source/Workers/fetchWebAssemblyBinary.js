import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";

/**
 * Fetches the WebAssembly binary described by a {@link TaskProcessor#initWebAssemblyModule}
 * configuration, from inside the worker that will compile it.
 *
 * The bytes are deliberately not requested on the main thread. Keeping both the
 * request and the compilation in the worker means the document never needs to
 * handle WebAssembly, so applications can scope <code>wasm-unsafe-eval</code> to
 * worker responses.
 *
 * @function fetchWebAssemblyBinary
 *
 * @param {object} webAssemblyConfig The configuration posted by <code>TaskProcessor</code>.
 * @param {string} [webAssemblyConfig.wasmBinaryFile] The absolute url of the web assembly binary.
 * @param {ArrayBuffer} [webAssemblyConfig.wasmBinary] Binary contents, if they were already provided.
 * @returns {Promise<object>} A promise that resolves to the configuration with <code>wasmBinary</code> populated.
 *
 * @private
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
  });

  return webAssemblyConfig;
}

export default fetchWebAssemblyBinary;
