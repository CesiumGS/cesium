import ShaderDestination from "../../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../../Shaders/Model/GaussianSplatVS.js";
import GaussianSplatFS from "../../Shaders/Model/GaussianSplatFS.js";
import Pass from "../../Renderer/Pass.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import BlendingState from "../BlendingState.js";
import Matrix4 from "../../Core/Matrix4.js";
import __wbg_init, {
  initSync,
  radix_sort_gaussians_attrs,
  radix_sort_simd,
  GSplatData,
} from "cesiumjs-gsplat-utils";

import GaussianSplatTextureGenerator from "./GaussianSplatTextureGenerator.js";

import buildModuleUrl from "../../Core/buildModuleUrl.js";

import PixelFormat from "../../Core/PixelFormat.js";
import PixelDatatype from "../../Renderer/PixelDatatype.js";
import Sampler from "../../Renderer/Sampler.js";
import Texture from "../../Renderer/Texture.js";

let wasmInitialized = false;
let initPromise = null;
let wasmMod;

class CesiumPerformanceTimer {
  constructor() {
    this.startTime = null;
    this.endTime = null;
  }

  start() {
    this.startTime = performance.now();
  }

  end() {
    this.endTime = performance.now();
  }

  getExecutionTime() {
    if (!this.startTime || !this.endTime) {
      throw new Error(
        "Timer must be started and ended before getting execution time",
      );
    }
    return {
      milliseconds: this.endTime - this.startTime,
    };
  }

  reset() {
    this.startTime = null;
    this.endTime = null;
  }
}

const GaussianSplatTexturePipelineStage = {
  name: "GaussianSplatTexturePipelineStage",
};

GaussianSplatTexturePipelineStage.process = function (
  renderResources,
  primitive,
  frameState,
) {
  if (GaussianSplatTextureGenerator.wasmInitialized === false) {
    return;
  }
  const { shaderBuilder } = renderResources;

  const renderStateOptions = renderResources.renderStateOptions;
  renderStateOptions.cull.enabled = false;
  renderStateOptions.depthMask = false;
  renderStateOptions.depthTest.enabled = false;
  renderStateOptions.blending = BlendingState.PRE_MULTIPLIED_ALPHA_BLEND;

  renderResources.alphaOptions.pass = Pass.GAUSSIAN_SPLATS;

  shaderBuilder.addDefine(
    "HAS_GAUSSIAN_SPLATS",
    undefined,
    ShaderDestination.BOTH,
  );

  shaderBuilder.addDefine(
    "HAS_SPLAT_TEXTURE",
    undefined,
    ShaderDestination.BOTH,
  );

  shaderBuilder.addAttribute("vec2", "a_screenQuadPosition");
  shaderBuilder.addAttribute("float", "a_splatIndex");

  shaderBuilder.addVarying("vec4", "v_splatColor");
  shaderBuilder.addVarying("vec2", "v_vertPos");

  shaderBuilder.addUniform(
    "highp usampler2D",
    "u_splatAttributeTexture",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addUniform("float", "u_splatScale", ShaderDestination.VERTEX);

  const uniformMap = renderResources.uniformMap;
  const cam = frameState.camera;

  uniformMap.u_splatScale = function () {
    return renderResources.model?.style?.splatScale ?? 1.0;
  };

  uniformMap.u_splatAttributeTexture = function () {
    return primitive.gaussianSplatTexture;
  };

  const timer = new CesiumPerformanceTimer();
  const radixWasmSimd = async () => {
    async function ensureWasmInitialized() {
      if (!initPromise) {
        initPromise = await __wbg_init(
          buildModuleUrl(
            "ThirdParty/cesium-gsplat/cesiumjs_gsplat_utils_bg.wasm",
          ),
        )
          .then((wasm) => {
            wasmInitialized = true;
            initSync(wasm);
            wasmMod = wasm;
          })
          .catch((err) => {
            console.error("Failed to initialize WASM module:", err);
            throw err;
          });
      }
      return initPromise;
    }

    if (!wasmMod) {
      ensureWasmInitialized();
    }

    if (!wasmInitialized) {
      return;
    }

    const attributes = primitive.attributes;
    const modelView = new Matrix4();
    const modelMat = renderResources.model.modelMatrix;
    Matrix4.multiply(cam.viewMatrix, modelMat, modelView);

    const posAttr = attributes.find((a) => a.name === "POSITION");
    const scaleAttr = attributes.find((a) => a.name === "_SCALE");
    const rotAttr = attributes.find((a) => a.name === "_ROTATION");
    const clrAttr = attributes.find((a) => a.name === "COLOR_0");

    initSync(wasmMod);
    const gsData = GSplatData.fromFloat32Arrays(
      posAttr.typedArray,
      scaleAttr.typedArray,
      rotAttr.typedArray,
      clrAttr.typedArray,
      modelView,
      renderResources.count,
    );

    radix_sort_simd(gsData);

    posAttr.typedArray = gsData.getPositions();
    scaleAttr.typedArray = gsData.getScales();
    rotAttr.typedArray = gsData.getRotations();
    clrAttr.typedArray = gsData.getColors();
  };

  const radixWasm = () => {
    async function ensureWasmInitialized() {
      if (!initPromise) {
        initPromise = await __wbg_init(
          buildModuleUrl("ThirdParty/cesiumjs_gsplat_utils_bg.wasm"),
        )
          .then((wasm) => {
            wasmInitialized = true;
            initSync(wasm);
            wasmMod = wasm;
          })
          .catch((err) => {
            console.error("Failed to initialize WASM module:", err);
            throw err;
          });
      }
      return initPromise;
    }

    if (!wasmMod) {
      ensureWasmInitialized();
    }

    if (!wasmInitialized) {
      return;
    }

    const attributes = primitive.attributes;
    const modelView = new Matrix4();
    const modelMat = renderResources.model.modelMatrix;
    Matrix4.multiply(cam.viewMatrix, modelMat, modelView);

    const posAttr = attributes.find((a) => a.name === "POSITION");
    const scaleAttr = attributes.find((a) => a.name === "_SCALE");
    const rotAttr = attributes.find((a) => a.name === "_ROTATION");
    const clrAttr = attributes.find((a) => a.name === "COLOR_0");

    const posArray = posAttr.typedArray;
    const scaleArray = scaleAttr.typedArray;
    const rotArray = rotAttr.typedArray;
    const clrArray = clrAttr.typedArray;

    initSync(wasmMod);
    timer.start();
    const [newPositions, newScales, newRotations, newColors] =
      radix_sort_gaussians_attrs(
        posArray,
        scaleArray,
        rotArray,
        clrArray,
        modelView,
        renderResources.count,
      );
    timer.end();

    const rExecTime = timer.getExecutionTime();
    console.log(`RadixSort Execution time: ${rExecTime.milliseconds}ms`);
    posAttr.typedArray = newPositions;
    scaleAttr.typedArray = newScales;
    rotAttr.typedArray = newRotations;
    clrAttr.typedArray = newColors;

    GaussianSplatTextureGenerator.generateFromAttrs(
      primitive.attributes,
      primitive.attributes[0].count,
    ).then((splatTextureData) => {
      const splatTex = new Texture({
        context: frameState.context,
        source: {
          width: splatTextureData.width,
          height: splatTextureData.height,
          arrayBufferView: splatTextureData.data,
        },
        preMultiplyAlpha: false,
        skipColorSpaceConversion: true,
        pixelFormat: PixelFormat.RGBA_INTEGER,
        pixelDatatype: PixelDatatype.UNSIGNED_INT,
        flipY: false,
        sampler: Sampler.NEAREST,
      });
      primitive.gaussianSplatTexture = splatTex;
      primitive.hasGaussianSplatTexture = true;
    });
  };

  // const radixSortIndexes = () => {
  //   const modelView = new Matrix4();
  //   const modelMat = renderResources.model.modelMatrix;
  //   Matrix4.multiply(cam.viewMatrix, modelMat, modelView);

  //   const posAttr = primitive.attributes.find((a) => a.name === "POSITION");
  //   const idxAttr = primitive.attributes.find((a) => a.name === "_SPLAT_INDEXES");

  //   const posArray = posAttr.typedArray;

  //   const calcDepth = (i) =>
  //     posArray[i * 3] * modelView[2] +
  //     posArray[i * 3 + 1] * modelView[6] +
  //     posArray[i * 3 + 2] * modelView[10];

  //   const depthValues = new Int32Array(renderResources.count);
  //   let maxDepth = -Infinity;
  //   let minDepth = Infinity;

  //   for (let i = 0; i < renderResources.count; i++) {
  //     const depth = (calcDepth(i) * 4096) | 0;
  //     depthValues[i] = depth;
  //     maxDepth = Math.max(maxDepth, depth);
  //     minDepth = Math.min(minDepth, depth);
  //   }

  //   const depthOffset = -minDepth;
  //   for (let i = 0; i < renderResources.count; i++) {
  //     depthValues[i] += depthOffset;
  //   }

  //   const texWidth = 1024;
  //   const texHeight = Math.ceil(renderResources.count / texWidth);
  //   const paddedSize = texWidth * texHeight;

  //   const indices = new Uint32Array(paddedSize);
  //   for (let i = 0; i < renderResources.count; i++) {
  //     indices[i] = i;
  //   }

  //   for (let i = renderResources.count; i < paddedSize; i++) {
  //     indices[i] = renderResources.count - 1;
  //   }

  //   const tempDepths = new Int32Array(renderResources.count);
  //   const tempIndices = new Uint32Array(renderResources.count);

  //   for (let shift = 0; shift < 32; shift += 8) {
  //     const counts = new Uint32Array(256);

  //     for (let i = 0; i < renderResources.count; i++) {
  //       const byte = (depthValues[i] >> shift) & 0xff;
  //       counts[byte]++;
  //     }

  //     let total = 0;
  //     for (let i = 0; i < 256; i++) {
  //       const count = counts[i];
  //       counts[i] = total;
  //       total += count;
  //     }

  //     for (let i = 0; i < renderResources.count; i++) {
  //       const byte = (depthValues[i] >> shift) & 0xff;
  //       const pos = counts[byte]++;

  //       tempDepths[pos] = depthValues[i];
  //       tempIndices[pos] = indices[i];
  //     }

  //     depthValues.set(tempDepths);
  //     indices.set(tempIndices.subarray(0, renderResources.count));
  //   }
  //   idxAttr.typedArray = indices;
  // };

  const radixSimdWasmTexture = () => {
    async function ensureWasmInitialized() {
      if (!initPromise) {
        initPromise = await __wbg_init(
          buildModuleUrl(
            "ThirdParty/cesium-gsplat/cesiumjs_gsplat_utils_bg.wasm",
          ),
        )
          .then((wasm) => {
            wasmInitialized = true;
            initSync(wasm);
            wasmMod = wasm;
          })
          .catch((err) => {
            console.error("Failed to initialize WASM module:", err);
            throw err;
          });
      }
      return initPromise;
    }

    if (!wasmMod) {
      ensureWasmInitialized();
    }

    if (!wasmInitialized) {
      return;
    }

    const attributes = primitive.attributes;
    const modelView = new Matrix4();
    const modelMat = renderResources.model.modelMatrix;
    Matrix4.multiply(cam.viewMatrix, modelMat, modelView);

    initSync(wasmMod);

    const posAttr = attributes.find((a) => a.name === "POSITION");
    const scaleAttr = attributes.find((a) => a.name === "_SCALE");
    const rotAttr = attributes.find((a) => a.name === "_ROTATION");
    const clrAttr = attributes.find((a) => a.name === "COLOR_0");

    timer.start();
    const gsData = GSplatData.fromFloat32Arrays(
      posAttr.typedArray,
      scaleAttr.typedArray,
      rotAttr.typedArray,
      clrAttr.typedArray,
      modelView,
      renderResources.count,
    );

    radix_sort_simd(gsData);

    posAttr.typedArray = gsData.getPositions();
    scaleAttr.typedArray = gsData.getScales();
    rotAttr.typedArray = gsData.getRotations();
    clrAttr.typedArray = gsData.getColors();
    timer.end();

    const rExecTime = timer.getExecutionTime();
    console.log(`RadixSort Execution time: ${rExecTime.milliseconds}ms`);

    GaussianSplatTextureGenerator.generateFromAttrs(
      primitive.attributes,
      primitive.attributes[0].count,
    ).then((splatTextureData) => {
      const splatTex = new Texture({
        context: frameState.context,
        source: {
          width: splatTextureData.width,
          height: splatTextureData.height,
          arrayBufferView: splatTextureData.data,
        },
        preMultiplyAlpha: false,
        skipColorSpaceConversion: true,
        pixelFormat: PixelFormat.RGBA_INTEGER,
        pixelDatatype: PixelDatatype.UNSIGNED_INT,
        flipY: false,
        sampler: Sampler.NEAREST,
      });
      primitive.gaussianSplatTexture = splatTex;
      primitive.hasGaussianSplatTexture = true;
    });
  };

  const useWasm = false;
  if (useWasm) {
    timer.start();
    radixWasm();

    timer.end();

    timer.start();
    radixWasmSimd();

    timer.end();

    timer.start();
    radixSimdWasmTexture();
    timer.end();
  }

  renderResources.instanceCount = renderResources.count;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_STRIP;

  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
};

export default GaussianSplatTexturePipelineStage;
