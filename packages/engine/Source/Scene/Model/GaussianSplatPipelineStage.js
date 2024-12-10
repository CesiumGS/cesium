import ShaderDestination from "../../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../../Shaders/Model/GaussianSplatVS.js";
import GaussianSplatFS from "../../Shaders/Model/GaussianSplatFS.js";
import Pass from "../../Renderer/Pass.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import BlendingState from "../BlendingState.js";
import Matrix4 from "../../Core/Matrix4.js";

// class CesiumPerformanceTimer {
//   constructor() {
//     this.startTime = null;
//     this.endTime = null;
//   }

//   start() {
//     this.startTime = performance.now();
//   }

//   end() {
//     this.endTime = performance.now();
//   }

//   getExecutionTime() {
//     if (!this.startTime || !this.endTime) {
//       throw new Error(
//         "Timer must be started and ended before getting execution time",
//       );
//     }
//     return {
//       milliseconds: this.endTime - this.startTime,
//     };
//   }

//   reset() {
//     this.startTime = null;
//     this.endTime = null;
//   }
// }

const GaussianSplatPipelineStage = {
  name: "GaussianSplatPipelineStage",
};

GaussianSplatPipelineStage.process = function (
  renderResources,
  primitive,
  frameState,
) {
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

  if (primitive.hasAttributeTexture) {
    shaderBuilder.addDefine(
      "HAS_SPLAT_TEXTURE",
      undefined,
      ShaderDestination.BOTH,
    );
  }

  shaderBuilder.addAttribute("vec2", "a_screenQuadPosition");
  shaderBuilder.addAttribute("vec3", "a_splatPosition");
  shaderBuilder.addAttribute("vec4", "a_splatColor");

  shaderBuilder.addVarying("vec4", "v_splatColor");
  shaderBuilder.addVarying("vec2", "v_vertPos");
  shaderBuilder.addVarying("float", "v_splatOpacity");
  shaderBuilder.addVarying("vec4", "v_splatScale");
  shaderBuilder.addVarying("vec4", "v_splatRot");

  shaderBuilder.addUniform("float", "u_tan_fovX", ShaderDestination.VERTEX);
  shaderBuilder.addUniform("float", "u_tan_fovY", ShaderDestination.VERTEX);
  shaderBuilder.addUniform("float", "u_focalX", ShaderDestination.VERTEX);
  shaderBuilder.addUniform("float", "u_focalY", ShaderDestination.VERTEX);
  shaderBuilder.addUniform("float", "u_splatScale", ShaderDestination.VERTEX);
  shaderBuilder.addUniform("mat4", "u_scalingMatrix", ShaderDestination.VERTEX);

  const uniformMap = renderResources.uniformMap;
  const cam = frameState.camera;
  const width = frameState.context.drawingBufferWidth;
  const height = frameState.context.drawingBufferHeight;

  const tan_fovx = Math.tan(cam.frustum.fov * 0.5);
  const tan_fovy = Math.tan(cam.frustum.fovy * 0.5);
  const focal_x = width / (tan_fovx * 2);
  const focal_y = height / (tan_fovy * 2);

  uniformMap.u_tan_fovX = function () {
    return tan_fovx;
  };

  uniformMap.u_tan_fovY = function () {
    return tan_fovy;
  };

  uniformMap.u_focalX = function () {
    return focal_x;
  };

  uniformMap.u_focalY = function () {
    return focal_y;
  };

  uniformMap.u_splatScale = function () {
    return renderResources.model?.style?.splatScale ?? 1.0;
  };

  uniformMap.u_scalingMatrix = function () {
    return renderResources.model.sceneGraph.components.nodes[0].matrix;
  };

  const radixSort = () => {
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

    const newPosArray = new posArray.constructor(posArray.length);
    const newScaleArray = new scaleArray.constructor(scaleArray.length);
    const newRotArray = new rotArray.constructor(rotArray.length);
    const newClrArray = new clrArray.constructor(clrArray.length);

    const calcDepth = (i) =>
      posArray[i * 3] * modelView[2] +
      posArray[i * 3 + 1] * modelView[6] +
      posArray[i * 3 + 2] * modelView[10];

    const depthValues = new Int32Array(renderResources.count);
    let maxDepth = -Infinity;
    let minDepth = Infinity;

    for (let i = 0; i < renderResources.count; i++) {
      const depth = (calcDepth(i) * 4096) | 0;
      depthValues[i] = depth;
      maxDepth = Math.max(maxDepth, depth);
      minDepth = Math.min(minDepth, depth);
    }

    const depthOffset = -minDepth;
    for (let i = 0; i < renderResources.count; i++) {
      depthValues[i] += depthOffset;
    }

    const indices = new Uint32Array(renderResources.count);
    for (let i = 0; i < renderResources.count; i++) {
      indices[i] = i;
    }

    const tempDepths = new Int32Array(renderResources.count);
    const tempIndices = new Uint32Array(renderResources.count);

    for (let shift = 0; shift < 32; shift += 8) {
      const counts = new Uint32Array(256);

      for (let i = 0; i < renderResources.count; i++) {
        const byte = (depthValues[i] >> shift) & 0xff;
        counts[byte]++;
      }

      let total = 0;
      for (let i = 0; i < 256; i++) {
        const count = counts[i];
        counts[i] = total;
        total += count;
      }

      for (let i = 0; i < renderResources.count; i++) {
        const byte = (depthValues[i] >> shift) & 0xff;
        const pos = counts[byte]++;

        tempDepths[pos] = depthValues[i];
        tempIndices[pos] = indices[i];
      }

      depthValues.set(tempDepths);
      indices.set(tempIndices);
    }

    for (let i = 0; i < renderResources.count; i++) {
      const j = indices[i];

      newPosArray[i * 3] = posArray[j * 3];
      newPosArray[i * 3 + 1] = posArray[j * 3 + 1];
      newPosArray[i * 3 + 2] = posArray[j * 3 + 2];

      newScaleArray[i * 3] = scaleArray[j * 3];
      newScaleArray[i * 3 + 1] = scaleArray[j * 3 + 1];
      newScaleArray[i * 3 + 2] = scaleArray[j * 3 + 2];

      newRotArray[i * 4] = rotArray[j * 4];
      newRotArray[i * 4 + 1] = rotArray[j * 4 + 1];
      newRotArray[i * 4 + 2] = rotArray[j * 4 + 2];
      newRotArray[i * 4 + 3] = rotArray[j * 4 + 3];

      newClrArray[i * 4] = clrArray[j * 4];
      newClrArray[i * 4 + 1] = clrArray[j * 4 + 1];
      newClrArray[i * 4 + 2] = clrArray[j * 4 + 2];
      newClrArray[i * 4 + 3] = clrArray[j * 4 + 3];
    }

    posAttr.typedArray = newPosArray;
    scaleAttr.typedArray = newScaleArray;
    rotAttr.typedArray = newRotArray;
    clrAttr.typedArray = newClrArray;
  };

  radixSort();

  renderResources.instanceCount = renderResources.count;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_STRIP;

  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
};

export default GaussianSplatPipelineStage;
