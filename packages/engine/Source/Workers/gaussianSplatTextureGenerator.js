import createWebAssemblyTaskProcessorWorker from "./createWebAssemblyTaskProcessorWorker.js";
import defined from "../Core/defined.js";
import fetchWebAssemblyBinary from "../Core/fetchWebAssemblyBinary.js";

import { initSync, generate_splat_texture } from "@cesium/wasm-splats";

//load built wasm modules for sorting. Ensure we can load webassembly and we support SIMD.
async function initializeWebAssembly(wasmConfig) {
  // Request and compile the WebAssembly module here in the worker, or use the
  // fallback if web assembly is not supported.
  const wasmBinary = await fetchWebAssemblyBinary(wasmConfig);
  if (defined(wasmBinary)) {
    initSync({ module: wasmBinary });
    return true;
  }
  return false;
}

function generateSplatTextureWorker(parameters, transferableObjects) {
  const { attributes, count } = parameters;
  const result = generate_splat_texture(
    attributes.positions,
    attributes.scales,
    attributes.rotations,
    attributes.colors,
    count,
  );

  return {
    data: result.data,
    width: result.width,
    height: result.height,
  };
}

export default createWebAssemblyTaskProcessorWorker(
  initializeWebAssembly,
  generateSplatTextureWorker,
);
