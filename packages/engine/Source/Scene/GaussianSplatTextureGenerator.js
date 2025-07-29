import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import RuntimeError from "../Core/RuntimeError.js";
import TaskProcessor from "../Core/TaskProcessor.js";

function GaussianSplatTextureGenerator() {}

GaussianSplatTextureGenerator._maxSortingConcurrency = Math.max(
  FeatureDetection.hardwareConcurrency - 1,
  1,
);

GaussianSplatTextureGenerator._textureTaskProcessor = undefined;
GaussianSplatTextureGenerator._taskProcessorReady = false;
GaussianSplatTextureGenerator._error = undefined;
GaussianSplatTextureGenerator._getTextureTaskProcessor = function () {
  if (!defined(GaussianSplatTextureGenerator._textureTaskProcessor)) {
    const processor = new TaskProcessor(
      "gaussianSplatTextureGenerator",
      GaussianSplatTextureGenerator._maxSortingConcurrency,
    );
    processor
      .initWebAssemblyModule({
        wasmBinaryFile: "ThirdParty/wasm_splats_bg.wasm",
      })
      .then(function (result) {
        if (result) {
          GaussianSplatTextureGenerator._taskProcessorReady = true;
        } else {
          GaussianSplatTextureGenerator._error = new RuntimeError(
            "Gaussian splat sorter could not be initialized.",
          );
        }
      })
      .catch((error) => {
        GaussianSplatTextureGenerator._error = error;
      });
    GaussianSplatTextureGenerator._textureTaskProcessor = processor;
  }

  return GaussianSplatTextureGenerator._textureTaskProcessor;
};

GaussianSplatTextureGenerator.generateFromAttributes = function (parameters) {
  const textureTaskProcessor =
    GaussianSplatTextureGenerator._getTextureTaskProcessor();
  if (defined(GaussianSplatTextureGenerator._error)) {
    throw GaussianSplatTextureGenerator._error;
  }

  if (!GaussianSplatTextureGenerator._taskProcessorReady) {
    return;
  }

  const { attributes } = parameters;
  return textureTaskProcessor.scheduleTask(parameters, [
    attributes.positions.buffer,
    attributes.scales.buffer,
    attributes.rotations.buffer,
    attributes.colors.buffer,
  ]);
};

export default GaussianSplatTextureGenerator;
