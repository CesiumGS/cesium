import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import MetadataStageFS from "../../Shaders/Model/MetadataStageFS.js";
import MetadataStageVS from "../../Shaders/Model/MetadataStageVS.js";
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
    // { specName: "occurrences", shaderName: "occurrences" }, // TODO
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

  // Declare <type>MetadataClass and <type>MetadataStatistics structs as needed
  const metadataTypes = getMetadataTypes(primitive, structuralMetadata);
  declareMetadataTypeStructs(shaderBuilder, metadataTypes, statistics);

  // Always declare the Metadata, MetadataClass, and MetadataStatistics structs
  // and the initializeMetadata() function, even if not used
  declareStructsAndFunctions(shaderBuilder);
  shaderBuilder.addVertexLines([MetadataStageVS]);
  shaderBuilder.addFragmentLines([MetadataStageFS]);

  const { propertyAttributes, propertyTextures } = structuralMetadata;
  if (defined(propertyAttributes)) {
    processPropertyAttributes(
      renderResources,
      primitive,
      propertyAttributes,
      statistics
    );
  }
  if (defined(propertyTextures)) {
    processPropertyTextures(renderResources, propertyTextures, statistics);
  }
};

/**
 * Get the types of metadata used by a primitive
 * @param {ModelComponents.Primitive} primitive
 * @param {StructuralMetadata} structuralMetadata
 * @returns {Set<String>}
 * @private
 */
function getMetadataTypes(primitive, structuralMetadata) {
  const { propertyAttributes, propertyTextures } = structuralMetadata;

  const metadataTypes = new Set();
  if (defined(propertyAttributes)) {
    getPropertyAttributeTypes(metadataTypes, primitive, propertyAttributes);
  }
  if (defined(propertyTextures)) {
    getPropertyTextureTypes(metadataTypes, propertyTextures);
  }

  return metadataTypes;
}

/**
 * Declare <type>MetadataClass structs in the shader
 * @param {ShaderBuilder} shaderBuilder The shader builder for the primitive
 * @param {Set<String>} metadataTypes The types of metadata used in the shaders
 * @param {Object} statistics Statistics about the metadata.
 * @private
 */
function declareMetadataTypeStructs(shaderBuilder, metadataTypes, statistics) {
  const classFields = MetadataPipelineStage.METADATACLASS_FIELDS;
  for (const metadataType of metadataTypes) {
    const classStructName = `${metadataType}MetadataClass`;
    declareTypeStruct(classStructName, metadataType, classFields);
  }

  if (!defined(statistics)) {
    return;
  }

  const statisticsFields = MetadataPipelineStage.METADATASTATISTICS_FIELDS;
  for (const metadataType of metadataTypes) {
    const statisticsStructName = `${metadataType}MetadataStatistics`;
    declareTypeStruct(statisticsStructName, metadataType, statisticsFields);
  }

  function declareTypeStruct(structName, type, fields) {
    const structIdVs = `${structName}VS`;
    const structIdFs = `${structName}FS`;

    // Declare the struct in both vertex and fragment shaders
    shaderBuilder.addStruct(structIdVs, structName, ShaderDestination.VERTEX);
    shaderBuilder.addStruct(structIdFs, structName, ShaderDestination.FRAGMENT);

    // Add fields
    for (let i = 0; i < fields.length; i++) {
      const shaderName = fields[i].shaderName;
      const shaderType =
        fields[i].type === "float" ? convertToFloatComponents(type) : type;
      shaderBuilder.addStructField(structIdVs, shaderType, shaderName);
      shaderBuilder.addStructField(structIdFs, shaderType, shaderName);
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
 * A callback function to process a property
 * @callback processProperty
 * @param {String} propertyId
 * @param {Object} property
 * @private
 */

/**
 * Execute a function on each "own property" of a supplied object
 * @param {Object} properties
 * @param {processProperty} process
 * @private
 */
function processProperties(properties, process) {
  for (const propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      const property = properties[propertyId];
      process(propertyId, property);
    }
  }
}

/**
 * Update a Set of metadata types to include PropertyAttributeProperty types
 * @param {Set<String>} metadataTypes
 * @param {ModelComponents.Primitive} primitive
 * @param {PropertyAttribute[]} propertyAttributes
 * @private
 */
function getPropertyAttributeTypes(
  metadataTypes,
  primitive,
  propertyAttributes
) {
  const { getAttributeByName, getAttributeInfo } = ModelUtility;

  function getPropertyAttributePropertyType(propertyId, property) {
    // Get information about the attribute the same way as the
    // GeometryPipelineStage to ensure we have the correct GLSL type
    const modelAttribute = getAttributeByName(primitive, property.attribute);
    const attributeInfo = getAttributeInfo(modelAttribute);

    // in WebGL 1, attributes must have floating point components, so it's safe
    // to assume here that the types will match. Even if the property was
    // normalized, this is handled at upload time, not in the shader.
    const glslType = attributeInfo.glslType;

    metadataTypes.add(glslType);
  }

  for (let i = 0; i < propertyAttributes.length; i++) {
    const properties = propertyAttributes[i].properties;
    processProperties(properties, getPropertyAttributePropertyType);
  }
}

/**
 * Update the shader to handle all PropertyAttributes
 * @param {PrimitiveRenderResources} renderResources
 * @param {ModelComponents.Primitive} primitive
 * @param {PropertyAttribute[]} propertyAttributes
 * @param {Object} statistics
 * @private
 */
function processPropertyAttributes(
  renderResources,
  primitive,
  propertyAttributes,
  statistics
) {
  for (let i = 0; i < propertyAttributes.length; i++) {
    const propertyAttribute = propertyAttributes[i];
    const classId = propertyAttribute.class.id;
    const classStatistics = statistics?.classes[classId];
    processPropertyAttribute(
      renderResources,
      primitive,
      propertyAttribute,
      classStatistics
    );
  }
}

/**
 * Update the shader for a single PropertyAttribute
 * @param {PrimitiveRenderResources} renderResources
 * @param {ModelComponents.Primitive} primitive
 * @param {PropertyAttribute} propertyAttribute
 * @param {Object} classStatistics
 * @private
 */
function processPropertyAttribute(
  renderResources,
  primitive,
  propertyAttribute,
  classStatistics
) {
  const {
    getAttributeByName,
    getAttributeInfo,
    sanitizeGlslIdentifier,
  } = ModelUtility;
  const { shaderBuilder } = renderResources;

  function processPropertyAttributeProperty(propertyId, property) {
    const metadataVariable = sanitizeGlslIdentifier(propertyId);

    // Get information about the attribute the same way as the
    // GeometryPipelineStage to ensure we have the correct GLSL type
    const modelAttribute = getAttributeByName(primitive, property.attribute);
    const attributeInfo = getAttributeInfo(modelAttribute);

    // in WebGL 1, attributes must have floating point components, so it's safe
    // to assume here that the types will match. Even if the property was
    // normalized, this is handled at upload time, not in the shader.
    const glslType = attributeInfo.glslType;

    const valueExpression = addValueTransformUniforms({
      valueExpression: `attributes.${attributeInfo.variableName}`,
      renderResources: renderResources,
      glslType: glslType,
      metadataVariable: metadataVariable,
      shaderDestination: ShaderDestination.BOTH,
      property: property,
    });
    addPropertyAttributePropertyMetadata(
      shaderBuilder,
      metadataVariable,
      glslType,
      valueExpression
    );
    addPropertyAttributePropertyMetadataClass(
      shaderBuilder,
      metadataVariable,
      glslType,
      property
    );
    if (defined(classStatistics)) {
      const propertyStatistics = classStatistics.properties[propertyId];
      addPropertyAttributePropertyMetadataStatistics(
        shaderBuilder,
        metadataVariable,
        glslType,
        propertyStatistics
      );
    }
  }

  processProperties(
    propertyAttribute.properties,
    processPropertyAttributeProperty
  );
}

/**
 * Add fields to the Metadata struct, and metadata value assignments to the
 * initializeMetadata function, for a PropertyAttributeProperty
 * @param {PrimitiveRenderResources} renderResources
 * @param {String} metadataVariable
 * @param {String} glslType
 * @param {String} valueExpression A GLSL expression for the value of the property
 * @private
 */
function addPropertyAttributePropertyMetadata(
  shaderBuilder,
  metadataVariable,
  glslType,
  valueExpression
) {
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
 * to the initializeMetadata function, for a PropertyAttributeProperty
 * @param {ShaderBuilder} shaderBuilder
 * @param {String} metadataVariable
 * @param {String} glslType
 * @param {PropertyAttributeProperty} property
 * @private
 */
function addPropertyAttributePropertyMetadataClass(
  shaderBuilder,
  metadataVariable,
  glslType,
  property
) {
  // Declare struct field. Prefix to get the appropriate <type>MetadataClass struct
  const metadataType = `${glslType}MetadataClass`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_VS,
    metadataType,
    metadataVariable
  );
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_FS,
    metadataType,
    metadataVariable
  );

  // Add lines to set values in the metadataClass struct
  const values = getFieldValues(
    MetadataPipelineStage.METADATACLASS_FIELDS,
    property.classProperty
  );
  const assignments = values.map((field) => {
    const structField = `metadataClass.${metadataVariable}.${field.name}`;
    const structValue = `${glslType}(${field.value})`;
    return `${structField} = ${structValue};`;
  });
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    assignments
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    assignments
  );
}

/**
 * Add fields to the MetadataStatistics struct, and metadataStatistics value
 * expressions to the initializeMetadata function, for a PropertyAttributeProperty
 * @param {ShaderBuilder} shaderBuilder
 * @param {String} metadataVariable
 * @param {String} glslType
 * @param {Object} propertyStatistics
 * @private
 */
function addPropertyAttributePropertyMetadataStatistics(
  shaderBuilder,
  metadataVariable,
  glslType,
  propertyStatistics
) {
  // Declare struct field. Prefix to get the appropriate <type>MetadataStatistics struct
  const statisticsType = `${glslType}MetadataStatistics`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATASTATISTICS_VS,
    statisticsType,
    metadataVariable
  );
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATASTATISTICS_FS,
    statisticsType,
    metadataVariable
  );

  // Add lines to set values in the metadataStatistics struct
  const values = getFieldValues(
    MetadataPipelineStage.METADATASTATISTICS_FIELDS,
    propertyStatistics
  );
  const assignments = values.map((field) => {
    const structField = `metadataStatistics.${metadataVariable}.${field.name}`;
    const structValue = `${glslType}(${field.value})`;
    return `${structField} = ${structValue};`;
  });
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    assignments
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    assignments
  );
}

/**
 * Update a Set of metadata types to include PropertyTextureProperty types
 * @param {Set<String>} metadataTypes
 * @param {PropertyTexture[]} propertyTextures
 * @private
 */
function getPropertyTextureTypes(metadataTypes, propertyTextures) {
  function getPropertyTexturePropertyType(propertyId, property) {
    const glslType = property.getGlslType();
    metadataTypes.add(glslType);
  }

  for (let i = 0; i < propertyTextures.length; i++) {
    const properties = propertyTextures[i].properties;
    processProperties(properties, getPropertyTexturePropertyType);
  }
}

/**
 * Update the shader to handle all PropertyTextures
 * @param {PrimitiveRenderResources} renderResources
 * @param {PropertyTextures[]} propertyTextures
 * @param {Object} statistics
 * @private
 */
function processPropertyTextures(
  renderResources,
  propertyTextures,
  statistics
) {
  for (let i = 0; i < propertyTextures.length; i++) {
    const propertyTexture = propertyTextures[i];
    const classId = propertyTexture.class.id;
    const classStatistics = statistics?.classes[classId];
    processPropertyTexture(renderResources, propertyTexture, classStatistics);
  }
}

/**
 * Update the shader for a single PropertyTexture
 * @param {PrimitiveRenderResources} renderResources
 * @param {PropertyTexture} propertyTexture
 * @param {Object} classStatistics
 * @private
 */
function processPropertyTexture(
  renderResources,
  propertyTexture,
  classStatistics
) {
  const { sanitizeGlslIdentifier } = ModelUtility;

  function processPropertyTextureProperty(propertyId, property) {
    if (!property.isGpuCompatible()) {
      return;
    }
    const metadataVariable = sanitizeGlslIdentifier(propertyId);
    addPropertyTexturePropertyMetadata(
      renderResources,
      metadataVariable,
      property
    );
    addPropertyTexturePropertyMetadataClass(
      renderResources.shaderBuilder,
      metadataVariable,
      property
    );
    if (defined(classStatistics)) {
      const propertyStatistics = classStatistics.properties[propertyId];
      addPropertyTexturePropertyMetadataStatistics(
        renderResources.shaderBuilder,
        metadataVariable,
        property,
        propertyStatistics
      );
    }
  }

  processProperties(propertyTexture.properties, processPropertyTextureProperty);
}

/**
 * Add fields to the Metadata struct, and metadata value expressions to the
 * initializeMetadata function, for a PropertyTextureProperty
 * @param {PrimitiveRenderResources} renderResources
 * @param {String} metadataVariable
 * @param {PropertyTextureProperty} property
 * @private
 */
function addPropertyTexturePropertyMetadata(
  renderResources,
  metadataVariable,
  property
) {
  const { shaderBuilder, uniformMap } = renderResources;

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

  const glslType = property.getGlslType();

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
 * Add fields to the MetadataClass struct, and metadataClass value expressions to the
 * initializeMetadata function, for a PropertyTextureProperty
 * @param {ShaderBuilder} shaderBuilder
 * @param {String} metadataVariable
 * @param {PropertyTextureProperty} property
 * @private
 */
function addPropertyTexturePropertyMetadataClass(
  shaderBuilder,
  metadataVariable,
  property
) {
  const glslType = property.getGlslType();

  // Declare struct field. Prefix to get the appropriate <type>MetadataClass struct
  const metadataType = `${glslType}MetadataClass`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_FS,
    metadataType,
    metadataVariable
  );

  // Add lines to set values in the metadataClass struct
  const values = getFieldValues(
    MetadataPipelineStage.METADATACLASS_FIELDS,
    property.classProperty
  );
  const assignments = values.map((field) => {
    const structField = `metadataClass.${metadataVariable}.${field.name}`;
    const structValue = `${glslType}(${field.value})`;
    return `${structField} = ${structValue};`;
  });
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    assignments
  );
}

/**
 * Add fields to the MetadataStatistics struct, and metadataStatistics value
 * expressions to the initializeMetadata function, for a PropertyTextureProperty
 * @param {ShaderBuilder} shaderBuilder
 * @param {String} metadataVariable
 * @param {PropertyTextureProperty} property
 * @param {Object} propertyStatistics
 * @private
 */
function addPropertyTexturePropertyMetadataStatistics(
  shaderBuilder,
  metadataVariable,
  property,
  propertyStatistics
) {
  const glslType = property.getGlslType();

  // Declare struct field. Prefix to get the appropriate <type>MetadataStatistics struct
  const statisticsType = `${glslType}MetadataStatistics`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATASTATISTICS_FS,
    statisticsType,
    metadataVariable
  );

  // Add lines to set values in the metadataStatistics struct
  const values = getFieldValues(
    MetadataPipelineStage.METADATASTATISTICS_FIELDS,
    propertyStatistics
  );
  const assignments = values.map((field) => {
    const structField = `metadataStatistics.${metadataVariable}.${field.name}`;
    const structValue = `${glslType}(${field.value})`;
    return `${structField} = ${structValue};`;
  });
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    assignments
  );
}

/**
 * Given a list of property names, retrieve property values from a metadata schema object
 * The property names are supplied in two forms: one from the spec, one used in the shader
 * @param {Object[]} fieldNames
 * @param {String} fieldNames[].specName The name of the property in the spec
 * @param {String} fieldNames[].shaderName The name of the property in the shader
 * @param {Object} values A source of property values, keyed on fieldNames[].specName
 * @returns {Array<{name: String, value}>}
 * @private
 */
function getFieldValues(fieldNames, values) {
  if (!defined(values)) {
    return [];
  }

  return fieldNames.map(getFieldValue).filter((field) => defined(field.value));

  function getFieldValue(field) {
    return {
      name: field.shaderName,
      value: values[field.specName],
    };
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
