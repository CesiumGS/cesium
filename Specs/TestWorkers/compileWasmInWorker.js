import {
  createWebAssemblyTaskProcessorWorker,
  fetchWebAssemblyBinary,
} from "@cesium/engine";

async function compileWasmInWorker(webAssemblyConfig) {
  // The binary is not posted from the document; request it here.
  const wasmBinary = await fetchWebAssemblyBinary(webAssemblyConfig);
  const module = await WebAssembly.compile(wasmBinary);

  return {
    byteLength: wasmBinary.byteLength,
    exports: WebAssembly.Module.exports(module).map((entry) => entry.name),
  };
}

export default createWebAssemblyTaskProcessorWorker(
  compileWasmInWorker,
  function unusedTask() {
    throw new Error("not used");
  },
);
