import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import MetadataStageFS from "../../Shaders/ModelExperimental/MetadataStageFS.js";
import MetadataStageVS from "../../Shaders/ModelExperimental/MetadataStageVS.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

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
    "void initializeMetadata(out Metadata metadata, out MetadataClass metadataClass, ProcessedAttributes attributes)",
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

  // Declare <type>MetadataClass and <type>MetadataStatistics structs as needed
  const metadataTypes = getMetadataTypes(primitive, structuralMetadata);
  declareMetadataTypeStructs(shaderBuilder, metadataTypes, content);

  // Always declare the Metadata, MetadataClass, and MetadataStatistics structs
  // and the initializeMetadata() function, even if not used
  declareStructsAndFunctions(shaderBuilder);
  shaderBuilder.addVertexLines([MetadataStageVS]);
  shaderBuilder.addFragmentLines([MetadataStageFS]);

  const { propertyAttributes, propertyTextures } = structuralMetadata;
  if (defined(propertyAttributes)) {
    processPropertyAttributes(renderResources, primitive, propertyAttributes);
  }
  if (defined(propertyTextures)) {
    processPropertyTextures(renderResources, propertyTextures);
  }
};

/**
 * Get the types of metadata used by a primitive
 * @param {ModelComponents.primitive} primitive
 * @param {StructuralMetadata} structuralMetadata
 * @returns {Set}
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
 * @param {Set} metadataTypes The types of metadata used
 * @private
 */
function declareMetadataTypeStructs(shaderBuilder, metadataTypes, content) {
  const classFields = MetadataPipelineStage.METADATACLASS_FIELDS;
  for (const metadataType of metadataTypes) {
    const classStructName = `${metadataType}MetadataClass`;
    declareTypeStruct(classStructName, metadataType, classFields);
  }

  if (!defined(content?.tileset?.metadataExtension?.statistics)) {
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
 * Process the properties of an array of objects
 * @param {Object[]} propertyArray An array of objects with properties to process
 * @param {Object} propertyArray[].properties The properties to be processed
 * @param {processProperty} process A function to execute on each property
 * @private
 */
function processProperties(propertyArray, process) {
  for (let i = 0; i < propertyArray.length; i++) {
    const properties = propertyArray[i].properties;
    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = properties[propertyId];
        process(propertyId, property);
      }
    }
  }
}

function getPropertyAttributeTypes(
  metadataTypes,
  primitive,
  propertyAttributes
) {
  const { getAttributeByName, getAttributeInfo } = ModelExperimentalUtility;

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

  processProperties(propertyAttributes, getPropertyAttributePropertyType);
}

function processPropertyAttributes(
  renderResources,
  primitive,
  propertyAttributes
) {
  const {
    getAttributeByName,
    getAttributeInfo,
    sanitizeGlslIdentifier,
  } = ModelExperimentalUtility;

  function processPropertyAttribute(propertyId, property) {
    // Get information about the attribute the same way as the
    // GeometryPipelineStage to ensure we have the correct GLSL type
    const modelAttribute = getAttributeByName(primitive, property.attribute);
    const attributeInfo = getAttributeInfo(modelAttribute);
    const metadataVariable = sanitizeGlslIdentifier(propertyId);

    // in WebGL 1, attributes must have floating point components, so it's safe
    // to assume here that the types will match. Even if the property was
    // normalized, this is handled at upload time, not in the shader.
    const glslType = attributeInfo.glslType;

    addPropertyAttributePropertyMetadata(
      renderResources,
      attributeInfo,
      metadataVariable,
      glslType,
      property
    );
    addPropertyAttributePropertyMetadataClass(
      renderResources.shaderBuilder,
      metadataVariable,
      glslType,
      property
    );
    addPropertyAttributePropertyMetadataStatistics(
      renderResources.shaderBuilder,
      metadataVariable,
      glslType,
      property
    );
  }

  processProperties(propertyAttributes, processPropertyAttribute);
}

/**
 * Add fields to the Metadata struct, and metadata value expressions to the
 * initializeMetadata function, for a PropertyAttributeProperty
 * @param {PrimitiveRenderResources} renderResources
 * @param {Object} attributeInfo Info from ModelExperimentalUtility.getAttributeInfo
 * @param {String} metadataVariable
 * @param {String} glslType
 * @param {PropertyAttributeProperty} property
 * @private
 */
function addPropertyAttributePropertyMetadata(
  renderResources,
  attributeInfo,
  metadataVariable,
  glslType,
  property
) {
  // declare the struct field
  const shaderBuilder = renderResources.shaderBuilder;
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

  // get a GLSL expression for the value of the property, including transforms
  const transformedValue = addValueTransformUniforms({
    valueExpression: `attributes.${attributeInfo.variableName}`,
    renderResources: renderResources,
    glslType: glslType,
    metadataVariable: metadataVariable,
    shaderDestination: ShaderDestination.BOTH,
    property: property,
  });

  // assign the result to the metadata struct property.
  // e.g. metadata.property = unpackingSteps(attributes.property);
  const initializationLine = `metadata.${metadataVariable} = ${transformedValue};`;
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
  const fields = MetadataPipelineStage.METADATACLASS_FIELDS;
  for (let i = 0; i < fields.length; i++) {
    const { specName, shaderName } = fields[i];

    const fieldValue = property.classProperty[specName];
    if (!defined(fieldValue)) {
      continue;
    }
    const fieldLine = `metadataClass.${metadataVariable}.${shaderName} = ${glslType}(${fieldValue});`;
    shaderBuilder.addFunctionLines(
      MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
      [fieldLine]
    );
    shaderBuilder.addFunctionLines(
      MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
      [fieldLine]
    );
  }
}

/**
 * Add fields to the MetadataStatistics struct, and metadataStatistics value
 * expressions to the initializeMetadata function, for a PropertyAttributeProperty
 * @param {ShaderBuilder} shaderBuilder
 * @param {String} metadataVariable
 * @param {String} glslType
 * @param {PropertyAttributeProperty} property
 * @private
 */
function addPropertyAttributePropertyMetadataStatistics(
  shaderBuilder,
  metadataVariable,
  glslType,
  property
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
  /** const fields = MetadataPipelineStage.METADATASTATISTICS_FIELDS;
  for (let i = 0; i < fields.length; i++) {
    const { specName, shaderName } = fields[i];

    // TODO: does this expose the statistics properties??
    const fieldValue = property.classProperty[specName];
    if (!defined(fieldValue)) {
      continue;
    }
    const fieldLine = `metadataStatistics.${metadataVariable}.${shaderName} = ${glslType}(${fieldValue});`;
    shaderBuilder.addFunctionLines(
      MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
      [fieldLine]
    );
    shaderBuilder.addFunctionLines(
      MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
      [fieldLine]
    );
  }*/
}

function getPropertyTextureTypes(metadataTypes, propertyTextures) {
  function getPropertyTexturePropertyType(propertyId, property) {
    const glslType = property.getGlslType();
    metadataTypes.add(glslType);
  }

  processProperties(propertyTextures, getPropertyTexturePropertyType);
}

function processPropertyTextures(renderResources, propertyTextures) {
  const { sanitizeGlslIdentifier } = ModelExperimentalUtility;

  function processPropertyTexture(propertyId, property) {
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
    addPropertyTexturePropertyMetadataStatistics(
      renderResources.shaderBuilder,
      metadataVariable,
      property
    );
  }

  processProperties(propertyTextures, processPropertyTexture);
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
  // Property texture properties may share the same physical texture, so only
  // add the texture uniform the first time we encounter it.
  const textureReader = property.textureReader;
  const textureIndex = textureReader.index;
  const textureUniformName = `u_propertyTexture_${textureIndex}`;
  if (!renderResources.uniformMap.hasOwnProperty(textureUniformName)) {
    addPropertyTextureUniform(
      renderResources,
      textureUniformName,
      textureReader
    );
  }

  const glslType = property.getGlslType();

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    glslType,
    metadataVariable
  );

  // Get a GLSL expression for the value of the property
  const { texCoord, channels } = textureReader;
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

  // Declare struct field. Prefix to get the appropriate <type>MetadataClass struct, e.g.
  // struct MetadataClass {
  //   floatMetadataClass property;
  // }
  const metadataType = `${glslType}MetadataClass`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_FS,
    metadataType,
    metadataVariable
  );

  // Add lines to set values in the metadataClass struct
  const fields = MetadataPipelineStage.METADATACLASS_FIELDS;
  for (let i = 0; i < fields.length; i++) {
    const { specName, shaderName } = fields[i];

    const fieldValue = property.classProperty[specName];
    if (!defined(fieldValue)) {
      continue;
    }
    const fieldLine = `metadataClass.${metadataVariable}.${shaderName} = ${glslType}(${fieldValue});`;
    shaderBuilder.addFunctionLines(
      MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
      [fieldLine]
    );
  }
}

/**
 * Add fields to the MetadataStatistics struct, and metadataStatistics value
 * expressions to the initializeMetadata function, for a PropertyTextureProperty
 * @param {ShaderBuilder} shaderBuilder
 * @param {String} metadataVariable
 * @param {PropertyTextureProperty} property
 * @private
 */
function addPropertyTexturePropertyMetadataStatistics(
  shaderBuilder,
  metadataVariable,
  property
) {
  const glslType = property.getGlslType();

  // Declare struct field. Prefix to get the appropriate <type>MetadataStatistics struct, e.g.
  // struct MetadataClass {
  //   floatMetadataClass property;
  // }
  const statisticsType = `${glslType}MetadataStatistics`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_FS,
    statisticsType,
    metadataVariable
  );

  // Add lines to set values in the metadataStatistics struct
  /** const fields = MetadataPipelineStage.METADATASTATISTICS_FIELDS;
  for (let i = 0; i < fields.length; i++) {
    const { specName, shaderName } = fields[i];

    // TODO: this is WRONG
    const fieldValue = property.classProperty[specName];
    if (!defined(fieldValue)) {
      continue;
    }
    const fieldLine = `metadataClass.${metadataVariable}.${shaderName} = ${glslType}(${fieldValue});`;
    shaderBuilder.addFunctionLines(
      MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
      [fieldLine]
    );
  }*/
}

function addPropertyTextureUniform(
  renderResources,
  uniformName,
  textureReader
) {
  const { shaderBuilder, uniformMap } = renderResources;
  shaderBuilder.addUniform(
    "sampler2D",
    uniformName,
    ShaderDestination.FRAGMENT
  );

  uniformMap[uniformName] = () => textureReader.texture;
}

/**
 * Handle offset/scale transform for a property value
 * This wraps the GLSL value expression with a czm_valueTransform() call
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.valueExpression The GLSL value expression without the transform
 * @param {String} options.metadataVariable The name of the GLSL variable that will contain the property value
 * @param {ShaderDestination} options.shaderDestination Which shader(s) use this variable
 * @param {String} options.glslType The GLSL type of the variable
 * @param {PrimitiveRenderResources} options.renderResources The render resources for this primitive
 * @param {Object} options.property The property from which the value is derived
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
