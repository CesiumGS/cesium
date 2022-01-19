import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelComponents from "../ModelComponents.js";
import FeatureIdStageFS from "../../Shaders/ModelExperimental/FeatureIdStageFS.js";
import FeatureIdStageVS from "../../Shaders/ModelExperimental/FeatureIdStageVS.js";

/**
 * The feature ID pipeline stage is responsible for handling features in the model.
 *
 * @namespace FeatureIdPipelineStage
 * @private
 */
var FeatureIdPipelineStage = {};
FeatureIdPipelineStage.name = "FeatureIdPipelineStage"; // Helps with debugging

FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS = "FeatureIdsVS";
FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS = "FeatureIdsFS";
FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS = "FeatureIds";
FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS =
  "initializeFeatureIdsVS";
FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS =
  "initializeFeatureIdsFS";
FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS =
  "void initializeFeatureIds(out FeatureIds featureIds, ProcessedAttributes attributes)";
FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS =
  "setFeatureIdVaryings";
FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS =
  "void setFeatureIdVaryings()";

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
  declareStructsAndFunctions(shaderBuilder);

  var instances = renderResources.runtimeNode.node.instances;
  if (defined(instances)) {
    processInstanceFeatureIds(renderResources, instances);
  }
  processPrimitiveFeatureIds(renderResources, primitive, frameState);

  shaderBuilder.addVertexLines([FeatureIdStageVS]);
  shaderBuilder.addFragmentLines([FeatureIdStageFS]);
};

function declareStructsAndFunctions(shaderBuilder) {
  // Declare the FeatureIds struct. The vertex shader will only use
  // feature ID attributes, while the fragment shader will also use
  // feature ID textures.
  shaderBuilder.addStruct(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
    FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addStruct(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
    FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS,
    ShaderDestination.FRAGMENT
  );

  // declare the initializeFeatureIds() function. The details may differ
  // between vertex and fragment shader
  shaderBuilder.addFunction(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
    FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addFunction(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
    FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS,
    ShaderDestination.FRAGMENT
  );

  // declare the setFeatureIdVaryings() function in the vertex shader only
  shaderBuilder.addFunction(
    FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
    FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS,
    ShaderDestination.VERTEX
  );
}

function processInstanceFeatureIds(renderResources, instances) {
  var featureIdsArray = instances.featureIds;
  var count = instances.attributes[0].count;

  for (var i = 0; i < featureIdsArray.length; i++) {
    var featureIds = featureIdsArray[i];
    var variableName = "instanceFeatureId_" + i;

    if (featureIds instanceof ModelComponents.FeatureIdAttribute) {
      processAttribute(renderResources, featureIds, variableName);
    } else {
      var instanceDivisor = 1;
      processImplicitRange(
        renderResources,
        featureIds,
        variableName,
        count,
        instanceDivisor
      );
    }
  }
}

function processPrimitiveFeatureIds(renderResources, primitive, frameState) {
  var featureIdsArray = primitive.featureIds;
  var positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION
  );
  var count = positionAttribute.count;

  for (var i = 0; i < featureIdsArray.length; i++) {
    var featureIds = featureIdsArray[i];
    var variableName = "featureId_" + i;
    if (featureIds instanceof ModelComponents.FeatureIdAttribute) {
      processAttribute(renderResources, featureIds, variableName);
    } else if (featureIds instanceof ModelComponents.FeatureIdImplicitRange) {
      processImplicitRange(renderResources, featureIds, variableName, count);
    } else {
      processTexture(renderResources, featureIds, variableName, i, frameState);
    }
  }
}

function processAttribute(renderResources, featureIdAttribute, variableName) {
  // Add a field to the FeatureIds struct.
  // Example:
  // struct FeatureIds {
  //   ...
  //   float featureId_n;
  //   ...
  // }
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
    "float",
    variableName
  );
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
    "float",
    variableName
  );

  // Initialize the field from the corresponding attribute.
  // Example: featureIds.featureId_n = attributes.featureId_0;
  // Since this uses the ProcessedAttributes struct, the line is the same
  // for both vertex and fragment shader.
  var setIndex = featureIdAttribute.setIndex;
  var initializationLines = [
    "featureIds." + variableName + " = attributes.featureId_" + setIndex + ";",
  ];
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
    initializationLines
  );
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
    initializationLines
  );
}

function processImplicitRange(
  renderResources,
  implicitFeatureIds,
  variableName,
  count,
  instanceDivisor
) {
  // Generate a vertex attribute for the implicit IDs since WebGL 1 does not
  // support gl_VertexID
  generateImplicitFeatureIdAttribute(
    renderResources,
    implicitFeatureIds,
    count,
    instanceDivisor
  );

  // Declare the vertex attribute in the shader
  // Example: attribute float a_implicit_feature_id_n;
  var shaderBuilder = renderResources.shaderBuilder;
  var implicitAttributeName = "a_implicit_" + variableName;
  shaderBuilder.addAttribute("float", implicitAttributeName);

  // Also declare the corresponding varyings
  // Example: varying float v_implicit_feature_id_n;
  var implicitVaryingName = "v_implicit_" + variableName;
  shaderBuilder.addVarying("float", implicitVaryingName);

  // Add a field to the FeatureIds struct.
  // Example:
  // struct FeatureIds {
  //   ...
  //   float featureId_n;
  //   ...
  // }
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
    "float",
    variableName
  );
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
    "float",
    variableName
  );

  // The varying needs initialization in the vertex shader
  // Example:
  // v_implicit_featureId_n = a_implicit_featureId_n;
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
    [implicitVaryingName + " = " + implicitAttributeName + ";"]
  );

  // Initialize the field from the generated attribute/varying.
  // Example:
  // featureIds.featureId_n = a_implicit_featureId_n; (VS)
  // featureIds.featureId_n = v_implicit_featureId_n; (FS)
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
    ["featureIds." + variableName + " = " + implicitAttributeName + ";"]
  );
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
    ["featureIds." + variableName + " = " + implicitVaryingName + ";"]
  );
}

function processTexture(
  renderResources,
  featureIdTexture,
  variableName,
  index,
  frameState
) {
  // Create the feature ID texture uniform. The index matches the index from
  // the featureIds array, even if this is not consecutive.
  var uniformName = "u_featureIdTexture_" + index;
  var uniformMap = renderResources.uniformMap;
  var textureReader = featureIdTexture.textureReader;
  uniformMap[uniformName] = function () {
    return defaultValue(
      textureReader.texture,
      frameState.context.defaultTexture
    );
  };

  // Add a field to the FeatureIds struct in the fragment shader only
  // Example:
  // struct FeatureIds {
  //   ...
  //   float featureId_n;
  //   ...
  // }
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
    "float",
    variableName
  );

  // Declare the uniform in the fragment shader
  shaderBuilder.addUniform(
    "sampler2D",
    uniformName,
    ShaderDestination.FRAGMENT
  );

  // Initialize the FeatureIds struct in the fragment shader.
  // Example:
  // featureIds.featureId_n = floor(texture2D(u_featureIdTexture_m, attributes.texCoord_p).r * 255.0 + 0.5);

  var texCoord = "v_texCoord_" + textureReader.texCoord;

  // The current EXT_mesh_features spec requires a single channel.
  var channel = textureReader.channels;
  var textureRead =
    "texture2D(" + uniformName + ", " + texCoord + ")." + channel;
  var rounded = "floor(" + textureRead + " * 255.0 + 0.5);";
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
    ["featureIds." + variableName + " = " + rounded + ";"]
  );
}

function generateImplicitFeatureIdAttribute(
  renderResources,
  frameState,
  implicitFeatureIds,
  count,
  instanceDivisor
) {
  var model = renderResources.model;
  var vertexBuffer;
  var value;
  if (defined(implicitFeatureIds.repeat)) {
    var typedArray = generateImplicitFeatureIdTypedArray(
      implicitFeatureIds,
      count
    );
    vertexBuffer = Buffer.createVertexBuffer({
      context: frameState.context,
      typedArray: typedArray,
      usage: BufferUsage.STATIC_DRAW,
    });
    vertexBuffer.vertexArrayDestroyable = false;
    model._resources.push(vertexBuffer);
  } else {
    value = implicitFeatureIds.offset;
  }

  var generatedFeatureIdAttribute = {
    index: renderResources.attributeIndex++,
    instanceDivisor: defaultValue(instanceDivisor, 0),
    value: value,
    vertexBuffer: vertexBuffer,
    normalize: false,
    componentsPerAttribute: 1,
    componentDatatype: ComponentDatatype.FLOAT,
    strideInBytes: ComponentDatatype.getSizeInBytes(ComponentDatatype.FLOAT),
    offsetInBytes: 0,
  };

  renderResources.attributes.push(generatedFeatureIdAttribute);
}

/**
 * Generates a typed array for implicit feature IDs
 * @private
 */
function generateImplicitFeatureIdTypedArray(implicitFeatureIds, count) {
  var offset = implicitFeatureIds.offset;
  var repeat = implicitFeatureIds.repeat;

  var typedArray = new Float32Array(count);
  for (var i = 0; i < count; i++) {
    typedArray[i] = offset + Math.floor(i / repeat);
  }

  return typedArray;
}

export default FeatureIdPipelineStage;
