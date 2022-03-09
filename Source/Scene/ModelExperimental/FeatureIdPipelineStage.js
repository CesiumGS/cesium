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
 * The feature ID pipeline stage is responsible for processing feature IDs
 * (both attributes and textures), updating the shader in preparation for
 * custom shaders, picking, and/or styling.
 *
 * @namespace FeatureIdPipelineStage
 * @private
 */
const FeatureIdPipelineStage = {};
FeatureIdPipelineStage.name = "FeatureIdPipelineStage"; // Helps with debugging

FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS = "FeatureIdsVS";
FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS = "FeatureIdsFS";
FeatureIdPipelineStage.STRUCT_NAME_FEATURE_IDS = "FeatureIds";
FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS =
  "initializeFeatureIdsVS";
FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS =
  "initializeFeatureIdsFS";
FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_VS =
  "initializeFeatureIdAliasesVS";
FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_FS =
  "initializeFeatureIdAliasesFS";
FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_IDS =
  "void initializeFeatureIds(out FeatureIds featureIds, ProcessedAttributes attributes)";
FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES =
  "void initializeFeatureIdAliases(inout FeatureIds featureIds)";
FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS =
  "setFeatureIdVaryings";
FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS =
  "void setFeatureIdVaryings()";

/**
 * Process a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>Adds the FeatureIds struct and corresponding initialization functions in the vertex and fragment shader</li>
 *  <li>For each feature ID attribute, the attributes were already uploaded in the geometry stage, so just update the shader code </li>
 *  <li>For each feature ID implicit range, a new attribute is created and uploaded to the GPU since gl_VertexID is not available in WebGL 1. The shader is updated with an attribute, varying, and initialization code.</li>
 *  <li>For each feature ID texture, the texture is added to the uniform map, and shader code is added to perform the texture read.</li>
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
  declareStructsAndFunctions(shaderBuilder);

  const instances = renderResources.runtimeNode.node.instances;
  if (defined(instances)) {
    processInstanceFeatureIds(renderResources, instances, frameState);
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

  // declare the initializeFeatureIdAliases() function. The details may differ
  // between vertex and fragment shader
  shaderBuilder.addFunction(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_VS,
    FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addFunction(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_FS,
    FeatureIdPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_FEATURE_ID_ALIASES,
    ShaderDestination.FRAGMENT
  );

  // declare the setFeatureIdVaryings() function in the vertex shader only
  shaderBuilder.addFunction(
    FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
    FeatureIdPipelineStage.FUNCTION_SIGNATURE_SET_FEATURE_ID_VARYINGS,
    ShaderDestination.VERTEX
  );
}

function processInstanceFeatureIds(renderResources, instances, frameState) {
  const featureIdsArray = instances.featureIds;
  const count = instances.attributes[0].count;

  for (let i = 0; i < featureIdsArray.length; i++) {
    const featureIds = featureIdsArray[i];
    const variableName = featureIds.positionalLabel;

    if (featureIds instanceof ModelComponents.FeatureIdAttribute) {
      processInstanceAttribute(renderResources, featureIds, variableName);
    } else {
      const instanceDivisor = 1;
      processImplicitRange(
        renderResources,
        featureIds,
        variableName,
        count,
        instanceDivisor,
        frameState
      );
    }

    const label = featureIds.label;
    if (defined(label)) {
      addAlias(renderResources, variableName, label, ShaderDestination.BOTH);
    }
  }
}

function processPrimitiveFeatureIds(renderResources, primitive, frameState) {
  const featureIdsArray = primitive.featureIds;
  const positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION
  );
  const count = positionAttribute.count;

  for (let i = 0; i < featureIdsArray.length; i++) {
    const featureIds = featureIdsArray[i];
    const variableName = featureIds.positionalLabel;

    let aliasDestination = ShaderDestination.BOTH;
    if (featureIds instanceof ModelComponents.FeatureIdAttribute) {
      processAttribute(renderResources, featureIds, variableName);
    } else if (featureIds instanceof ModelComponents.FeatureIdImplicitRange) {
      processImplicitRange(
        renderResources,
        featureIds,
        variableName,
        count,
        undefined,
        frameState
      );
    } else {
      processTexture(renderResources, featureIds, variableName, i, frameState);
      aliasDestination = ShaderDestination.FRAGMENT;
    }

    const label = featureIds.label;
    if (defined(label)) {
      addAlias(renderResources, variableName, label, aliasDestination);
    }
  }
}

function processInstanceAttribute(
  renderResources,
  featureIdAttribute,
  variableName
) {
  // Add a field to the FeatureIds struct.
  // Example:
  // struct FeatureIds {
  //   ...
  //   int instanceFeatureId_n;
  //   ...
  // }
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
    "int",
    variableName
  );
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
    "int",
    variableName
  );

  // Initialize the field from the corresponding attribute.
  // Example: featureIds.instanceFeatureId_n = int(czm_round(attributes.instanceFeatureId_0));
  const setIndex = featureIdAttribute.setIndex;
  const prefix = variableName.replace(/_\d+$/, "_");

  const attributeName = `a_${prefix}${setIndex}`;
  const varyingName = `v_${prefix}${setIndex}`;
  const vertexLine = `featureIds.${variableName} = int(czm_round(${attributeName}));`;
  const fragmentLine = `featureIds.${variableName} = int(czm_round(${varyingName}));`;

  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
    [vertexLine]
  );
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
    [fragmentLine]
  );

  // Instanced attributes don't normally need varyings, so add one here
  shaderBuilder.addVarying("float", varyingName);

  // The varying needs initialization in the vertex shader
  // Example:
  // v_instanceFeatureId_n = a_instanceFeatureId_n;
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
    [`${varyingName} = ${attributeName};`]
  );
}

function processAttribute(renderResources, featureIdAttribute, variableName) {
  // Add a field to the FeatureIds struct.
  // Example:
  // struct FeatureIds {
  //   ...
  //   int featureId_n;
  //   ...
  // }
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
    "int",
    variableName
  );
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
    "int",
    variableName
  );

  // Initialize the field from the corresponding attribute.
  // Example: featureIds.featureId_n = attributes.featureId_0;
  // Since this uses the ProcessedAttributes struct, the line is the same
  // for both vertex and fragment shader.
  const setIndex = featureIdAttribute.setIndex;
  const prefix = variableName.replace(/_\d+$/, "_");

  const initializationLines = [
    `featureIds.${variableName} = int(czm_round(attributes.${prefix}${setIndex}));`,
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
  instanceDivisor,
  frameState
) {
  // Generate a vertex attribute for the implicit IDs since WebGL 1 does not
  // support gl_VertexID
  generateImplicitFeatureIdAttribute(
    renderResources,
    implicitFeatureIds,
    count,
    instanceDivisor,
    frameState
  );

  // Declare the vertex attribute in the shader
  // Example: attribute float a_implicit_feature_id_n;
  const shaderBuilder = renderResources.shaderBuilder;
  const implicitAttributeName = `a_implicit_${variableName}`;
  shaderBuilder.addAttribute("float", implicitAttributeName);

  // Also declare the corresponding varyings
  // Example: varying float v_implicit_feature_id_n;
  const implicitVaryingName = `v_implicit_${variableName}`;
  shaderBuilder.addVarying("float", implicitVaryingName);

  // Add a field to the FeatureIds struct.
  // Example:
  // struct FeatureIds {
  //   ...
  //   int featureId_n;
  //   ...
  // }
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
    "int",
    variableName
  );
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
    "int",
    variableName
  );

  // The varying needs initialization in the vertex shader
  // Example:
  // v_implicit_featureId_n = a_implicit_featureId_n;
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_SET_FEATURE_ID_VARYINGS,
    [`${implicitVaryingName} = ${implicitAttributeName};`]
  );

  // Initialize the field from the generated attribute/varying.
  // Example:
  // featureIds.featureId_n = a_implicit_featureId_n; (VS)
  // featureIds.featureId_n = v_implicit_featureId_n; (FS)
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_VS,
    [`featureIds.${variableName} = int(czm_round(${implicitAttributeName}));`]
  );
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
    [`featureIds.${variableName} = int(czm_round(${implicitVaryingName}));`]
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
  const uniformName = `u_featureIdTexture_${index}`;
  const uniformMap = renderResources.uniformMap;
  const textureReader = featureIdTexture.textureReader;
  uniformMap[uniformName] = function () {
    return defaultValue(
      textureReader.texture,
      frameState.context.defaultTexture
    );
  };

  const channels = textureReader.channels;

  // Add a field to the FeatureIds struct in the fragment shader only
  // Example:
  // struct FeatureIds {
  //   ...
  //   int featureId_n;
  //   ...
  // }
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
    "int",
    variableName
  );

  // Declare the uniform in the fragment shader
  shaderBuilder.addUniform(
    "sampler2D",
    uniformName,
    ShaderDestination.FRAGMENT
  );

  // Read one or more channels from the texture
  // example: texture2D(u_featureIdTexture_0, v_texCoord_1).rg
  const texCoord = `v_texCoord_${textureReader.texCoord}`;
  const textureRead = `texture2D(${uniformName}, ${texCoord}).${channels}`;

  // Finally, assign to the struct field. Example:
  // featureIds.featureId_0 = unpacked;
  const initializationLine = `featureIds.${variableName} = czm_unpackUint(${textureRead});`;

  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_IDS_FS,
    [initializationLine]
  );
}

function addAlias(renderResources, variableName, alias, shaderDestination) {
  // Add a field to the FeatureIds struct.
  // Example:
  // struct FeatureIds {
  //   ...
  //   int alias;
  //   ...
  // }
  const shaderBuilder = renderResources.shaderBuilder;
  const updateVS = ShaderDestination.includesVertexShader(shaderDestination);
  if (updateVS) {
    shaderBuilder.addStructField(
      FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_VS,
      "int",
      alias
    );
  }
  shaderBuilder.addStructField(
    FeatureIdPipelineStage.STRUCT_ID_FEATURE_IDS_FS,
    "int",
    alias
  );

  // Initialize the field from the original variable
  // Example: featureIds.alias = featureIds.featureId_n;
  const initializationLines = [
    `featureIds.${alias} = featureIds.${variableName};`,
  ];
  if (updateVS) {
    shaderBuilder.addFunctionLines(
      FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_VS,
      initializationLines
    );
  }
  shaderBuilder.addFunctionLines(
    FeatureIdPipelineStage.FUNCTION_ID_INITIALIZE_FEATURE_ID_ALIASES_FS,
    initializationLines
  );
}

function generateImplicitFeatureIdAttribute(
  renderResources,
  implicitFeatureIds,
  count,
  instanceDivisor,
  frameState
) {
  const model = renderResources.model;
  let vertexBuffer;
  let value;
  if (defined(implicitFeatureIds.repeat)) {
    const typedArray = generateImplicitFeatureIdTypedArray(
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
    value = [implicitFeatureIds.offset];
  }

  const generatedFeatureIdAttribute = {
    index: renderResources.attributeIndex++,
    instanceDivisor: instanceDivisor,
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
  const offset = implicitFeatureIds.offset;
  const repeat = implicitFeatureIds.repeat;

  const typedArray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    typedArray[i] = offset + Math.floor(i / repeat);
  }

  return typedArray;
}

export default FeatureIdPipelineStage;
