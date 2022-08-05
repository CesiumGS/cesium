import defaultValue from "../../Core/defaultValue.js";
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
const MetadataPipelineStage = {};
MetadataPipelineStage.name = "MetadataPipelineStage";

MetadataPipelineStage.STRUCT_ID_METADATA_VS = "MetadataVS";
MetadataPipelineStage.STRUCT_ID_METADATA_FS = "MetadataFS";
MetadataPipelineStage.STRUCT_NAME_METADATA = "Metadata";
MetadataPipelineStage.STRUCT_ID_METADATACLASS_VS = "MetadataClassVS";
MetadataPipelineStage.STRUCT_ID_METADATACLASS_FS = "MetadataClassFS";
MetadataPipelineStage.STRUCT_NAME_METADATACLASS = "MetadataClass";
MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS =
  "initializeMetadataVS";
MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS =
  "initializeMetadataFS";
MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA =
  "void initializeMetadata(out Metadata metadata, out MetadataClass metadataClass, ProcessedAttributes attributes)";
MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS = "setMetadataVaryings";
MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS =
  "void setMetadataVaryings()";
// Metadata class info: some fields must be renamed to avoid reserved words
MetadataPipelineStage.METADATACLASS_FIELDS = [
  { specName: "noData", shaderName: "noData" },
  { specName: "default", shaderName: "defaultValue" },
  { specName: "min", shaderName: "minValue" },
  { specName: "max", shaderName: "maxValue" },
];

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

  const structuralMetadata = defaultValue(model.structuralMetadata, {});
  const { propertyAttributes, propertyTextures } = structuralMetadata;

  // Find which metadata types are used
  const metadataTypes = new Set();
  if (defined(propertyAttributes)) {
    getPropertyAttributeTypes(metadataTypes, primitive, propertyAttributes);
  }
  if (defined(propertyTextures)) {
    getPropertyTextureTypes(metadataTypes, propertyTextures);
  }

  // Declare only the needed <type>MetadataClass structs
  declareMetadataTypeStructs(shaderBuilder, metadataTypes);

  // Always declare the Metadata and MetadataClass structs, and the
  // initializeMetadata() function, even if not used
  declareStructsAndFunctions(shaderBuilder);
  shaderBuilder.addVertexLines([MetadataStageVS]);
  shaderBuilder.addFragmentLines([MetadataStageFS]);

  if (defined(propertyAttributes)) {
    processPropertyAttributes(renderResources, primitive, propertyAttributes);
  }
  if (defined(propertyTextures)) {
    processPropertyTextures(renderResources, propertyTextures);
  }
};

/**
 * Declare <type>MetadataClass structs in the shader
 * @param {ShaderBuilder} shaderBuilder The shader builder for the primitive
 * @param {Set<String>} metadataTypes The types of metadata used in the shaders
 * @private
 */
function declareMetadataTypeStructs(shaderBuilder, metadataTypes) {
  const classFields = MetadataPipelineStage.METADATACLASS_FIELDS;

  for (const metadataType of metadataTypes) {
    const structName = `${metadataType}MetadataClass`;
    const structIdVs = `${structName}VS`;
    const structIdFs = `${structName}FS`;
    // Declare the struct in both vertex and fragment shaders
    shaderBuilder.addStruct(structIdVs, structName, ShaderDestination.VERTEX);
    shaderBuilder.addStruct(structIdFs, structName, ShaderDestination.FRAGMENT);

    // Add fields
    for (let j = 0; j < classFields.length; j++) {
      const shaderName = classFields[j].shaderName;
      shaderBuilder.addStructField(structIdVs, metadataType, shaderName);
      shaderBuilder.addStructField(structIdFs, metadataType, shaderName);
    }
  }
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

  processProperties(propertyAttributes, getPropertyAttributePropertyType);
}

function processPropertyAttributes(
  renderResources,
  primitive,
  propertyAttributes
) {
  const { getAttributeByName, getAttributeInfo } = ModelUtility;

  function processPropertyAttribute(propertyId, property) {
    const modelAttribute = getAttributeByName(primitive, property.attribute);
    const attributeInfo = getAttributeInfo(modelAttribute);
    addPropertyAttributeProperty(
      renderResources,
      attributeInfo,
      propertyId,
      property
    );
  }

  processProperties(propertyAttributes, processPropertyAttribute);
}

function addPropertyAttributeProperty(
  renderResources,
  attributeInfo,
  propertyId,
  property
) {
  const metadataVariable = ModelUtility.sanitizeGlslIdentifier(propertyId);
  const attributeVariable = attributeInfo.variableName;

  // in WebGL 1, attributes must have floating point components, so it's safe
  // to assume here that the types will match. Even if the property was
  // normalized, this is handled at upload time, not in the shader.
  const glslType = attributeInfo.glslType;

  const shaderBuilder = renderResources.shaderBuilder;

  // declare the struct field, e.g.
  // struct Metadata {
  //   float property;
  // }
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
  // For MetadataClass, prefix to get the appropriate MetadataClass struct
  // struct MetadataClass {
  //   floatMetadataClass property;
  // }
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

  let unpackedValue = `attributes.${attributeVariable}`;

  // handle offset/scale transform. This wraps the GLSL expression with
  // the czm_valueTransform() call.
  if (property.hasValueTransform) {
    unpackedValue = addValueTransformUniforms(unpackedValue, {
      renderResources: renderResources,
      glslType: glslType,
      metadataVariable: metadataVariable,
      shaderDestination: ShaderDestination.BOTH,
      offset: property.offset,
      scale: property.scale,
    });
  }

  // assign the result to the metadata struct property.
  // e.g. metadata.property = unpackingSteps(attributes.property);
  const initializationLine = `metadata.${metadataVariable} = ${unpackedValue};`;
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
    [initializationLine]
  );
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    [initializationLine]
  );

  // Add lines to set values in the metadataClass struct
  const classFields = MetadataPipelineStage.METADATACLASS_FIELDS;
  for (let i = 0; i < classFields.length; i++) {
    const { specName, shaderName } = classFields[i];

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

function getPropertyTextureTypes(metadataTypes, propertyTextures) {
  function getPropertyTexturePropertyType(propertyId, property) {
    const glslType = property.getGlslType();
    metadataTypes.add(glslType);
  }

  processProperties(propertyTextures, getPropertyTexturePropertyType);
}

function processPropertyTextures(renderResources, propertyTextures) {
  function processPropertyTexture(propertyId, property) {
    if (property.isGpuCompatible()) {
      addPropertyTextureProperty(renderResources, propertyId, property);
    }
  }

  processProperties(propertyTextures, processPropertyTexture);
}

function addPropertyTextureProperty(renderResources, propertyId, property) {
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

  const metadataVariable = ModelUtility.sanitizeGlslIdentifier(propertyId);
  const glslType = property.getGlslType();

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    glslType,
    metadataVariable
  );
  // For MetadataClass, prefix to get the appropriate MetadataClass struct
  // struct MetadataClass {
  //   floatMetadataClass property;
  // }
  const metadataType = `${glslType}MetadataClass`;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATACLASS_FS,
    metadataType,
    metadataVariable
  );

  const texCoord = textureReader.texCoord;
  const texCoordVariable = `attributes.texCoord_${texCoord}`;
  const channels = textureReader.channels;
  let unpackedValue = `texture2D(${textureUniformName}, ${texCoordVariable}).${channels}`;

  // Some types need an unpacking step or two. For example, since texture reads
  // are always normalized, UINT8 (not normalized) properties need to be
  // un-normalized in the shader.
  unpackedValue = property.unpackInShader(unpackedValue);

  // handle offset/scale transform. This wraps the GLSL expression with
  // the czm_valueTransform() call.
  if (property.hasValueTransform) {
    unpackedValue = addValueTransformUniforms(unpackedValue, {
      renderResources: renderResources,
      glslType: glslType,
      metadataVariable: metadataVariable,
      shaderDestination: ShaderDestination.FRAGMENT,
      offset: property.offset,
      scale: property.scale,
    });
  }

  const initializationLine = `metadata.${metadataVariable} = ${unpackedValue};`;
  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    [initializationLine]
  );
  // Add lines to set values in the metadataClass struct
  const classFields = MetadataPipelineStage.METADATACLASS_FIELDS;
  for (let i = 0; i < classFields.length; i++) {
    const { specName, shaderName } = classFields[i];

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

function addValueTransformUniforms(valueExpression, options) {
  const metadataVariable = options.metadataVariable;
  const offsetUniformName = `u_${metadataVariable}_offset`;
  const scaleUniformName = `u_${metadataVariable}_scale`;

  const { shaderBuilder, uniformMap } = options.renderResources;
  const glslType = options.glslType;
  const shaderDestination = options.shaderDestination;
  shaderBuilder.addUniform(glslType, offsetUniformName, shaderDestination);
  shaderBuilder.addUniform(glslType, scaleUniformName, shaderDestination);

  uniformMap[offsetUniformName] = () => options.offset;
  uniformMap[scaleUniformName] = () => options.scale;

  return `czm_valueTransform(${offsetUniformName}, ${scaleUniformName}, ${valueExpression})`;
}

export default MetadataPipelineStage;
