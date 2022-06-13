import combine from "../../Core/combine.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import ModelSilhouetteStageFS from "../../Shaders/ModelExperimental/ModelSilhouetteStageFS.js";
import ModelSilhouetteStageVS from "../../Shaders/ModelExperimental/ModelSilhouetteStageVS.js";

/**
 * The model silhouette pipeline stage is responsible for handling the application
 * of silhouettes to the model.
 *
 * @namespace ModelSilhouettePipelineStage
 *
 * @private
 */
const ModelSilhouettePipelineStage = {};
ModelSilhouettePipelineStage.name = "ModelSilhouettePipelineStage"; // Helps with debugging

/**
 * Process a model. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to the shaders to indicate that the model uses silhouettes</li>
 *  <li>adds a function to the vertex shader to create the silhouette around the model</li>
 *  <li>adds a function to the fragment shader to apply color to the silhouette</li>
 *  <li>adds the uniforms to the shaders for the corresponding silhouette properties</li>
 *  <li>adds a uniform to distinguish which draw command is used to render the silhouette</li>
 * </ul>
 *
 * <p>
 * Note that the model must have a normal attribute in order to use silhouettes. The flag for this is
 * added to the shader in GeometryPipelineStage.
 * </p>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {ModelExperimental} model The model.
 * @param {FrameState} frameState The frameState.
 *
 * @private
 */
ModelSilhouettePipelineStage.process = function (
  renderResources,
  model,
  frameState
) {
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
  // - Second, the stencil buffer is used to determine whether to render the silhouette.
  //
  // To avoid creating a second shader program to handle silhouettes, a uniform
  // is used to distinguish between the two draw commands. This functions like a boolean,
  // and the second command will set this uniform to a non-zero value to indicate "true".
  // Thus, only the second draw command will apply the silhouette stage.
  shaderBuilder.addUniform(
    "float",
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
      return 0.0;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ModelSilhouettePipelineStage;
