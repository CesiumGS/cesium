import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import FeatureStageCommon from "../../Shaders/ModelExperimental/FeatureStageCommon.js";
import FeatureStageFS from "../../Shaders/ModelExperimental/FeatureStageFS.js";
import FeatureStageVS from "../../Shaders/ModelExperimental/FeatureStageVS.js";

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
  var model = renderResources.model;

  renderResources.hasFeatureIds = true;

  shaderBuilder.addDefine("HAS_FEATURES", undefined, ShaderDestination.BOTH);

  // Handle feature attribution: through feature ID texture or feature ID vertex attribute.
  var featureIdTextures = primitive.featureIdTextures;
  if (featureIdTextures.length > 0) {
    processFeatureIdTextures(renderResources, frameState, featureIdTextures);
  } else {
    var featureIdAttributeIndex = model.featureIdAttributeIndex;
    var instances = renderResources.runtimeNode.node.instances;

    var featureIdCount;
    var featureIdAttribute;
    var featureIdInstanceDivisor = 0;
    var featureIdAttributePrefix;
    var featureIdAttributeSetIndex;

    // Get Feature ID attribute,from the instancing or primitive extension.
    if (defined(instances)) {
      featureIdAttribute =
        instances.featureIdAttributes[featureIdAttributeIndex];
      featureIdCount = instances.attributes[0].count;
      featureIdAttributePrefix = "a_instanceFeatureId_";
      featureIdInstanceDivisor = 1;
    } else {
      featureIdAttribute =
        primitive.featureIdAttributes[featureIdAttributeIndex];
      var positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
        primitive,
        VertexAttributeSemantic.POSITION
      );
      featureIdCount = positionAttribute.count;
      featureIdAttributePrefix = "a_featureId_";
    }

    var featureTableId = featureIdAttribute.featureTableId;
    renderResources.featureTableId = featureTableId;

    // Check if the Feature ID attribute references an existing vertex attribute.
    if (defined(featureIdAttribute.setIndex)) {
      featureIdAttributeSetIndex = featureIdAttribute.setIndex;
    } else {
      // If a constant and/or divisor are used, a new vertex attribute will need to be created.
      var value;
      var vertexBuffer;

      featureIdAttributeSetIndex = renderResources.featureIdVertexAttributeSetIndex++;

      if (featureIdAttribute.divisor === 0) {
        value = featureIdAttribute.constant;
      } else {
        var typedArray = generateFeatureIdTypedArray(
          featureIdAttribute,
          featureIdCount
        );
        vertexBuffer = Buffer.createVertexBuffer({
          context: frameState.context,
          typedArray: typedArray,
          usage: BufferUsage.STATIC_DRAW,
        });
        vertexBuffer.vertexArrayDestroyable = false;
        model._resources.push(vertexBuffer);
      }

      var generatedFeatureIdAttribute = {
        index: renderResources.attributeIndex++,
        instanceDivisor: featureIdInstanceDivisor,
        value: value,
        vertexBuffer: vertexBuffer,
        normalize: false,
        componentsPerAttribute: 1,
        componentDatatype: ComponentDatatype.FLOAT,
        strideInBytes: ComponentDatatype.getSizeInBytes(
          ComponentDatatype.FLOAT
        ),
        offsetInBytes: 0,
      };

      renderResources.attributes.push(generatedFeatureIdAttribute);

      shaderBuilder.addAttribute(
        "float",
        featureIdAttributePrefix + featureIdAttributeSetIndex
      );
    }

    shaderBuilder.addDefine(
      "FEATURE_ID_ATTRIBUTE",
      featureIdAttributePrefix + featureIdAttributeSetIndex,
      ShaderDestination.VERTEX
    );
    shaderBuilder.addVarying("float", "model_featureId");
    shaderBuilder.addVarying("vec2", "model_featureSt");
    shaderBuilder.addVertexLines([FeatureStageCommon]);
    shaderBuilder.addVertexLines([FeatureStageVS]);
  }

  var content = model.content;
  if (defined(content)) {
    content.featureTableId = renderResources.featureTableId;
  }

  shaderBuilder.addFragmentLines([FeatureStageCommon]);
  shaderBuilder.addFragmentLines([FeatureStageFS]);
};

/**
 * Processes feature ID textures.
 */
function processFeatureIdTextures(
  renderResources,
  frameState,
  featureIdTextures
) {
  var shaderBuilder = renderResources.shaderBuilder;
  var uniformMap = renderResources.uniformMap;
  var featureIdTextureIndex = renderResources.model.featureIdTextureIndex;
  var featureIdTexture = featureIdTextures[featureIdTextureIndex];

  renderResources.featureTableId = featureIdTexture.featureTableId;

  var featureIdTextureReader = featureIdTexture.textureReader;

  var featureIdTextureUniformName =
    "u_featureIdTexture_" + featureIdTextureIndex;
  shaderBuilder.addDefine(
    "FEATURE_ID_TEXTURE",
    featureIdTextureUniformName,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addUniform(
    "sampler2D",
    featureIdTextureUniformName,
    ShaderDestination.FRAGMENT
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
}

/**
 * Generates typed array based on the constant and divisor of the feature ID attribute.
 */
function generateFeatureIdTypedArray(featureIdAttribute, count) {
  var constant = featureIdAttribute.constant;
  var divisor = featureIdAttribute.divisor;

  var typedArray = new Float32Array(count);
  for (var i = 0; i < count; i++) {
    typedArray[i] = constant + i / divisor;
  }

  return typedArray;
}

export default FeatureIdPipelineStage;
