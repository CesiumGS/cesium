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

  //use the voxel pass to isolate ourselves for now
  renderResources.alphaOptions.pass = Pass.TRANSLUCENT;

  shaderBuilder.addDefine(
    "HAS_POINT_CLOUD_SPLAT",
    undefined,
    ShaderDestination.BOTH
  );

  shaderBuilder.addUniform("vec2", "v_splatPosition");
  shaderBuilder.addVarying("vec2", "v_splatVertexPos"); //we may not need to pass this if v_positionMC suffices

  renderResources.instanceCount = renderResources.count;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_STRIP;

  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
};

export default GaussianSplatPipelineStage;
