import ShaderDestination from "../../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../../Shaders/Model/GaussianSplatVS.js";
import GaussianSplatFS from "../../Shaders/Model/GaussianSplatFS.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Pass from "../../Renderer/Pass.js";
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

  //use the voxel pass to isolate ourselves for now
  renderResources.alphaOptions.pass = Pass.VOXELS;

  shaderBuilder.addDefine(
    "HAS_POINT_CLOUD_SPLAT",
    undefined,
    ShaderDestination.BOTH
  );

  shaderBuilder.addVarying("vec2", "v_splatPosition");
  shaderBuilder.addVarying("vec3", "v_conic");
  shaderBuilder.addVarying("vec2", "v_splatVertexPos");

  renderResources.instanceCount = renderResources.count;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_STRIP;

  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
};

export default GaussianSplatPipelineStage;
