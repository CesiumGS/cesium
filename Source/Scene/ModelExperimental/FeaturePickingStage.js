import combine from "../../Core/combine.js";
import defaultValue from "../../Core/defaultValue.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

var FeaturePickingPipelineStage = {};

FeaturePickingPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var batchTexture = renderResources.model.featureTable.batchTexture;
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine(
    "FEATURE_ID_ATTRIBUTE",
    "a_featureId",
    ShaderDestination.VERTEX
  );
  shaderBuilder.addUniform("vec4", "model_textureStep");

  if (batchTexture.textureDimensions.y > 1) {
    shaderBuilder.addDefine("MULTILINE_BATCH_TEXTURE");
    shaderBuilder.addUniform("vec2", "model_textureDimensions");
  }

  shaderBuilder.addUniform(
    "sampler2D",
    "model_batchTexture",
    ShaderDestination.VERTEX
  );

  shaderBuilder.addVarying("vec2", "model_featureSt");
  shaderBuilder.addVarying("vec4", "model_featureColor");

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
};

export default FeaturePickingPipelineStage;
