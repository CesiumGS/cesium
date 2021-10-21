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
FeatureIdPipelineStage.name = "FeatureIdPipelineStage"; // Helps with debugging

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

  renderResources.hasFeatureIds = true;

  shaderBuilder.addDefine("HAS_FEATURES", undefined, ShaderDestination.BOTH);

  // Handle feature attribution: through feature ID texture or feature ID vertex attribute.
  var featureIdTextures = primitive.featureIdTextures;
  if (featureIdTextures.length > 0) {
    processFeatureIdTextures(renderResources, frameState, featureIdTextures);
  } else {
    processFeatureIdAttributes(renderResources, frameState, primitive);
  }

  shaderBuilder.addFragmentLines([FeatureStageCommon, FeatureStageFS]);
};

/**
 * Generates an object containing information about the Feature ID attribute.
 * @private
 */
function getFeatureIdAttributeInfo(
  featureIdAttributeIndex,
  primitive,
  instances
) {
  var featureIdCount;
  var featureIdAttribute;
  var featureIdAttributePrefix;
  var featureIdInstanceDivisor = 0;

  if (defined(instances)) {
    featureIdAttribute = instances.featureIdAttributes[featureIdAttributeIndex];
    featureIdCount = instances.attributes[0].count;
    featureIdAttributePrefix = "a_instanceFeatureId_";
    featureIdInstanceDivisor = 1;
  } else {
    featureIdAttribute = primitive.featureIdAttributes[featureIdAttributeIndex];
    var positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.POSITION
    );
    featureIdCount = positionAttribute.count;
    featureIdAttributePrefix = "a_featureId_";
  }

  return {
    count: featureIdCount,
    attribute: featureIdAttribute,
    prefix: featureIdAttributePrefix,
    instanceDivisor: featureIdInstanceDivisor,
  };
}

/**
 * Processes feature ID vertex attributes.
 * @private
 */
function processFeatureIdAttributes(renderResources, frameState, primitive) {
  var shaderBuilder = renderResources.shaderBuilder;
  var model = renderResources.model;

  var featureIdAttributePrefix;
  var featureIdAttributeSetIndex;

  // For 3D Tiles 1.0, the FEATURE_ID vertex attribute is present but the Feature ID attribute is not.
  // The featureMetadata is owned by the Cesium3DTileContent for the legacy formats.
  var content = model.content;
  if (defined(content) && defined(content.featureMetadata)) {
    featureIdAttributePrefix = "a_featureId";
    featureIdAttributeSetIndex = "";
  } else {
    var featureIdAttributeIndex = model.featureIdAttributeIndex;
    var instances = renderResources.runtimeNode.node.instances;

    var featureIdAttributeInfo = getFeatureIdAttributeInfo(
      featureIdAttributeIndex,
      primitive,
      instances
    );

    var featureIdAttribute = featureIdAttributeInfo.attribute;
    featureIdAttributePrefix = featureIdAttributeInfo.prefix;

    // Check if the Feature ID attribute references an existing vertex attribute.
    if (defined(featureIdAttribute.setIndex)) {
      featureIdAttributeSetIndex = featureIdAttribute.setIndex;
    } else {
      // Ensure that the new Feature ID vertex attribute generated does not have any conflicts with
      // Feature ID vertex attributes already provided in the model. The featureIdVertexAttributeSetIndex
      // is incremented every time a Feature ID vertex attribute is added.
      featureIdAttributeSetIndex = renderResources.featureIdVertexAttributeSetIndex++;
      generateFeatureIdAttribute(
        featureIdAttributeInfo,
        featureIdAttributeSetIndex,
        frameState,
        renderResources
      );
    }
  }

  shaderBuilder.addDefine(
    "FEATURE_ID_ATTRIBUTE",
    featureIdAttributePrefix + featureIdAttributeSetIndex,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addVarying("float", "v_activeFeatureId");
  shaderBuilder.addVarying("vec2", "v_activeFeatureSt");
  shaderBuilder.addVertexLines([FeatureStageCommon, FeatureStageVS]);
}

/**
 * Processes feature ID textures.
 * @private
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
 * Generates a Feature ID attribute from offset/repeat and adds it to the render resources.
 * @private
 */
function generateFeatureIdAttribute(
  featureIdAttributeInfo,
  featureIdAttributeSetIndex,
  frameState,
  renderResources
) {
  var model = renderResources.model;
  var shaderBuilder = renderResources.shaderBuilder;
  var featureIdAttribute = featureIdAttributeInfo.attribute;
  var featureIdAttributePrefix = featureIdAttributeInfo.prefix;

  // If offset or repeat is used, a new vertex attribute will need to be created.
  var value;
  var vertexBuffer;

  if (!defined(featureIdAttribute.repeat)) {
    value = featureIdAttribute.offset;
  } else {
    var typedArray = generateFeatureIdTypedArray(
      featureIdAttribute,
      featureIdAttributeInfo.count
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
    instanceDivisor: featureIdAttributeInfo.instanceDivisor,
    value: value,
    vertexBuffer: vertexBuffer,
    normalize: false,
    componentsPerAttribute: 1,
    componentDatatype: ComponentDatatype.FLOAT,
    strideInBytes: ComponentDatatype.getSizeInBytes(ComponentDatatype.FLOAT),
    offsetInBytes: 0,
  };

  renderResources.attributes.push(generatedFeatureIdAttribute);

  shaderBuilder.addAttribute(
    "float",
    featureIdAttributePrefix + featureIdAttributeSetIndex
  );
}

/**
 * Generates a typed array based on the offset and repeats of the feature ID attribute.
 *
 * @private
 */
function generateFeatureIdTypedArray(featureIdAttribute, count) {
  var offset = featureIdAttribute.offset;
  var repeat = featureIdAttribute.repeat;

  var typedArray = new Float32Array(count);
  for (var i = 0; i < count; i++) {
    typedArray[i] = offset + Math.floor(i / repeat);
  }

  return typedArray;
}

export default FeatureIdPipelineStage;
