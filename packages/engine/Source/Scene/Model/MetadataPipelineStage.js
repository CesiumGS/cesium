import Matrix3 from "../../Core/Matrix3.js";
import defined from "../../Core/defined.js";
import oneTimeWarning from "../../Core/oneTimeWarning.js";
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

  STRUCT_ID_METADATA_CLASS_VS: "MetadataClassVS",
  STRUCT_ID_METADATA_CLASS_FS: "MetadataClassFS",
  STRUCT_NAME_METADATA_CLASS: "MetadataClass",

  STRUCT_ID_METADATA_STATISTICS_VS: "MetadataStatisticsVS",
  STRUCT_ID_METADATA_STATISTICS_FS: "MetadataStatisticsFS",
  STRUCT_NAME_METADATA_STATISTICS: "MetadataStatistics",

  FUNCTION_ID_INITIALIZE_METADATA_VS: "initializeMetadataVS",
  FUNCTION_ID_INITIALIZE_METADATA_FS: "initializeMetadataFS",
  FUNCTION_SIGNATURE_INITIALIZE_METADATA:
    "void initializeMetadata(FeatureIds featureIds, out Metadata metadata, out MetadataClass metadataClass, out MetadataStatistics metadataStatistics, ProcessedAttributes attributes)",
  FUNCTION_ID_SET_METADATA_VARYINGS: "setMetadataVaryings",
  FUNCTION_SIGNATURE_SET_METADATA_VARYINGS: "void setMetadataVaryings()",

  // Metadata class and statistics fields:
  // - some must be renamed to avoid reserved words
  // - some always have float/vec values, even for integer/ivec property types
  METADATA_CLASS_FIELDS: [
    { specName: "noData", shaderName: "noData" },
    { specName: "default", shaderName: "defaultValue" },
    { specName: "min", shaderName: "minValue" },
    { specName: "max", shaderName: "maxValue" },
  ],
  METADATA_STATISTICS_FIELDS: [
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
  frameState,
) {
  const { shaderBuilder, model } = renderResources;
  const { structuralMetadata = {}, content } = model;
  const statistics = content?.tileset.metadataExtension?.statistics;
  const webgl2 = frameState.context.webgl2;

  const propertyAttributesInfo = getPropertyAttributesInfo(
    structuralMetadata.propertyAttributes,
    primitive,
    statistics,
  );
  const propertyTexturesInfo = getPropertyTexturesInfo(
    structuralMetadata.propertyTextures,
    statistics,
  );
  const propertyTablesInfo = getPropertyTablesInfo(
    structuralMetadata.propertyTables,
    primitive,
    renderResources,
    statistics,
  );

  // Declare <type>MetadataClass and <type>MetadataStatistics structs as needed
  const allPropertyInfos = propertyAttributesInfo
    .concat(propertyTexturesInfo)
    .concat(propertyTablesInfo);
  declareMetadataTypeStructs(shaderBuilder, allPropertyInfos);

  // Always declare the Metadata, MetadataClass, and MetadataStatistics structs
  // and the initializeMetadata() function, even if not used
  declareStructsAndFunctions(shaderBuilder);
  shaderBuilder.addVertexLines(MetadataStageVS);
  shaderBuilder.addFragmentLines(MetadataStageFS);

  for (let i = 0; i < propertyAttributesInfo.length; i++) {
    const info = propertyAttributesInfo[i];
    processPropertyAttributeProperty(renderResources, info);
  }
  for (let i = 0; i < propertyTexturesInfo.length; i++) {
    const info = propertyTexturesInfo[i];
    processPropertyTextureProperty(renderResources, info, webgl2);
  }
  for (let i = 0; i < propertyTablesInfo.length; i++) {
    const info = propertyTablesInfo[i];
    processPropertyTableProperty(renderResources, info, webgl2, i);
  }
};

/**
 * Collect info about all properties of all propertyAttributes, and
 * return as a flattened Array
 * @param {PropertyAttribute[]} propertyAttributes The PropertyAttributes with properties to be described
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 * @param {object} [statistics] Statistics about the properties (if the model is from a 3DTiles tileset)
 * @returns {object[]} An array of objects containing information about each PropertyAttributeProperty
 * @private
 */
function getPropertyAttributesInfo(propertyAttributes, primitive, statistics) {
  if (!defined(propertyAttributes)) {
    return [];
  }
  return propertyAttributes.flatMap((propertyAttribute) =>
    getPropertyAttributeInfo(propertyAttribute, primitive, statistics),
  );
}

/**
 * Collect info about the properties of a single PropertyAttribute
 * @param {PropertyAttribute} propertyAttribute The PropertyAttribute with properties to be described
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 * @param {object} [statistics] Statistics about the properties (if the model is from a 3DTiles tileset)
 * @returns {object[]} An array of objects containing information about each PropertyAttributeProperty
 * @private
 */
function getPropertyAttributeInfo(propertyAttribute, primitive, statistics) {
  const { getAttributeByName, getAttributeInfo, sanitizeGlslIdentifier } =
    ModelUtility;

  const classId = propertyAttribute.class.id;
  const classStatistics = statistics?.classes[classId];

  const propertiesArray = Object.entries(propertyAttribute.properties);
  const infoArray = new Array(propertiesArray.length);

  for (let i = 0; i < propertiesArray.length; i++) {
    const [propertyId, property] = propertiesArray[i];
    const modelAttribute = getAttributeByName(primitive, property.attribute);
    const { glslType, variableName } = getAttributeInfo(modelAttribute);

    infoArray[i] = {
      metadataVariable: sanitizeGlslIdentifier(propertyId),
      property,
      type: property.classProperty.type,
      glslType,
      variableName,
      propertyStatistics: classStatistics?.properties[propertyId],
      shaderDestination: ShaderDestination.BOTH,
    };
  }

  return infoArray;
}

/**
 * Collect info about all properties of all propertyTextures, and
 * return as a flattened Array
 * @param {PropertyTexture[]} propertyTextures The PropertyTextures with properties to be described
 * @param {object} [statistics] Statistics about the properties (if the model is from a 3DTiles tileset)
 * @returns {object[]} An array of objects containing information about each PropertyTextureProperty
 * @private
 */
function getPropertyTexturesInfo(propertyTextures, statistics) {
  if (!defined(propertyTextures)) {
    return [];
  }
  return propertyTextures.flatMap((propertyTexture) =>
    getPropertyTextureInfo(propertyTexture, statistics),
  );
}

/**
 * Collect info about the properties of a single PropertyTexture
 * @param {PropertyTexture} propertyTexture The PropertyTexture with properties to be described
 * @param {object} [statistics] Statistics about the properties (if the model is from a 3DTiles tileset)
 * @returns {object[]} An array of objects containing information about each PropertyTextureProperty
 * @private
 */
function getPropertyTextureInfo(propertyTexture, statistics) {
  const { sanitizeGlslIdentifier } = ModelUtility;

  const classId = propertyTexture.class.id;
  const classStatistics = statistics?.classes[classId];

  const propertiesArray = Object.entries(propertyTexture.properties).filter(
    ([id, property]) => {
      const numChannels = property.textureReader.channels.length;
      return property.classProperty.isGpuCompatible(numChannels);
    },
  );
  const infoArray = new Array(propertiesArray.length);

  for (let i = 0; i < propertiesArray.length; i++) {
    const [propertyId, property] = propertiesArray[i];

    infoArray[i] = {
      metadataVariable: sanitizeGlslIdentifier(propertyId),
      property,
      type: property.classProperty.type,
      glslType: property.classProperty.getGlslType(),
      propertyStatistics: classStatistics?.properties[propertyId],
      shaderDestination: ShaderDestination.FRAGMENT,
    };
  }

  return infoArray;
}

const NUM_CHANNELS = 4; // use all channels for property table textures

function getPropertyTablesInfo(
  propertyTables,
  primitive,
  renderResources,
  statistics,
) {
  if (!defined(propertyTables)) {
    return [];
  }

  // Each feature ID set can reference a property table.
  // For a given primitive, as we have here, the mapping is 1:1.
  // (This isn't strictly enforced in the EXT_mesh_features schema, but would be considered ill-formed and ambiguous.)
  const tableToFeatureSetInfo = mapPropertyTablesToFeatureIdSets(
    renderResources,
    primitive,
  );

  return propertyTables.flatMap((propertyTable) => {
    return getPropertyTableInfo(
      propertyTable,
      tableToFeatureSetInfo,
      statistics,
    );
  });
}

function getPropertyTableInfo(
  propertyTable,
  tableToFeatureSetInfo,
  statistics,
) {
  const { sanitizeGlslIdentifier } = ModelUtility;

  const classId = propertyTable.class.id;
  const classStatistics = statistics?.classes[classId];
  const featureSetInfo =
    tableToFeatureSetInfo.get(String(propertyTable.id)) ?? {};

  const propertiesArray = Object.entries(propertyTable.properties).filter(
    ([id, property]) => property.isGpuCompatible(NUM_CHANNELS),
  );
  const infoArray = new Array(propertiesArray.length);

  const shaderDestination =
    featureSetInfo.shaderDestination ?? ShaderDestination.BOTH;

  for (let i = 0; i < propertiesArray.length; i++) {
    const [propertyId, property] = propertiesArray[i];

    infoArray[i] = {
      metadataVariable: sanitizeGlslIdentifier(propertyId),
      property,
      type: property.type,
      glslType: property.getGlslType(),
      propertyStatistics: classStatistics?.properties[propertyId],
      shaderDestination: shaderDestination,
      propertyTable: propertyTable,
      featureIdVariableName: featureSetInfo.variableName,
    };
  }

  return infoArray;
}

/**
 * Map property tables to feature ID sets for a given primitive. In general, the mapping is not 1:1, but
 * within a given primitive it is safe to treat it as such.
 *
 * @param {PrimitiveRenderResources} renderResources
 * @param {ModelComponents.Primitive} primitive
 * @returns A map from property table ID to an object with the corresponding feature ID set information
 * for the given primitive. (Contains the shader variable name and shader destination.)
 *
 * @private
 */
function mapPropertyTablesToFeatureIdSets(renderResources, primitive) {
  const propertyTableToFeatureSet = new Map();

  function addMapEntry(featureIds, shaderDestination) {
    const propertyTableId = featureIds?.propertyTableId;
    if (!defined(propertyTableId)) {
      return;
    }

    const key = String(propertyTableId);
    const entry = {
      // This is consistent with the variable name given in the feature ID pipeline stage.
      // Aliases can also be used, but this will always be valid.
      variableName: featureIds.positionalLabel,
      shaderDestination: shaderDestination,
    };

    const existingEntry = propertyTableToFeatureSet.get(key);
    if (defined(existingEntry)) {
      console.warn(
        `Multiple feature ID sets reference the same property table ${propertyTableId} in primitive. Only one will be used.`,
      );
    }
    propertyTableToFeatureSet.set(key, entry);
  }

  // Collect feature IDs from two sources: the primitive, and instances
  const primitiveFeatureIds = primitive?.featureIds ?? [];
  for (let i = 0; i < primitiveFeatureIds.length; i++) {
    const featureIds = primitiveFeatureIds[i];
    // Textures feature sets are fragment-only
    const isTexture = defined(featureIds?.textureReader);
    addMapEntry(
      featureIds,
      isTexture ? ShaderDestination.FRAGMENT : ShaderDestination.BOTH,
    );
  }

  // Instance feature IDs (if present)
  const instances = renderResources.runtimeNode?.node?.instances;
  const instanceFeatureIds = instances?.featureIds ?? [];
  for (let i = 0; i < instanceFeatureIds.length; i++) {
    const featureIds = instanceFeatureIds[i];
    addMapEntry(featureIds, ShaderDestination.BOTH);
  }

  return propertyTableToFeatureSet;
}

/**
 * Declare <type>MetadataClass structs in the shader for each PropertyAttributeProperty, PropertyTextureProperty, and PropertyTableProperty
 * @param {ShaderBuilder} shaderBuilder The shader builder for the primitive
 * @param {object[]} propertyInfos Information about the PropertyAttributeProperties, PropertyTextureProperties, and PropertyTableProperties
 * @private
 */
function declareMetadataTypeStructs(shaderBuilder, propertyInfos) {
  const classTypes = new Set();
  const statisticsTypes = new Set();

  for (let i = 0; i < propertyInfos.length; i++) {
    const { type, glslType, propertyStatistics } = propertyInfos[i];
    classTypes.add(glslType);
    if (!defined(propertyStatistics)) {
      continue;
    }
    if (type !== MetadataType.ENUM) {
      statisticsTypes.add(glslType);
    }
  }

  const classFields = MetadataPipelineStage.METADATA_CLASS_FIELDS;
  for (const metadataType of classTypes) {
    const classStructName = `${metadataType}MetadataClass`;
    declareTypeStruct(classStructName, metadataType, classFields);
  }

  const statisticsFields = MetadataPipelineStage.METADATA_STATISTICS_FIELDS;
  for (const metadataType of statisticsTypes) {
    const statisticsStructName = `${metadataType}MetadataStatistics`;
    declareTypeStruct(statisticsStructName, metadataType, statisticsFields);
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

const floatConversions = {
  int: "float",
  ivec2: "vec2",
  ivec3: "vec3",
  ivec4: "vec4",
};

/**
 * For a type with integer components, find a corresponding float-component type
 * @param {string} type The name of a GLSL type with integer components
 * @returns {string} The name of a GLSL type of the same dimension with float components, if available; otherwise the input type
 * @private
 */
function convertToFloatComponents(type) {
  const converted = floatConversions[type];
  return defined(converted) ? converted : type;
}

/**
 * Declare the main Metadata, MetadataClass, and MetadataStatistics structs
 * and the initializeMetadata() function.
 * @param {ShaderBuilder} shaderBuilder The shader builder for the primitive
 * @private
 */
function declareStructsAndFunctions(shaderBuilder) {
  // Declare the Metadata struct.
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATA_VS,
    MetadataPipelineStage.STRUCT_NAME_METADATA,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    MetadataPipelineStage.STRUCT_NAME_METADATA,
    ShaderDestination.FRAGMENT,
  );

  // Declare the MetadataClass struct
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATA_CLASS_VS,
    MetadataPipelineStage.STRUCT_NAME_METADATA_CLASS,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATA_CLASS_FS,
    MetadataPipelineStage.STRUCT_NAME_METADATA_CLASS,
    ShaderDestination.FRAGMENT,
  );

  // Declare the MetadataStatistics struct
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATA_STATISTICS_VS,
    MetadataPipelineStage.STRUCT_NAME_METADATA_STATISTICS,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATA_STATISTICS_FS,
    MetadataPipelineStage.STRUCT_NAME_METADATA_STATISTICS,
    ShaderDestination.FRAGMENT,
  );

  // declare the initializeMetadata() function. The details may differ
  // between vertex and fragment shader
  shaderBuilder.addFunction(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addFunction(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
    ShaderDestination.FRAGMENT,
  );

  // declare the setMetadataVaryings() function in the vertex shader only.
  shaderBuilder.addFunction(
    MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
    MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
    ShaderDestination.VERTEX,
  );
}

/**
 * Update the shader for a single PropertyAttributeProperty
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {object} propertyInfo Info about the PropertyAttributeProperty
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
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {object} propertyInfo Info about the PropertyAttributeProperty
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
    property: property.classProperty,
  });

  // declare the struct field
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_VS,
    glslType,
    metadataVariable,
  );
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    glslType,
    metadataVariable,
  );

  // assign the result to the metadata struct property.
  const initializationLine = `metadata.${metadataVariable} = ${valueExpression};`;
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    [initializationLine],
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    [initializationLine],
  );
}

/**
 * Update the shader for a single PropertyTextureProperty
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {object[]} propertyInfo Info about the PropertyTextureProperty
 * @param {boolean} webgl2 True if the context is WebGL2
 * @private
 */
function processPropertyTextureProperty(renderResources, propertyInfo, webgl2) {
  addPropertyTexturePropertyMetadata(renderResources, propertyInfo, webgl2);
  addPropertyMetadataClass(renderResources.shaderBuilder, propertyInfo);
  addPropertyMetadataStatistics(renderResources.shaderBuilder, propertyInfo);
}

/**
 * Add fields to the Metadata struct, and metadata value expressions to the
 * initializeMetadata function, for a PropertyTextureProperty
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {object} propertyInfo Info about the PropertyTextureProperty
 * @param {boolean} webgl2 True if the context is WebGL2
 * @private
 */
function addPropertyTexturePropertyMetadata(
  renderResources,
  propertyInfo,
  webgl2,
) {
  const { shaderBuilder, uniformMap } = renderResources;
  const { metadataVariable, glslType, property } = propertyInfo;

  const { texCoord, channels, index, texture, transform } =
    property.textureReader;
  const textureUniformName = `u_propertyTexture_${index}`;
  const initializationLines = [];

  // Property texture properties may share the same physical texture, so only
  // add the texture uniform the first time we encounter it.
  if (!uniformMap.hasOwnProperty(textureUniformName)) {
    shaderBuilder.addUniform(
      "sampler2D",
      textureUniformName,
      ShaderDestination.FRAGMENT,
    );
    uniformMap[textureUniformName] = () => texture;
  }

  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    glslType,
    metadataVariable,
  );

  // Get a GLSL expression for the texture coordinates of the property.
  // By default, this will be taken directly from the attributes.
  const texCoordVariable = `attributes.texCoord_${texCoord}`;
  let texCoordVariableExpression = texCoordVariable;

  // Check if the texture defines a `transform` from a `KHR_texture_transform`
  if (defined(transform) && !Matrix3.equals(transform, Matrix3.IDENTITY)) {
    // Add a uniform for the transformation matrix
    const transformUniformName = `${textureUniformName}Transform`;
    shaderBuilder.addUniform(
      "mat3",
      transformUniformName,
      ShaderDestination.FRAGMENT,
    );
    uniformMap[transformUniformName] = function () {
      return transform;
    };

    // Update the expression for the texture coordinates
    // with one that transforms the texture coordinates
    // with the transform matrix first
    texCoordVariableExpression = `vec2(${transformUniformName} * vec3(${texCoordVariable}, 1.0))`;
  }
  const valueExpression = `texture(${textureUniformName}, ${texCoordVariableExpression}).${channels}`;
  const classProperty = property.classProperty;
  let unpackedValue;
  if (webgl2) {
    unpackedValue = classProperty.unpackTextureInShader(
      valueExpression,
      channels,
      metadataVariable,
      initializationLines,
    );
  } else {
    unpackedValue = classProperty.unpackTextureInShaderWebGL1(valueExpression);
  }

  const transformedValue = addValueTransformUniforms({
    valueExpression: unpackedValue,
    renderResources: renderResources,
    glslType: glslType,
    metadataVariable: metadataVariable,
    shaderDestination: ShaderDestination.FRAGMENT,
    property: classProperty,
  });

  const finalAssignment = `metadata.${metadataVariable} = ${transformedValue};`;
  initializationLines.push(finalAssignment);
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    initializationLines,
  );
}

/**
 * Add fields to the MetadataClass struct, and metadataClass value expressions
 * to the initializeMetadata function, for a PropertyAttributeProperty,
 * PropertyTextureProperty, or PropertyTableProperty
 * @param {ShaderBuilder} shaderBuilder The shader builder for the primitive
 * @param {object} propertyInfo Info about the PropertyAttributeProperty, PropertyTextureProperty, or PropertyTableProperty
 * @private
 */
function addPropertyMetadataClass(shaderBuilder, propertyInfo) {
  const { classProperty } = propertyInfo.property;
  const { metadataVariable, glslType, shaderDestination } = propertyInfo;

  // Construct assignment statements to set values in the metadataClass struct
  const assignments = getStructAssignments(
    MetadataPipelineStage.METADATA_CLASS_FIELDS,
    classProperty,
    `metadataClass.${metadataVariable}`,
    glslType,
  );

  // Struct field: Prefix to get the appropriate <type>MetadataClass struct
  const metadataType = `${glslType}MetadataClass`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_CLASS_FS,
    metadataType,
    metadataVariable,
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    assignments,
  );
  if (!ShaderDestination.includesVertexShader(shaderDestination)) {
    return;
  }
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_CLASS_VS,
    metadataType,
    metadataVariable,
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    assignments,
  );
}

/**
 * Add fields to the MetadataStatistics struct, and metadataStatistics value
 * expressions to the initializeMetadata function, for a
 * PropertyAttributeProperty or PropertyTextureProperty
 * @param {ShaderBuilder} shaderBuilder The shader builder for the primitive
 * @param {object} propertyInfo Info about the PropertyAttributeProperty or PropertyTextureProperty
 * @private
 */
function addPropertyMetadataStatistics(shaderBuilder, propertyInfo) {
  const { propertyStatistics } = propertyInfo;
  if (!defined(propertyStatistics)) {
    return;
  }
  const { metadataVariable, type, glslType } = propertyInfo;
  if (type === MetadataType.ENUM) {
    // enums have an "occurrences" statistic which is not implemented yet
    return;
  }

  // Construct assignment statements to set values in the metadataStatistics struct
  const fields = MetadataPipelineStage.METADATA_STATISTICS_FIELDS;
  const struct = `metadataStatistics.${metadataVariable}`;
  const assignments = getStructAssignments(
    fields,
    propertyStatistics,
    struct,
    glslType,
  );

  // Struct field: Prefix to get the appropriate <type>MetadataStatistics struct
  const statisticsType = `${glslType}MetadataStatistics`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_STATISTICS_FS,
    statisticsType,
    metadataVariable,
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    assignments,
  );
  if (!ShaderDestination.includesVertexShader(propertyInfo.shaderDestination)) {
    return;
  }
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_STATISTICS_VS,
    statisticsType,
    metadataVariable,
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    assignments,
  );
}

function processPropertyTableProperty(
  renderResources,
  propertyInfo,
  webgl2,
  propertyIndex,
) {
  addPropertyTablePropertyMetadata(
    renderResources,
    propertyInfo,
    webgl2,
    propertyIndex,
  );
  addPropertyMetadataClass(renderResources.shaderBuilder, propertyInfo);
  addPropertyMetadataStatistics(renderResources.shaderBuilder, propertyInfo);
}

function addPropertyTablePropertyMetadata(
  renderResources,
  propertyInfo,
  webgl2,
  propertyIndex,
) {
  const { shaderBuilder, uniformMap } = renderResources;
  const {
    metadataVariable,
    glslType,
    property,
    featureIdVariableName,
    propertyTable,
  } = propertyInfo;

  if (!webgl2) {
    oneTimeWarning(
      "PropertyTableCustomShader",
      "Property table support for custom shaders requires WebGL2.",
    );
    return;
  }

  if (!defined(featureIdVariableName)) {
    return;
  }

  // For property tables, all properties are packed into a single texture.
  // Thus, the texture identifier is based on the table id.
  const textureUniformName = `u_propertyTableTexture_${propertyTable.id}`;
  const initializationLines = [];

  if (!uniformMap.hasOwnProperty(textureUniformName)) {
    // Note that, unlike property textures, property table textures are available in both
    // the vertex and fragment shaders. While property textures rely on interpolated UV coords,
    // property table textures generally apply to non-interpolated texel fetches based on (featureId, propertyId).
    shaderBuilder.addUniform(
      "sampler2D",
      textureUniformName,
      ShaderDestination.BOTH,
    );
    uniformMap[textureUniformName] = () => propertyTable.texture;
  }

  const shaderDestination = propertyInfo.shaderDestination;
  if (ShaderDestination.includesVertexShader(shaderDestination)) {
    shaderBuilder.addStructField(
      MetadataPipelineStage.STRUCT_ID_METADATA_VS,
      glslType,
      metadataVariable,
    );
  }

  if (ShaderDestination.includesFragmentShader(shaderDestination)) {
    shaderBuilder.addStructField(
      MetadataPipelineStage.STRUCT_ID_METADATA_FS,
      glslType,
      metadataVariable,
    );
  }

  const featureIdExpression = `featureIds.${featureIdVariableName}`;
  const texCoordExpression = `ivec2(${featureIdExpression}, ${propertyIndex})`;
  const textureSampleExpression = `texelFetch(${textureUniformName}, ${texCoordExpression}, 0)`;

  const unpackedVariable = property.unpackTextureInShader(
    textureSampleExpression,
    `rgba`,
    metadataVariable,
    initializationLines,
  );

  const transformedValue = addValueTransformUniforms({
    valueExpression: unpackedVariable,
    renderResources: renderResources,
    glslType: glslType,
    metadataVariable: metadataVariable,
    shaderDestination: shaderDestination,
    property: property,
  });

  const finalAssignment = `metadata.${metadataVariable} = ${transformedValue};`;
  initializationLines.push(finalAssignment);

  if (ShaderDestination.includesVertexShader(shaderDestination)) {
    shaderBuilder.addFunctionLines(
      MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
      initializationLines,
    );
  }

  if (ShaderDestination.includesFragmentShader(shaderDestination)) {
    shaderBuilder.addFunctionLines(
      MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
      initializationLines,
    );
  }
}

/**
 * Construct GLSL assignment statements to set metadata spec values in a struct
 * @param {object[]} fieldNames An object with the following properties:
 * @param {string} fieldNames[].specName The name of the property in the spec
 * @param {string} fieldNames[].shaderName The name of the property in the shader
 * @param {object} values A source of property values, keyed on fieldNames[].specName
 * @param {string} struct The name of the struct to which values will be assigned
 * @param {string} type The type of the values to be assigned
 * @returns {Array<{name: string, value: any}>} Objects containing the property name (in the shader) and a GLSL assignment statement for the property value
 * @private
 */
function getStructAssignments(fieldNames, values, struct, type) {
  function constructAssignment(field) {
    const value = values[field.specName];
    if (defined(value)) {
      return `${struct}.${field.shaderName} = ${type}(${value});`;
    }
  }
  return defined(values)
    ? fieldNames.map(constructAssignment).filter(defined)
    : [];
}

/**
 * Handle offset/scale transform for a property value
 * This wraps the GLSL value expression with a czm_valueTransform() call
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.valueExpression The GLSL value expression without the transform
 * @param {string} options.metadataVariable The name of the GLSL variable that will contain the property value
 * @param {string} options.glslType The GLSL type of the variable
 * @param {ShaderDestination} options.shaderDestination Which shader(s) use this variable
 * @param {PrimitiveRenderResources} options.renderResources The render resources for this primitive
 * @param {(PropertyAttributeProperty|PropertyTextureProperty)} options.property The property from which the value is derived
 * @returns {string} A wrapped GLSL value expression
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
