import ShaderDestination from "../../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../../Shaders/Model/GaussianSplatVS.js";
import GaussianSplatFS from "../../Shaders/Model/GaussianSplatFS.js";
import Pass from "../../Renderer/Pass.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import BlendingState from "../BlendingState.js";

const GaussianSplatPipelineStage = {
  name: "GaussianSplatPipelineStage",
};

GaussianSplatPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const { shaderBuilder } = renderResources;

  const renderStateOptions = renderResources.renderStateOptions;
  renderStateOptions.cull.enabled = false;
  renderStateOptions.depthMask = false;
  renderStateOptions.blending = BlendingState.PRE_MULTIPLIED_ALPHA_BLEND;

  renderResources.alphaOptions.pass = Pass.GAUSSIAN_SPLATS;

  shaderBuilder.addDefine(
    "HAS_GAUSSIAN_SPLATS",
    undefined,
    ShaderDestination.BOTH
  );

  shaderBuilder.addAttribute("vec2", "a_screenQuadPosition");
  shaderBuilder.addAttribute("vec3", "a_splatPosition");
  shaderBuilder.addAttribute("vec4", "a_splatColor");

  shaderBuilder.addVarying("vec4", "v_splatColor");
  shaderBuilder.addVarying("vec2", "v_vertPos");

  shaderBuilder.addUniform("float", "u_aspectRatio");
  shaderBuilder.addUniform("float", "u_tan_fovX");
  shaderBuilder.addUniform("float", "u_tan_fovY");
  shaderBuilder.addUniform("float", "u_focalX");
  shaderBuilder.addUniform("float", "u_focalY");

  const uniformMap = renderResources.uniformMap;
  const cam = frameState.camera;
  const model = renderResources.model;

  const projMatrix = cam.frustum.projectionMatrix;
  const aspect = projMatrix[0][0] / projMatrix[1][1];
  const tan_fovx = 1 / projMatrix[0][0];
  const tan_fovy = 1 / (projMatrix[1][1] * aspect);
  const focal_x = (model.scene.viewport.width * projMatrix[0][0]) / 2;
  const focal_y = (model.scene.viewport.height * projMatrix[1][1]) / 2;

  uniformMap.u_aspectRatio = function () {
    return aspect;
  };

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

  // const countSort = (gaussians, viewMatrix) => {
  //   let maxDepth = Number.Infinity;
  //   let minDepth = -Number.Infinity;

  //   let sizeList = new Int32Array(gaussians.length);

  // };

  renderResources.instanceCount = renderResources.count;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_FAN;

  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
};

export default GaussianSplatPipelineStage;
