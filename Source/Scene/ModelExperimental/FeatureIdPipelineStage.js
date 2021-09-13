import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The feature ID pipeline stage is responsible for handling features in the model.
 *
 * @namespace FeatureIdPipelineStage
 * @private
 */
var FeatureIdPipelineStage = {};

/**
 * Process a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>sets the defines for the feature ID attribute or texture coordinates to use for feature picking</li>
 *  <li>adds uniforms for the batch texture</li>
 *  <li>sets up varying for the feature coordinates</li>
 *  <li>adds vertex shader code for computing feature coordinates</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 */
FeatureIdPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var shaderBuilder = renderResources.shaderBuilder;
  var uniformMap = renderResources.uniformMap;
  var model = renderResources.model;

  shaderBuilder.addDefine("HAS_FEATURES", undefined, ShaderDestination.BOTH);

  // Handle feature attribution: through feature ID texture or feature ID vertex attribute.
  var featureIdTextures = primitive.featureIdTextures;
  if (featureIdTextures.length > 0) {
    var featureIdTextureIndex = renderResources.model.featureIdTextureIndex;
    var featureIdTexture = featureIdTextures[featureIdTextureIndex];
    renderResources.featureTableId = featureIdTexture.featureTableId;

    var featureIdTextureReader = featureIdTexture.textureReader;

    var featureIdTextureUniformName =
      "u_featureIdTexture_" + featureIdTextureIndex;
    shaderBuilder.addDefine(
      "FEATURE_ID_TEXTURE",
      featureIdTextureUniformName,
      ShaderDestination.BOTH
    );
    shaderBuilder.addUniform(
      "sampler2D",
      featureIdTextureUniformName,
      ShaderDestination.BOTH
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
      "FEATURE_ID_TEXCOORD",
      "v_texCoord_" + featureIdTextureReader.texCoord,
      ShaderDestination.FRAGMENT
    );

    shaderBuilder.addDefine(
      "FEATURE_ID_CHANNEL",
      featureIdTextureReader.channels,
      ShaderDestination.FRAGMENT
    );
  } else {
    var featureIdAttributeIndex = model.featureIdAttributeIndex;
    var instances = renderResources.runtimeNode.node.instances;
    var featureIdAttribute;
    var featureIdAttributeVariableName;

    // Set the FEATURE_ID_ATTRIBUTE to the instanced feature ID vertex attribute, if available.
    if (defined(instances)) {
      featureIdAttribute =
        instances.featureIdAttributes[featureIdAttributeIndex];
      renderResources.featureTableId = featureIdAttribute.featureTableId;
      featureIdAttributeVariableName =
        "a_instanceFeatureId_" + featureIdAttribute.setIndex;
    } else {
      featureIdAttribute =
        primitive.featureIdAttributes[featureIdAttributeIndex];
      renderResources.featureTableId = featureIdAttribute.featureTableId;
      featureIdAttributeVariableName =
        "a_featureId_" + featureIdAttribute.setIndex;
    }

    shaderBuilder.addDefine(
      "FEATURE_ID_ATTRIBUTE",
      featureIdAttributeVariableName,
      ShaderDestination.VERTEX
    );
    shaderBuilder.addVarying("float", "model_featureId");
    shaderBuilder.addVarying("vec2", "model_featureSt");
  }
};

export default FeatureIdPipelineStage;
