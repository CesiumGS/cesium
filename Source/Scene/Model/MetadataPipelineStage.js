import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import MetadataStageFS from "../../Shaders/Model/MetadataStageFS.js";
import MetadataStageVS from "../../Shaders/Model/MetadataStageVS.js";
import MetadataType from "../MetadataType.js";
import ModelUtility from "./ModelUtility.js";

/**
 * The metadata pipeline stage processes metadata properties from
 * EXT_structural_metadata and inserts them into a struct in the shader.
 * This struct will be used by {@link CustomShaderPipelineStage} to allow the
 * user to access metadata using {@link CustomShader}
 *
 * @namespace MetadataPipelineStage
 *
 * @private
 */
const MetadataPipelineStage = {
  name: "MetadataPipelineStage",

  STRUCT_ID_METADATA_VS: "MetadataVS",
  STRUCT_ID_METADATA_FS: "MetadataFS",
  STRUCT_NAME_METADATA: "Metadata",

  STRUCT_ID_METADATACLASS_VS: "MetadataClassVS",
  STRUCT_ID_METADATACLASS_FS: "MetadataClassFS",
  STRUCT_NAME_METADATACLASS: "MetadataClass",

  STRUCT_ID_METADATASTATISTICS_VS: "MetadataStatisticsVS",
  STRUCT_ID_METADATASTATISTICS_FS: "MetadataStatisticsFS",
  STRUCT_NAME_METADATASTATISTICS: "MetadataStatistics",

  FUNCTION_ID_INITIALIZE_METADATA_VS: "initializeMetadataVS",
  FUNCTION_ID_INITIALIZE_METADATA_FS: "initializeMetadataFS",
  FUNCTION_SIGNATURE_INITIALIZE_METADATA:
    "void initializeMetadata(out Metadata metadata, out MetadataClass metadataClass, out MetadataStatistics metadataStatistics, ProcessedAttributes attributes)",
  FUNCTION_ID_SET_METADATA_VARYINGS: "setMetadataVaryings",
  FUNCTION_SIGNATURE_SET_METADATA_VARYINGS: "void setMetadataVaryings()",

  // Metadata class and statistics fields:
  // - some must be renamed to avoid reserved words
  // - some always have float/vec values, even for integer/ivec property types
  METADATACLASS_FIELDS: [
    { specName: "noData", shaderName: "noData" },
    { specName: "default", shaderName: "defaultValue" },
    { specName: "min", shaderName: "minValue" },
    { specName: "max", shaderName: "maxValue" },
  ],
  METADATASTATISTICS_FIELDS: [
    { specName: "min", shaderName: "minValue" },
    { specName: "max", shaderName: "maxValue" },
    { specName: "mean", shaderName: "mean", type: "float" },
    { specName: "median", shaderName: "median" },
    {
      specName: "standardDeviation",
      shaderName: "standardDeviation",
      type: "float",
    },
    { specName: "variance", shaderName: "variance", type: "float" },
    { specName: "sum", shaderName: "sum" },
    // { specName: "occurrences", shaderName: "occurrences" }, // Handled in getEnumAssignments
  ],
};

/**
 * Process a primitive. This modifies the following parts of the render
 * resources:
 * <ul>
 *   <li>Adds a Metadata struct to the shader</li>
 *   <li>If the primitive has structural metadata, properties are added to the Metadata struct</li>
 *   <li>dynamic functions are added to the shader to initialize the metadata properties</li>
 *   <li>Adds uniforms for property textures to the uniform map as needed</li>
 *   <li>Adds uniforms for offset/scale to the uniform map as needed</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 * @param {FrameState} frameState The frame state
 * @private
 */
MetadataPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const { shaderBuilder, model } = renderResources;
  const { structuralMetadata = {}, content } = model;
  const statistics = content?.tileset?.metadataExtension?.statistics;

  const propertyAttributesInfo = getPropertyAttributesInfo(
    structuralMetadata.propertyAttributes,
    primitive,
    statistics
  );
  const propertyTexturesInfo = getPropertyTexturesInfo(
    structuralMetadata.propertyTextures,
    statistics
  );

  // Declare <type>MetadataClass and <type>MetadataStatistics structs as needed
  const allPropertyInfos = propertyAttributesInfo.concat(propertyTexturesInfo);
  declareMetadataTypeStructs(shaderBuilder, allPropertyInfos);

  // Always declare the Metadata, MetadataClass, and MetadataStatistics structs
  // and the initializeMetadata() function, even if not used
  declareStructsAndFunctions(shaderBuilder);
  shaderBuilder.addVertexLines([MetadataStageVS]);
  shaderBuilder.addFragmentLines([MetadataStageFS]);

  for (let i = 0; i < propertyAttributesInfo.length; i++) {
    const info = propertyAttributesInfo[i];
    processPropertyAttributeProperty(renderResources, info);
  }
  for (let i = 0; i < propertyTexturesInfo.length; i++) {
    const info = propertyTexturesInfo[i];
    processPropertyTextureProperty(renderResources, info);
  }
};

/**
 * Declare <type>MetadataClass structs in the shader
 * @param {ShaderBuilder} shaderBuilder The shader builder for the primitive
 * @param {Set<String>} metadataTypes The types of metadata used in the shaders
 * @param {Object} statistics Statistics about the metadata.
 * @private
 */
function declareMetadataTypeStructs(shaderBuilder, propertyInfos) {
  const classTypes = new Set();
  const statisticsTypes = new Set();
  const enumLengths = new Set();

  for (let i = 0; i < propertyInfos.length; i++) {
    const { type, enumType, glslType, propertyStatistics } = propertyInfos[i];
    classTypes.add(glslType);
    if (!defined(propertyStatistics)) {
      continue;
    }
    if (type === MetadataType.ENUM) {
      enumLengths.add(enumType.values.length);
    } else {
      statisticsTypes.add(glslType);
    }
  }

  const classFields = MetadataPipelineStage.METADATACLASS_FIELDS;
  for (const metadataType of classTypes) {
    const classStructName = `${metadataType}MetadataClass`;
    declareTypeStruct(classStructName, metadataType, classFields);
  }

  const statisticsFields = MetadataPipelineStage.METADATASTATISTICS_FIELDS;
  for (const metadataType of statisticsTypes) {
    const statisticsStructName = `${metadataType}MetadataStatistics`;
    declareTypeStruct(statisticsStructName, metadataType, statisticsFields);
  }

  for (const length of enumLengths) {
    if (length < 1) {
      continue;
    }
    const structName = `enum${length}MetadataStatistics`;
    shaderBuilder.addStruct(structName, structName, ShaderDestination.BOTH);

    const shaderType = "int";
    const shaderName = `occurrences[${length}]`;
    shaderBuilder.addStructField(structName, shaderType, shaderName);
  }

  function declareTypeStruct(structName, type, fields) {
    shaderBuilder.addStruct(structName, structName, ShaderDestination.BOTH);

    for (let i = 0; i < fields.length; i++) {
      const { shaderName } = fields[i];
      const shaderType =
        fields[i].type === "float" ? convertToFloatComponents(type) : type;
      shaderBuilder.addStructField(structName, shaderType, shaderName);
    }
  }
}

function convertToFloatComponents(type) {
  const conversions = {
    int: "float",
    ivec2: "vec2",
    ivec3: "vec3",
    ivec4: "vec4",
  };
  const converted = conversions[type];
  return defined(converted) ? converted : type;
}

function declareStructsAndFunctions(shaderBuilder) {
  // Declare the Metadata struct.
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATA_VS,
    MetadataPipelineStage.STRUCT_NAME_METADATA,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    MetadataPipelineStage.STRUCT_NAME_METADATA,
    ShaderDestination.FRAGMENT
  );

  // Declare the MetadataClass struct
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_VS,
    MetadataPipelineStage.STRUCT_NAME_METADATACLASS,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_FS,
    MetadataPipelineStage.STRUCT_NAME_METADATACLASS,
    ShaderDestination.FRAGMENT
  );

  // Declare the MetadataStatistics struct
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATASTATISTICS_VS,
    MetadataPipelineStage.STRUCT_NAME_METADATASTATISTICS,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATASTATISTICS_FS,
    MetadataPipelineStage.STRUCT_NAME_METADATASTATISTICS,
    ShaderDestination.FRAGMENT
  );

  // declare the initializeMetadata() function. The details may differ
  // between vertex and fragment shader
  shaderBuilder.addFunction(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
    ShaderDestination.VERTEX
  );
  shaderBuilder.addFunction(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
    ShaderDestination.FRAGMENT
  );

  // declare the setMetadataVaryings() function in the vertex shader only.
  shaderBuilder.addFunction(
    MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
    MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
    ShaderDestination.VERTEX
  );
}

/**
 * Collect info about all properties of all propertyAttributes, and
 * return as a flattened Array
 * @param {PropertyAttribute[]} propertyAttributes
 * @param {ModelComponents.Primitive} primitive
 * @param {Object} statistics
 * @returns {Array<{Object}>}
 * @private
 */
function getPropertyAttributesInfo(propertyAttributes, primitive, statistics) {
  if (!defined(propertyAttributes)) {
    return [];
  }
  return propertyAttributes.flatMap((propertyAttribute) =>
    getPropertyAttributeInfo(propertyAttribute, primitive, statistics)
  );
}

/**
 * Collect info about the properties of a PropertyAttribute
 * @param {PropertyAttribute} propertyAttribute
 * @param {ModelComponents.Primitive} primitive
 * @param {Object} statistics
 * @returns {Array<{Object}>}
 * @private
 */
function getPropertyAttributeInfo(propertyAttribute, primitive, statistics) {
  const {
    getAttributeByName,
    getAttributeInfo,
    sanitizeGlslIdentifier,
  } = ModelUtility;

  const classId = propertyAttribute.class.id;
  const classStatistics = statistics?.classes[classId];

  return Object.entries(propertyAttribute.properties).map(
    getPropertyAttributePropertyInfo
  );

  function getPropertyAttributePropertyInfo([propertyId, property]) {
    // Get information about the attribute the same way as the
    // GeometryPipelineStage to ensure we have the correct GLSL type
    const modelAttribute = getAttributeByName(primitive, property.attribute);
    const { glslType, variableName } = getAttributeInfo(modelAttribute);

    return {
      metadataVariable: sanitizeGlslIdentifier(propertyId),
      property,
      type: property.classProperty.type,
      enumType: property.classProperty.enumType,
      glslType,
      variableName,
      propertyStatistics: classStatistics?.properties[propertyId],
      shaderDestination: ShaderDestination.BOTH,
    };
  }
}

/**
 * Update the shader for a single PropertyAttributeProperty
 * @param {PrimitiveRenderResources} renderResources
 * @param {Object} propertyInfo
 * @private
 */
function processPropertyAttributeProperty(renderResources, propertyInfo) {
  addPropertyAttributePropertyMetadata(renderResources, propertyInfo);
  addPropertyMetadataClass(renderResources.shaderBuilder, propertyInfo);
  addPropertyMetadataStatistics(renderResources.shaderBuilder, propertyInfo);
}

/**
 * Add fields to the Metadata struct, and metadata value assignments to the
 * initializeMetadata function, for a PropertyAttributeProperty
 * @param {PrimitiveRenderResources} renderResources
 * @param {Object} propertyInfo
 * @private
 */
function addPropertyAttributePropertyMetadata(renderResources, propertyInfo) {
  const { shaderBuilder } = renderResources;
  const { metadataVariable, property, glslType } = propertyInfo;

  const valueExpression = addValueTransformUniforms({
    valueExpression: `attributes.${propertyInfo.variableName}`,
    renderResources: renderResources,
    glslType: glslType,
    metadataVariable: metadataVariable,
    shaderDestination: ShaderDestination.BOTH,
    property: property,
  });

  // declare the struct field
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_VS,
    glslType,
    metadataVariable
  );
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    glslType,
    metadataVariable
  );

  // assign the result to the metadata struct property.
  const initializationLine = `metadata.${metadataVariable} = ${valueExpression};`;
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    [initializationLine]
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    [initializationLine]
  );
}

/**
 * Add fields to the MetadataClass struct, and metadataClass value expressions
 * to the initializeMetadata function, for a PropertyAttributeProperty or
 * PropertyTextureProperty
 * @param {ShaderBuilder} shaderBuilder
 * @param {Object} propertyInfo
 * @private
 */
function addPropertyMetadataClass(shaderBuilder, propertyInfo) {
  const { classProperty } = propertyInfo.property;
  const { metadataVariable, glslType, shaderDestination } = propertyInfo;

  // Construct assignment statements to set values in the metadataClass struct
  const assignments = getStructAssignments(
    MetadataPipelineStage.METADATACLASS_FIELDS,
    classProperty,
    `metadataClass.${metadataVariable}`,
    glslType
  );

  // Struct field: Prefix to get the appropriate <type>MetadataClass struct
  const metadataType = `${glslType}MetadataClass`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_FS,
    metadataType,
    metadataVariable
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    assignments
  );
  if (!ShaderDestination.includesVertexShader(shaderDestination)) {
    return;
  }
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_VS,
    metadataType,
    metadataVariable
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    assignments
  );
}

/**
 * Add fields to the MetadataStatistics struct, and metadataStatistics value
 * expressions to the initializeMetadata function, for a
 * PropertyAttributeProperty or PropertyTextureProperty
 * @param {ShaderBuilder} shaderBuilder
 * @param {Object} propertyInfo
 * @private
 */
function addPropertyMetadataStatistics(shaderBuilder, propertyInfo) {
  const { propertyStatistics } = propertyInfo;
  if (!defined(propertyStatistics)) {
    return;
  }
  const { metadataVariable, type, enumType, glslType } = propertyInfo;
  const isEnum = type === MetadataType.ENUM;

  // Construct assignment statements to set values in the metadataStatistics struct
  const fields = MetadataPipelineStage.METADATASTATISTICS_FIELDS;
  const struct = `metadataStatistics.${metadataVariable}`;
  const assignments = isEnum
    ? getEnumAssignments(propertyStatistics, struct, enumType)
    : getStructAssignments(fields, propertyStatistics, struct, glslType);

  // Struct field: Prefix to get the appropriate <type>MetadataStatistics struct
  const prefix = isEnum ? `enum${enumType.values.length}` : glslType;
  const statisticsType = `${prefix}MetadataStatistics`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATASTATISTICS_FS,
    statisticsType,
    metadataVariable
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    assignments
  );
  if (!ShaderDestination.includesVertexShader(propertyInfo.shaderDestination)) {
    return;
  }
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATASTATISTICS_VS,
    statisticsType,
    metadataVariable
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    assignments
  );
}

/**
 * Collect info about all properties of all propertyTextures, and
 * return as a flattened Array
 * @param {PropertyTexture[]} propertyTextures
 * @param {Object} statistics
 * @returns {Array<{Object}>}
 * @private
 */
function getPropertyTexturesInfo(propertyTextures, statistics) {
  if (!defined(propertyTextures)) {
    return [];
  }
  return propertyTextures.flatMap((propertyTexture) =>
    getPropertyTextureInfo(propertyTexture, statistics)
  );
}

/**
 * Collect info about the properties of a PropertyTexture
 * @param {PropertyTexture} propertyTexture
 * @param {Object} statistics
 * @returns {Array<{Object}>}
 * @private
 */
function getPropertyTextureInfo(propertyTexture, statistics) {
  const { sanitizeGlslIdentifier } = ModelUtility;

  const classId = propertyTexture.class.id;
  const classStatistics = statistics?.classes[classId];

  return Object.entries(propertyTexture.properties)
    .map(getPropertyTexturePropertyInfo)
    .filter(defined);

  function getPropertyTexturePropertyInfo([propertyId, property]) {
    if (!property.isGpuCompatible()) {
      return;
    }

    return {
      metadataVariable: sanitizeGlslIdentifier(propertyId),
      property,
      type: property.classProperty.type,
      enumType: property.classProperty.enumType,
      glslType: property.getGlslType(),
      propertyStatistics: classStatistics?.properties[propertyId],
      shaderDestination: ShaderDestination.FRAGMENT,
    };
  }
}

/**
 * Update the shader for a single PropertyTextureProperty
 * @param {PrimitiveRenderResources} renderResources
 * @param {Array<Object>} propertyInfo
 * @private
 */
function processPropertyTextureProperty(renderResources, propertyInfo) {
  addPropertyTexturePropertyMetadata(renderResources, propertyInfo);
  addPropertyMetadataClass(renderResources.shaderBuilder, propertyInfo);
  addPropertyMetadataStatistics(renderResources.shaderBuilder, propertyInfo);
}

/**
 * Add fields to the Metadata struct, and metadata value expressions to the
 * initializeMetadata function, for a PropertyTextureProperty
 * @param {PrimitiveRenderResources} renderResources
 * @param {Object} propertyInfo
 * @private
 */
function addPropertyTexturePropertyMetadata(renderResources, propertyInfo) {
  const { shaderBuilder, uniformMap } = renderResources;
  const { metadataVariable, glslType, property } = propertyInfo;

  const { texCoord, channels, index, texture } = property.textureReader;
  const textureUniformName = `u_propertyTexture_${index}`;

  // Property texture properties may share the same physical texture, so only
  // add the texture uniform the first time we encounter it.
  if (!uniformMap.hasOwnProperty(textureUniformName)) {
    shaderBuilder.addUniform(
      "sampler2D",
      textureUniformName,
      ShaderDestination.FRAGMENT
    );
    uniformMap[textureUniformName] = () => texture;
  }

  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    glslType,
    metadataVariable
  );

  // Get a GLSL expression for the value of the property
  const texCoordVariable = `attributes.texCoord_${texCoord}`;
  const valueExpression = `texture2D(${textureUniformName}, ${texCoordVariable}).${channels}`;

  // Some types need an unpacking step or two. For example, since texture reads
  // are always normalized, UINT8 (not normalized) properties need to be
  // un-normalized in the shader.
  const unpackedValue = property.unpackInShader(valueExpression);

  const transformedValue = addValueTransformUniforms({
    valueExpression: unpackedValue,
    renderResources: renderResources,
    glslType: glslType,
    metadataVariable: metadataVariable,
    shaderDestination: ShaderDestination.FRAGMENT,
    property: property,
  });

  const initializationLine = `metadata.${metadataVariable} = ${transformedValue};`;
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    [initializationLine]
  );
}

/**
 * Construct GLSL assignment statements to set metadata spec values in a struct
 * @param {Object[]} fieldNames
 * @param {String} fieldNames[].specName The name of the property in the spec
 * @param {String} fieldNames[].shaderName The name of the property in the shader
 * @param {Object} values A source of property values, keyed on fieldNames[].specName
 * @param {String} struct The name of the struct to which values will be assigned
 * @param {String} type The type of the values to be assigned
 * @returns {Array<{name: String, value}>}
 * @private
 */
function getStructAssignments(fieldNames, values, struct, type) {
  return defined(values)
    ? fieldNames.map(constructAssignment).filter(defined)
    : [];

  function constructAssignment(field) {
    const value = values[field.specName];
    if (defined(value)) {
      return `${struct}.${field.shaderName} = ${type}(${value});`;
    }
  }
}

/**
 * Construct GLSL assignment statements to set occurrence values in a
 * MetadataStatistics struct for an ENUM property
 * @param {Object} propertyStatistics
 * @param {String} struct
 * @param {MetadataEnum} enumType
 * @returns
 */
function getEnumAssignments(propertyStatistics, struct, enumType) {
  const { occurrences } = propertyStatistics;

  return defined(occurrences)
    ? enumType.values.map(constructAssignment).filter(defined)
    : [];

  function constructAssignment(enumValue) {
    const occurrence = occurrences[enumValue.name];
    if (defined(occurrence)) {
      return `${struct}.occurrences[${enumValue.value}] = int(${occurrence});`;
    }
  }
}

/**
 * Handle offset/scale transform for a property value
 * This wraps the GLSL value expression with a czm_valueTransform() call
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.valueExpression The GLSL value expression without the transform
 * @param {String} options.metadataVariable The name of the GLSL variable that will contain the property value
 * @param {String} options.glslType The GLSL type of the variable
 * @param {ShaderDestination} options.shaderDestination Which shader(s) use this variable
 * @param {PrimitiveRenderResources} options.renderResources The render resources for this primitive
 * @param {(PropertyAttributeProperty|PropertyTextureProperty)} options.property The property from which the value is derived
 * @returns {String}
 * @private
 */
function addValueTransformUniforms(options) {
  const { valueExpression, property } = options;

  if (!property.hasValueTransform) {
    return valueExpression;
  }

  const metadataVariable = options.metadataVariable;
  const offsetUniformName = `u_${metadataVariable}_offset`;
  const scaleUniformName = `u_${metadataVariable}_scale`;

  const { shaderBuilder, uniformMap } = options.renderResources;
  const { glslType, shaderDestination } = options;
  shaderBuilder.addUniform(glslType, offsetUniformName, shaderDestination);
  shaderBuilder.addUniform(glslType, scaleUniformName, shaderDestination);

  const { offset, scale } = property;
  uniformMap[offsetUniformName] = () => offset;
  uniformMap[scaleUniformName] = () => scale;

  return `czm_valueTransform(${offsetUniformName}, ${scaleUniformName}, ${valueExpression})`;
}

export default MetadataPipelineStage;
