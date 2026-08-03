import {
  createTaskProcessorWorker,
  fetchWebAssemblyBinary,
} from "@cesium/engine";

export default createTaskProcessorWorker(
  async function compileWasmInWorker(parameters) {
    const wasmConfig = parameters.webAssemblyConfig;

    // The binary is not posted from the document; request it here.
    const { wasmBinary } = await fetchWebAssemblyBinary(wasmConfig);
    const module = await WebAssembly.compile(wasmBinary);

    return {
      byteLength: wasmBinary.byteLength,
      exports: WebAssembly.Module.exports(module).map((entry) => entry.name),
    };
  },
);
