import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import ModelSilhouetteStageFS from "../../Shaders/Model/ModelSilhouetteStageFS.js";
import ModelSilhouetteStageVS from "../../Shaders/Model/ModelSilhouetteStageVS.js";

/**
 * The model silhouette pipeline stage is responsible applying silhouettes to the model.
 *
 * @namespace ModelSilhouettePipelineStage
 *
 * @private
 */
const ModelSilhouettePipelineStage = {};
ModelSilhouettePipelineStage.name = "ModelSilhouettePipelineStage"; // Helps with debugging

/**
 * Tracks how many silhouettes have been created. This value is used to
 * assign a reference number to the stencil.
 *
 * @type {Number}
 * @private
 */
ModelSilhouettePipelineStage.silhouettesLength = 0;

/**
 * Process a model. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>defines the silhouette ID for the model, if it doesn't yet exist
 *  <li>adds a define to the shaders to indicate that the model uses silhouettes</li>
 *  <li>adds a function to the vertex shader to create the silhouette around the model</li>
 *  <li>adds a function to the fragment shader to apply color to the silhouette</li>
 *  <li>adds the uniforms to the shaders for the corresponding silhouette properties</li>
 *  <li>adds a uniform to distinguish which draw command is used to render the silhouette</li>
 *  <li>sets a variable in the render resources denoting whether the model has a silhouette</li>
 * </ul>
 *
 * <p>
 * Note that the model must have a normal attribute in order to use silhouettes. The flag for this is
 * added to the shader in GeometryPipelineStage.
 * </p>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {Model} model The model.
 * @param {FrameState} frameState The frameState.
 *
 * @private
 */
ModelSilhouettePipelineStage.process = function (
  renderResources,
  model,
  frameState
) {
  if (!defined(model._silhouetteId)) {
    model._silhouetteId = ++ModelSilhouettePipelineStage.silhouettesLength;
  }

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_SILHOUETTE", undefined, ShaderDestination.BOTH);

  shaderBuilder.addVertexLines([ModelSilhouetteStageVS]);
  shaderBuilder.addFragmentLines([ModelSilhouetteStageFS]);

  shaderBuilder.addUniform(
    "vec4",
    "model_silhouetteColor",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addUniform(
    "float",
    "model_silhouetteSize",
    ShaderDestination.VERTEX
  );

  // Rendering silhouettes requires two draw commands:
  // - First, the model is rendered as normal, writing to the stencil buffer.
  // - Second, the silhouette is drawn, and the stencil buffer is used to cutout
  //   the part that overlaps the regular model.
  //
  // To avoid creating a second shader program to handle silhouettes, a uniform
  // is used to distinguish between the two draw commands. The second command will set
  // this uniform true, such that only it applies the silhouette stage.
  shaderBuilder.addUniform(
    "bool",
    "model_silhouettePass",
    ShaderDestination.BOTH
  );

  const uniformMap = {
    model_silhouetteColor: function () {
      return model.silhouetteColor;
    },
    model_silhouetteSize: function () {
      return model.silhouetteSize;
    },
    model_silhouettePass: function () {
      // This will be set to true by the draw command that draws the silhouette.
      return false;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
  renderResources.hasSilhouette = true;
};

export default ModelSilhouettePipelineStage;
