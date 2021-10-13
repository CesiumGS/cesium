import combine from "../../Core/combine.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";

/**
 * The batch texture stage is responsible for setting up the batch texture for the primitive.
 *
 * @namespace BatchTexturePipelineStage
 * @private
 */
var BatchTexturePipelineStage = {};
BatchTexturePipelineStage.name = "BatchTexturePipelineStage"; // Helps with debugging

/**
 * Processes a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>adds uniforms for the batch texture</li>
 *  <li>adds defines for multiline batch textures</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 */
BatchTexturePipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var shaderBuilder = renderResources.shaderBuilder;
  var batchTextureUniforms = {};

  var model = renderResources.model;
  var featureTable = model.featureTables[model.featureTableId];

  // Number of features in the feature table.
  var featuresLength = featureTable.featuresLength;
  shaderBuilder.addUniform("float", "model_featuresLength");
  batchTextureUniforms.model_featuresLength = function () {
    return featuresLength;
  };

  // Batch texture
  var batchTexture = featureTable.batchTexture;
  shaderBuilder.addUniform("sampler2D", "model_batchTexture");
  batchTextureUniforms.model_batchTexture = function () {
    return defaultValue(batchTexture.batchTexture, batchTexture.defaultTexture);
  };

  // Batch texture step size
  shaderBuilder.addUniform("vec4", "model_textureStep");
  batchTextureUniforms.model_textureStep = function () {
    return batchTexture.textureStep;
  };

  // Batch texture dimensions
  if (batchTexture.textureDimensions.y > 1) {
    shaderBuilder.addDefine("MULTILINE_BATCH_TEXTURE");
    shaderBuilder.addUniform("vec2", "model_textureDimensions");
    batchTextureUniforms.model_textureDimensions = function () {
      return batchTexture.textureDimensions;
    };
  }

  renderResources.uniformMap = combine(
    batchTextureUniforms,
    renderResources.uniformMap
  );
};

export default BatchTexturePipelineStage;
