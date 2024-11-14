import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import RuntimeError from "../Core/RuntimeError.js";
import TaskProcessor from "../Core/TaskProcessor.js";

//should probably rename to Utils and include texture gen

function GaussianSplatSorter() {}

GaussianSplatSorter._maxSortingConcurrency = Math.max(
  FeatureDetection.hardwareConcurrency - 1,
  1,
);

GaussianSplatSorter._sorterTaskProcessor = undefined;
GaussianSplatSorter._taskProcessorReady = false;
GaussianSplatSorter._error = undefined;
GaussianSplatSorter._getSorterTaskProcessor = function () {
  if (!defined(GaussianSplatSorter._sorterTaskProcessor)) {
    const processor = new TaskProcessor(
      "gaussianSplatSort",
      GaussianSplatSorter._maxSortingConcurrency,
    );
    processor
      .initWebAssemblyModule({
        wasmBinaryFile: "ThirdParty/cesiumjs_gsplat_utils_bg.wasm",
      })
      .then(function (result) {
        if (result) {
          GaussianSplatSorter._taskProcessorReady = true;
        } else {
          GaussianSplatSorter._error = new RuntimeError(
            "Gaussian splat sorter could not be initialized.",
          );
        }
      })
      .catch((error) => {
        GaussianSplatSorter._error = error;
      });
    GaussianSplatSorter._sorterTaskProcessor = processor;
  }

  return GaussianSplatSorter._sorterTaskProcessor;
};

GaussianSplatSorter.countSortSplats = function (parameters) {
  const sorterTaskProcessor = GaussianSplatSorter._getSorterTaskProcessor();
  if (defined(GaussianSplatSorter._error)) {
    throw GaussianSplatSorter._error;
  }

  if (!GaussianSplatSorter._taskProcessorReady) {
    return;
  }

  return sorterTaskProcessor.scheduleTask(parameters, [
    parameters.splatIndexes.buffer,
  ]);
};

export default GaussianSplatSorter;
