import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
//import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
//import RuntimeError from "../Core/RuntimeError.js";

import { initSync, generate_texture_from_attrs } from "cesiumjs-gsplat-utils";

//load built wasm modules for sorting. Ensure we can load webassembly and we support SIMD.
async function initWorker(parameters, transferableObjects) {
  // Require and compile WebAssembly module, or use fallback if not supported
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined(wasmConfig) && defined(wasmConfig.wasmBinary)) {
    initSync(wasmConfig.wasmBinary);
    return true;
  }
}

async function generateSplatTextureWorker(parameters, transferableObjects) {
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined(wasmConfig)) {
    return initWorker(parameters, transferableObjects);
  }

  const { attributes, count } = parameters;
  return generate_texture_from_attrs(
    attributes.positions,
    attributes.scales,
    attributes.rotations,
    attributes.colors,
    count,
  );
}

export default createTaskProcessorWorker(generateSplatTextureWorker);
