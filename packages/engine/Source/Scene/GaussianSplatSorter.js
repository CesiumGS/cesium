import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import RuntimeError from "../Core/RuntimeError.js";
import TaskProcessor from "../Core/TaskProcessor.js";

/** * A sorter for Gaussian splats that uses a task processor to handle sorting in parallel.
 * This class is responsible for initializing the task processor and scheduling sorting tasks.
 * * @constructor
 * @private
 */
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
      "gaussianSplatSorter",
      GaussianSplatSorter._maxSortingConcurrency,
    );
    processor
      .initWebAssemblyModule({
        wasmBinaryFile: "ThirdParty/wasm_splats_bg.wasm",
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
/**
 * Sorts Gaussian splats using a radix sort algorithm. Sorted by distance from the camera.
 * A new list of indexes is returned, which can be used to render the splats in the correct order.
 *
 * @param {Object} parameters - The parameters for sorting Gaussian splat indexes.
 * @param {Object} parameters.primitive - The primitive containing positions and modelView matrices.
 * @returns {Promise|undefined} A promise that resolves to the sorted indexes or undefined if the task cannot be scheduled.
 * @exception {RuntimeError} Sorter could not be initialized.
 * @private
 */
GaussianSplatSorter.radixSortIndexes = function (parameters) {
  const sorterTaskProcessor = GaussianSplatSorter._getSorterTaskProcessor();
  if (defined(GaussianSplatSorter._error)) {
    throw GaussianSplatSorter._error;
  }

  if (!GaussianSplatSorter._taskProcessorReady) {
    return;
  }

  return sorterTaskProcessor.scheduleTask(parameters, [
    parameters.primitive.positions.buffer,
  ]);
};

export default GaussianSplatSorter;
