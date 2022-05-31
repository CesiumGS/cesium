import SilhouetteStageFS from "../../Shaders/ModelExperimental/SilhouetteStageFS.js";
import SilhouetteStageVS from "../../Shaders/ModelExperimental/SilhouetteStageVS.js";

/**
 * The morph targets pipeline stage processes the morph targets and weights of a primitive.
 *
 * @namespace SilhouettePipelineStage
 *
 * @private
 */

const SilhouettePipelineStage = {};
SilhouettePipelineStage.name = "SilhouettePipelineStage"; // Helps with debugging

/**
 * This pipeline stage processes the morph targets and weights of a primitive,
 * adding the relevant attribute declarations and functions to the shaders.
 *
 * Processes a primitive. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> adds attribute declarations for the morph targets in the vertex shader
 *  <li> adds the uniform declaration for the morph weights in the vertex shader
 *  <li> adds functions to apply the morphs in the vertex shader
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 *
 * @private
 */
SilhouettePipelineStage.process = function (renderResources, primitive) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addVertexLines([SilhouetteStageVS]);
  shaderBuilder.addFragmentLines([SilhouetteStageFS]);
};

export default SilhouettePipelineStage;
