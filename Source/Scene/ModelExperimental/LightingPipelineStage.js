import ShaderDestination from "../../Renderer/ShaderDestination.js";
import LightingStageFS from "../../Shaders/ModelExperimental/LightingStageFS.js";

/**
 * The lighting pipeline stage is responsible for taking a material and rendering
 * it with a lighting model such as physically based rendering (PBR) or unlit
 * shading
 * @namespace
 * @private
 */
var LightingPipelineStage = {};

/**
 * Process a primitive. This modifies the following parts of the render
 * resources:
 * <ul>
 *   <li>modifies the shader to include the lighting stage</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered. Not used, but present for consistency with other pipeline stages.
 * @private
 */
LightingPipelineStage.process = function (renderResources, primitive) {
  var shaderBuilder = renderResources.shaderBuilder;

  // Hard-coding this for now, a future branch will enable PBR lighting
  shaderBuilder.addDefine(
    "LIGHTING_UNLIT",
    undefined,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFragmentLines([LightingStageFS]);
};

export default LightingPipelineStage;
