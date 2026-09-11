import createWebAssemblyTaskProcessorWorker from "./createWebAssemblyTaskProcessorWorker.js";
import defined from "../Core/defined.js";
import fetchWebAssemblyBinary from "../Core/fetchWebAssemblyBinary.js";

import { initSync, radix_sort_gaussians_indexes } from "@cesium/wasm-splats";

//load built wasm modules for sorting. Ensure we can load webassembly and we support SIMD.
async function initializeWebAssembly(wasmConfig) {
  // Request and compile the WebAssembly module here in the worker, or use the
  // fallback if web assembly is not supported.
  const wasmBinary =
    (await fetchWebAssemblyBinary(wasmConfig)) ?? wasmConfig.wasmBinary;
  if (defined(wasmBinary)) {
    initSync({ module: wasmBinary });
    return true;
  }
}

function generateGaussianSortWorker(parameters, transferableObjects) {
  const { primitive, sortType } = parameters;

  if (sortType === "Index") {
    return radix_sort_gaussians_indexes(
      primitive.positions,
      primitive.modelView,
      primitive.count,
    );
  }
}

export default createWebAssemblyTaskProcessorWorker(
  initializeWebAssembly,
  generateGaussianSortWorker,
);
