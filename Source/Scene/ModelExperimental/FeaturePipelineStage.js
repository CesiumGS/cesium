import combine from "../../Core/combine.js";
import defaultValue from "../../Core/defaultValue.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import FeatureStageVS from "../../Shaders/ModelExperimental/FeatureStageVS.js";

/**
 * The feature pipeline stage is responsible for handling features in the model.
 *
 * @namespace FeaturePipelineStage
 * @private
 */
var FeaturePipelineStage = {};

/**
 * Process a primitive. This modifies the following parts of the render resources.
 * <ul>
 *  <li>sets the defines for the feature ID attribute or texture coordinates to use for feature picking</li>
 *  <li>adds uniforms for the batch textures</li>
 *  <li>sets up varying for the feature coordinates</li>
 *  <li>adds vertex shader code for computing feature coordinates</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 */
FeaturePipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var shaderBuilder = renderResources.shaderBuilder;
  var uniformMap = renderResources.uniformMap;

  // Handle feature attribution: through feature ID texture or feature ID vertex attribute.
  var featureIdTextures = primitive.featureIdTextures;
  if (featureIdTextures.length > 0) {
    var featureIdIndex = 0;
    // Currently, only one feature ID texture is supported.
    var featureIdTexture = featureIdTextures[featureIdIndex];
    var featureIdTextureReader = featureIdTexture.textureReader;

    var featureIdTextureUniformName = "u_featureIdTexture_" + featureIdIndex;
    shaderBuilder.addUniform(
      "sampler2D",
      featureIdTextureUniformName,
      ShaderDestination.VERTEX
    );
    uniformMap[featureIdTextureUniformName] = function () {
      return defaultValue(
        featureIdTextureReader.texture,
        frameState.context.defaultTexture
      );
    };

    shaderBuilder.addDefine(
      "FEATURE_ID_TEXCOORD",
      "a_texCoord_" + featureIdTextureReader.texCoord,
      ShaderDestination.VERTEX
    );
    shaderBuilder.addDefine(
      "FEATURE_ID_CHANNEL",
      featureIdTextureReader.channels
    );
  } else {
    shaderBuilder.addDefine(
      "FEATURE_ID_ATTRIBUTE",
      "a_featureId_0",
      ShaderDestination.VERTEX
    );
  }

  // Handle the batch texture.
  var batchTexture = renderResources.model._featureTable._batchTexture;
  shaderBuilder.addUniform(
    "sampler2D",
    "model_batchTexture",
    ShaderDestination.VERTEX
  );
  shaderBuilder.addUniform("vec4", "model_textureStep");
  if (batchTexture.textureDimensions.y > 1) {
    shaderBuilder.addDefine("MULTILINE_BATCH_TEXTURE");
    shaderBuilder.addUniform("vec2", "model_textureDimensions");
  }

  shaderBuilder.addVarying("vec2", "model_featureSt");

  var batchTextureUniforms = {
    model_batchTexture: function () {
      return defaultValue(
        batchTexture.batchTexture,
        batchTexture.defaultTexture
      );
    },
    model_textureDimensions: function () {
      return batchTexture.textureDimensions;
    },
    model_textureStep: function () {
      return batchTexture.textureStep;
    },
  };

  renderResources.uniformMap = combine(
    batchTextureUniforms,
    renderResources.uniformMap
  );

  shaderBuilder.addVertexLines([FeatureStageVS]);
};

export default FeaturePipelineStage;
