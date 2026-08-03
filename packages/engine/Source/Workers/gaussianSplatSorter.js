import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import defined from "../Core/defined.js";
import fetchWebAssemblyBinary from "../Core/fetchWebAssemblyBinary.js";

import { initSync, radix_sort_gaussians_indexes } from "@cesium/wasm-splats";

//load built wasm modules for sorting. Ensure we can load webassembly and we support SIMD.
async function initWorker(parameters, transferableObjects) {
  // Request and compile the WebAssembly module here in the worker, or use the
  // fallback if web assembly is not supported.
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined(wasmConfig) && defined(wasmConfig.wasmBinaryFile)) {
    const { wasmBinary } = await fetchWebAssemblyBinary(wasmConfig);
    initSync({ module: wasmBinary });
    return true;
  }
}

function generateGaussianSortWorker(parameters, transferableObjects) {
  // Handle initialization
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined(wasmConfig)) {
    return initWorker(parameters, transferableObjects);
  }

  const { primitive, sortType } = parameters;

  if (sortType === "Index") {
    return radix_sort_gaussians_indexes(
      primitive.positions,
      primitive.modelView,
      primitive.count,
    );
  }
}

export default createTaskProcessorWorker(generateGaussianSortWorker);
