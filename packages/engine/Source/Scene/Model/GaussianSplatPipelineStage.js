import ShaderDestination from "../../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../../Shaders/Model/GaussianSplatVS.js";
import GaussianSplatFS from "../../Shaders/Model/GaussianSplatFS.js";
import Pass from "../../Renderer/Pass.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import BlendingState from "../BlendingState.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelUtility from "./ModelUtility.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

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
  renderStateOptions.depthMask = true;
  renderStateOptions.depthTest.enabled = true;
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
  const camera = frameState.camera;
  const width = frameState.context.drawingBufferWidth;
  const height = frameState.context.drawingBufferHeight;

  const tan_fovx = Math.tan(camera.frustum.fov * 0.5);
  const tan_fovy = Math.tan(camera.frustum.fovy * 0.5);
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
    //const attributes = primitive.attributes;
    const modelView = new Matrix4();
    const modelMat = renderResources.model.modelMatrix;
    Matrix4.multiply(camera.viewMatrix, modelMat, modelView);

    const positions = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.POSITION,
    );
    const scales = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.SCALE,
    );
    const rotations = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.ROTATION,
    );
    const colors = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.COLOR,
    );

    const positionsArray = positions.typedArray;
    const scalesArray = scales.typedArray;
    const rotationsArray = rotations.typedArray;
    const colorsArray = colors.typedArray;

    const newPositionsArray = new positionsArray.constructor(
      positionsArray.length,
    );
    const newScalesArray = new scalesArray.constructor(scalesArray.length);
    const newRotationsArray = new rotationsArray.constructor(
      rotationsArray.length,
    );
    const newColorsArray = new colorsArray.constructor(colorsArray.length);

    const calcDepth = (i) =>
      positionsArray[i * 3] * modelView[2] +
      positionsArray[i * 3 + 1] * modelView[6] +
      positionsArray[i * 3 + 2] * modelView[10];

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

      newPositionsArray[i * 3] = positionsArray[j * 3];
      newPositionsArray[i * 3 + 1] = positionsArray[j * 3 + 1];
      newPositionsArray[i * 3 + 2] = positionsArray[j * 3 + 2];

      newScalesArray[i * 3] = scalesArray[j * 3];
      newScalesArray[i * 3 + 1] = scalesArray[j * 3 + 1];
      newScalesArray[i * 3 + 2] = scalesArray[j * 3 + 2];

      newRotationsArray[i * 4] = rotationsArray[j * 4];
      newRotationsArray[i * 4 + 1] = rotationsArray[j * 4 + 1];
      newRotationsArray[i * 4 + 2] = rotationsArray[j * 4 + 2];
      newRotationsArray[i * 4 + 3] = rotationsArray[j * 4 + 3];

      newColorsArray[i * 4] = colorsArray[j * 4];
      newColorsArray[i * 4 + 1] = colorsArray[j * 4 + 1];
      newColorsArray[i * 4 + 2] = colorsArray[j * 4 + 2];
      newColorsArray[i * 4 + 3] = colorsArray[j * 4 + 3];
    }

    positions.typedArray = newPositionsArray;
    scales.typedArray = newScalesArray;
    rotations.typedArray = newRotationsArray;
    colors.typedArray = newColorsArray;
  };

  radixSort();

  renderResources.instanceCount = renderResources.count;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_STRIP;

  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
};

export default GaussianSplatPipelineStage;
