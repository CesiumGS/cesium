import __wbg_init, {
  initSync,
  generate_splat_texture_from_attrs,
} from "@cesium/wasm-splats";
import buildModuleUrl from "../../Core/buildModuleUrl.js";

//TODO: move to TaskProcessor

GaussianSplatTextureGenerator.wasmModule = undefined;
GaussianSplatTextureGenerator.wasmInitialized = false;
GaussianSplatTextureGenerator.initPromise = null;

function GaussianSplatTextureGenerator() {}

GaussianSplatTextureGenerator.initWasmModule = function () {
  (async () => {
    if (!this.initPromise) {
      this.initPromise = await __wbg_init(
        buildModuleUrl("ThirdParty/wasm_splats_bg.wasm"),
      )
        .then((wasm) => {
          this.wasmInitialized = true;
          initSync(wasm);
          this.wasmModule = wasm;
        })
        .catch((err) => {
          console.error("Failed to initialize WASM module:", err);
          throw err;
        });
    }
  })();
  return this.initPromise;
};

//Attributes
//Position (vec3)
//Scale (vec3)
//Rotation (vec4)
//RGBA (u8 * 4)
GaussianSplatTextureGenerator.generateFromAttrs = async function (
  attributes,
  count,
) {
  if (!this.wasmModule || !this.wasmInitialized) {
    this.initWasmModule();

    while (!this.wasmModule) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return generate_splat_texture_from_attrs(
    attributes.find((a) => a.name === "POSITION").typedArray,
    attributes.find((a) => a.name === "_SCALE").typedArray,
    attributes.find((a) => a.name === "_ROTATION").typedArray,
    attributes.find((a) => a.name === "COLOR_0").typedArray,
    count,
  );
};

////////////////////////////////////////////////////
///////

// import defined from "../../Core/defined.js";
// import FeatureDetection from "../../Core/FeatureDetection.js";
// import RuntimeError from "../../Core/RuntimeError.js";
// import TaskProcessor from "../../Core/TaskProcessor.js";

// function GaussianSplatTextureGenerator() {}

// GaussianSplatTextureGenerator._maxSortingConcurrency = Math.max(
//   FeatureDetection.hardwareConcurrency - 1,
//   1,
// );

// GaussianSplatTextureGenerator._textureTaskProcessor = undefined;
// GaussianSplatTextureGenerator._taskProcessorReady = false;
// GaussianSplatTextureGenerator._error = undefined;
// GaussianSplatTextureGenerator._getTextureTaskProcessor = function () {
//   if (!defined(GaussianSplatTextureGenerator._textureTaskProcessor)) {
//     const processor = new TaskProcessor(
//       "gaussianSplatTextureGenerator",
//       GaussianSplatTextureGenerator._maxSortingConcurrency,
//     );
//     processor
//       .initWebAssemblyModule({
//         wasmBinaryFile: "ThirdParty/cesium-gsplat/cesiumjs_gsplat_utils_bg.wasm",
//       })
//       .then(function (result) {
//         if (result) {
//           GaussianSplatTextureGenerator._taskProcessorReady = true;
//         } else {
//           GaussianSplatTextureGenerator._error = new RuntimeError(
//             "Gaussian splat sorter could not be initialized.",
//           );
//         }
//       })
//       .catch((error) => {
//         GaussianSplatTextureGenerator._error = error;
//       });
//       GaussianSplatTextureGenerator._textureTaskProcessor = processor;
//   }

//   return GaussianSplatTextureGenerator._textureTaskProcessor;
// };

// GaussianSplatTextureGenerator.generateFromAttrs = function (parameters) {
//   const textureTaskProcessor = GaussianSplatTextureGenerator._getTextureTaskProcessor();
//   if (defined(GaussianSplatTextureGenerator._error)) {
//     throw GaussianSplatTextureGenerator._error;
//   }

//   if (!GaussianSplatTextureGenerator._taskProcessorReady) {
//     return;
//   }

//   const { attributes } = parameters;
//   return textureTaskProcessor.scheduleTask(parameters,[
//     attributes.positions.typedArray,
//     attributes.scales.typedArray,
//     attributes.rotations.typedArray,
//     attributes.colors.typedArray
//   ]);
// };

export default GaussianSplatTextureGenerator;
