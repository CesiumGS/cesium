import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import defined from "../Core/defined.js";

import {
  initSync,
  radix_sort_gaussians_attrs,
  radix_sort_gaussians_indexes,
} from "@cesium/wasm-splats";

//load built wasm modules for sorting. Ensure we can load webassembly and we support SIMD.
async function initWorker(parameters, transferableObjects) {
  // Require and compile WebAssembly module, or use fallback if not supported
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined(wasmConfig) && defined(wasmConfig.wasmBinary)) {
    initSync(wasmConfig.wasmBinary);
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

  if (sortType === "Attribute") {
    return radix_sort_gaussians_attrs(
      primitive.attributes,
      primitive.modelView,
      primitive.count,
    );
  } else if (sortType === "Index") {
    return radix_sort_gaussians_indexes(
      primitive.positions,
      primitive.modelView,
      2048,
      primitive.count,
    );
  } else if (sortType === "SIMD Index") {
    return radix_sort_gaussians_indexes(
      primitive.positions,
      primitive.modelView,
      2048,
      primitive.count,
    );
  }
}

export default createTaskProcessorWorker(generateGaussianSortWorker);
