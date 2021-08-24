import BatchTextureCommon from "../../Shaders/ModelExperimental/BatchTextureCommon.js";
import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import defaultValue from "../../Core/defaultValue.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import PickingStageVS from "../../Shaders/ModelExperimental/PickingStageVS.js";
import PickingStageFS from "../../Shaders/ModelExperimental/PickingStageFS.js";

/**
 * The picking pipeline stage adds the attributes and shader code for picking a primitive.
 *
 * @namespace PickingPipelineStage
 *
 * @private
 */
var PickingPipelineStage = {};

/**
 * This pipeline adds the attributes and shader code for picking a primitive.
 *
 * Processes a primitive. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> </li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
PickingPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var model = renderResources.model;
  //var owner = model._pickObject;
  var pickId = frameState.context.createPickId(model);

  if (defined(model._featureTable)) {
    processPickTexture(renderResources, model._featureTable);
  } else {
    processPickColor(renderResources, pickId);
  }
};

function processPickColor(renderResources, pickId) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addUniform("vec4", "czm_pickColor");

  var pickingUniforms = {
    czm_pickColor: function () {
      return pickId.color;
    },
  };

  renderResources.uniformMap = combine(
    pickingUniforms,
    renderResources.uniformMap
  );
  renderResources.pickId = "czm_pickColor";
}

function processPickTexture(renderResources, featureTable) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("FEATURE_PICKING");
  shaderBuilder.addDefine("VERTEX_TEXTURE_FETCH_SUPPORTED");
  shaderBuilder.addDefine("PICKING_ATTRIBUTE", "a_featureId_0");
  shaderBuilder.addUniform(
    "sampler2D",
    "u_pickTexture",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addVertexLines([BatchTextureCommon]);
  shaderBuilder.addFragmentLines([BatchTextureCommon]);
  shaderBuilder.addVertexLines([PickingStageVS]);
  shaderBuilder.addFragmentLines([PickingStageFS]);

  var batchTexture = featureTable._batchTexture;
  var pickingUniforms = {
    u_pickTexture: function () {
      return batchTexture.pickTexture;
    },
    model_batchTexture: function () {
      return defaultValue(
        // add the pick texture and batch texture
        batchTexture.batchTexture,
        batchTexture.defaultTexture
      );
    },
    u_textureStep: function () {
      return batchTexture.textureStep;
    },
    u_textureDimensions: function () {
      return batchTexture.textureDimensions;
    },
  };

  renderResources.uniformMap = combine(
    pickingUniforms,
    renderResources.uniformMap
  );
  renderResources.pickId = "texture2D(model_pickTexture, model_featureSt);";
}

export default PickingPipelineStage;
