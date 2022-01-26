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
const FeatureIdPipelineStage = {};
FeatureIdPipelineStage.name = "FeatureIdPipelineStage"; // Helps with debugging

FeatureIdPipelineStage.STRUCT_ID_FEATURE = "FeatureStruct";
FeatureIdPipelineStage.STRUCT_NAME_FEATURE = "Feature";
FeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_VS =
  "updateFeatureStructVS";
FeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_FS =
  "updateFeatureStructFS";
FeatureIdPipelineStage.FUNCTION_SIGNATURE_UPDATE_FEATURE =
  "void updateFeatureStruct(inout Feature feature)";

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
  const shaderBuilder = renderResources.shaderBuilder;

  renderResources.hasFeatureIds = true;

  shaderBuilder.addDefine("HAS_FEATURES", undefined, ShaderDestination.BOTH);
  updateFeatureStruct(shaderBuilder);

  // Handle feature attribution: through feature ID texture or feature ID vertex attribute.
  const featureIdTextures = primitive.featureIdTextures;
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
  let featureIdCount;
  let featureIdAttribute;
  let featureIdAttributePrefix;
  let featureIdInstanceDivisor = 0;

  if (defined(instances)) {
    featureIdAttribute = instances.featureIdAttributes[featureIdAttributeIndex];
    featureIdCount = instances.attributes[0].count;
    featureIdAttributePrefix = "a_instanceFeatureId_";
    featureIdInstanceDivisor = 1;
  } else {
    featureIdAttribute = primitive.featureIdAttributes[featureIdAttributeIndex];
    const positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
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
 * Populate the "Feature" struct in the shaders that holds information about the "active" (used for picking/styling) feature.
 * The struct is always added to the shader by the GeometryPipelineStage (required for compilation). The Feature struct looks
 * as follows:
 *
 * struct Feature {
 *   int id;
 *   vec2 st;
 *   vec4 color;
 * }
 *
 * @private
 */
function updateFeatureStruct(shaderBuilder) {
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE,
    "int",
    "id"
  );

  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE,
    "vec2",
    "st"
  );

  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE,
    "vec4",
    "color"
  );
}

/**
 * Generates functions in the vertex and fragment shaders to update the varyings from the Feature struct and to update the Feature struct from the varyings, respectively.
 * @private
 */
function generateFeatureFunctions(shaderBuilder) {
  // Add the function to the vertex shader.
  shaderBuilder.addFunction(
    FeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_VS,
    FeatureIdPipelineStage.FUNCTION_SIGNATURE_UPDATE_FEATURE,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_VS,
    [
      "v_activeFeatureId = float(feature.id);",
      "v_activeFeatureSt = feature.st;",
      "v_activeFeatureColor = feature.color;",
    ]
  );

  // Add the function to the fragment shader.
  shaderBuilder.addFunction(
    FeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_FS,
    FeatureIdPipelineStage.FUNCTION_SIGNATURE_UPDATE_FEATURE,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_FEATURE_VARYINGS_FS,
    [
      "feature.id = int(v_activeFeatureId);",
      "feature.st = v_activeFeatureSt;",
      "feature.color = v_activeFeatureColor;",
    ]
  );
}

/**
 * Processes feature ID vertex attributes.
 * @private
 */
function processFeatureIdAttributes(renderResources, frameState, primitive) {
  const shaderBuilder = renderResources.shaderBuilder;
  const model = renderResources.model;
  const instances = renderResources.runtimeNode.node.instances;

  const featureIdAttributeIndex = model.featureIdAttributeIndex;

  const featureIdAttributeInfo = getFeatureIdAttributeInfo(
    featureIdAttributeIndex,
    primitive,
    instances
  );

  const featureIdAttribute = featureIdAttributeInfo.attribute;
  const featureIdAttributePrefix = featureIdAttributeInfo.prefix;
  let featureIdAttributeSetIndex;

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

  shaderBuilder.addDefine(
    "FEATURE_ID_ATTRIBUTE",
    featureIdAttributePrefix + featureIdAttributeSetIndex,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addVarying("float", "v_activeFeatureId");
  shaderBuilder.addVarying("vec2", "v_activeFeatureSt");
  shaderBuilder.addVarying("vec4", "v_activeFeatureColor");
  generateFeatureFunctions(shaderBuilder);
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
  const shaderBuilder = renderResources.shaderBuilder;
  const uniformMap = renderResources.uniformMap;
  const featureIdTextureIndex = renderResources.model.featureIdTextureIndex;
  const featureIdTexture = featureIdTextures[featureIdTextureIndex];

  const featureIdTextureReader = featureIdTexture.textureReader;

  const featureIdTextureUniformName =
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
  const model = renderResources.model;
  const shaderBuilder = renderResources.shaderBuilder;
  const featureIdAttribute = featureIdAttributeInfo.attribute;
  const featureIdAttributePrefix = featureIdAttributeInfo.prefix;

  // If offset or repeat is used, a new vertex attribute will need to be created.
  let value;
  let vertexBuffer;

  if (!defined(featureIdAttribute.repeat)) {
    value = featureIdAttribute.offset;
  } else {
    const typedArray = generateFeatureIdTypedArray(
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

  const generatedFeatureIdAttribute = {
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
  const offset = featureIdAttribute.offset;
  const repeat = featureIdAttribute.repeat;

  const typedArray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    typedArray[i] = offset + Math.floor(i / repeat);
  }

  return typedArray;
}

export default FeatureIdPipelineStage;
