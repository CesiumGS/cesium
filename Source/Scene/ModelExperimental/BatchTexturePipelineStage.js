import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

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
 *  <li>adds uniforms for the batch texture
 *  <li>adds defines for multiline batch textures
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources
 * @param {ModelComponents.Primitive} primitive
 * @param {FrameState} frameState
 */
BatchTexturePipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var shaderBuilder = renderResources.shaderBuilder;
  var batchTextureUniforms = {};

  var model = renderResources.model;
  var featureTable;

  var content = model.content;
  if (defined(content)) {
    featureTable = content.featureTables[renderResources.featureTableId];
  } else {
    featureTable = model.featureTables[renderResources.featureTableId];
  }

  // Number of features in the feature table.
  var featuresLength = featureTable.featuresLength;
  shaderBuilder.addUniform(
    "float",
    "model_featuresLength",
    ShaderDestination.BOTH
  );
  batchTextureUniforms.model_featuresLength = function () {
    return featuresLength;
  };

  // Batch texture
  var batchTexture = featureTable.batchTexture;
  shaderBuilder.addUniform(
    "sampler2D",
    "model_batchTexture",
    ShaderDestination.VERTEX
  );
  batchTextureUniforms.model_batchTexture = function () {
    return batchTexture.batchTexture;
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
