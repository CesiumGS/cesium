import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import defined from "../Core/defined.js";

import { initSync, generate_splat_texture } from "@cesium/wasm-splats";

//load built wasm modules for sorting. Ensure we can load webassembly and we support SIMD.
async function initWorker(parameters, transferableObjects) {
  // Require and compile WebAssembly module, or use fallback if not supported
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined(wasmConfig) && defined(wasmConfig.wasmBinary)) {
    initSync({ module: wasmConfig.wasmBinary });
    return true;
  }
  return false;
}

async function generateSplatTextureWorker(parameters, transferableObjects) {
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined(wasmConfig)) {
    return initWorker(parameters, transferableObjects);
  }

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

export default createTaskProcessorWorker(generateSplatTextureWorker);
