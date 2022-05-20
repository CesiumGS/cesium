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
const MetadataPipelineStage = {};
MetadataPipelineStage.name = "MetadataPipelineStage";

MetadataPipelineStage.STRUCT_ID_METADATA_VS = "MetadataVS";
MetadataPipelineStage.STRUCT_ID_METADATA_FS = "MetadataFS";
MetadataPipelineStage.STRUCT_NAME_METADATA = "Metadata";
MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS =
  "initializeMetadataVS";
MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS =
  "initializeMetadataFS";
MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA =
  "void initializeMetadata(out Metadata metadata, ProcessedAttributes attributes)";
MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS = "setMetadataVaryings";
MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS =
  "void setMetadataVaryings()";

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
  const shaderBuilder = renderResources.shaderBuilder;

  // Always declare structs, even if not used
  declareStructsAndFunctions(shaderBuilder);
  shaderBuilder.addVertexLines([MetadataStageVS]);
  shaderBuilder.addFragmentLines([MetadataStageFS]);

  updateStatistics(renderResources);

  const structuralMetadata = renderResources.model.structuralMetadata;
  if (!defined(structuralMetadata)) {
    return;
  }

  processPropertyAttributes(renderResources, primitive, structuralMetadata);
  processPropertyTextures(renderResources, structuralMetadata);
};

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

function processPropertyAttributes(
  renderResources,
  primitive,
  structuralMetadata
) {
  const propertyAttributes = structuralMetadata.propertyAttributes;

  if (!defined(propertyAttributes)) {
    return;
  }

  for (let i = 0; i < propertyAttributes.length; i++) {
    const propertyAttribute = propertyAttributes[i];
    const properties = propertyAttribute.properties;
    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = properties[propertyId];

        // Get information about the attribute the same way as the
        // GeometryPipelineStage to ensure we have the correct GLSL type and
        // variable name.
        const modelAttribute = ModelExperimentalUtility.getAttributeByName(
          primitive,
          property.attribute
        );
        const attributeInfo = ModelExperimentalUtility.getAttributeInfo(
          modelAttribute
        );

        addPropertyAttributeProperty(
          renderResources,
          attributeInfo,
          propertyId,
          property
        );
      }
    }
  }
}

function addPropertyAttributeProperty(
  renderResources,
  attributeInfo,
  propertyId,
  property
) {
  const metadataVariable = sanitizeGlslIdentifier(propertyId);
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
}

function processPropertyTextures(renderResources, structuralMetadata) {
  const propertyTextures = structuralMetadata.propertyTextures;

  if (!defined(propertyTextures)) {
    return;
  }

  for (let i = 0; i < propertyTextures.length; i++) {
    const propertyTexture = propertyTextures[i];

    const properties = propertyTexture.properties;
    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = properties[propertyId];
        if (property.isGpuCompatible()) {
          addPropertyTextureProperty(renderResources, propertyId, property);
        }
      }
    }
  }
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

  const metadataVariable = sanitizeGlslIdentifier(propertyId);
  const glslType = property.getGlslType();

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    glslType,
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
}

function addPropertyTextureUniform(
  renderResources,
  uniformName,
  textureReader
) {
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addUniform(
    "sampler2D",
    uniformName,
    ShaderDestination.FRAGMENT
  );

  const uniformMap = renderResources.uniformMap;
  uniformMap[uniformName] = function () {
    return textureReader.texture;
  };
}

function addValueTransformUniforms(valueExpression, options) {
  const metadataVariable = options.metadataVariable;
  const offsetUniformName = `u_${metadataVariable}_offset`;
  const scaleUniformName = `u_${metadataVariable}_scale`;

  const renderResources = options.renderResources;
  const shaderBuilder = renderResources.shaderBuilder;
  const glslType = options.glslType;
  const shaderDestination = options.shaderDestination;
  shaderBuilder.addUniform(glslType, offsetUniformName, shaderDestination);
  shaderBuilder.addUniform(glslType, scaleUniformName, shaderDestination);

  const uniformMap = renderResources.uniformMap;
  uniformMap[offsetUniformName] = function () {
    return options.offset;
  };
  uniformMap[scaleUniformName] = function () {
    return options.scale;
  };

  return `czm_valueTransform(${offsetUniformName}, ${scaleUniformName}, ${valueExpression})`;
}

function sanitizeGlslIdentifier(identifier) {
  // for use in the shader, the property ID must be a valid GLSL identifier,
  // so replace invalid characters with _
  return identifier.replaceAll(/[^_a-zA-Z0-9]+/g, "_");
}

function updateStatistics(renderResources) {
  const model = renderResources.model;
  const statistics = model.statistics;

  // Add metadata memory to the statistics. Note that feature ID memory is
  // handled by the Feature ID pipeline stage.
  const structuralMetadata = model.structuralMetadata;
  if (defined(structuralMetadata)) {
    // Property textures are added to the texture memory count. If textures
    // are loaded asynchronously, this may add 0 to the total. The pipeline
    // will be re-run when textures are loaded for an accurate count.
    countPropertyTextures(statistics, structuralMetadata);

    // Property tables are accounted for here
    statistics.propertyTableByteLength +=
      structuralMetadata.propertyTablesByteLength;

    // Intentionally skip property attributes since those are handled in the
    // geometry pipeline stage
  }

  // Model feature tables also have batch and pick textures that need to be
  // counted.
  const featureTables = model.featureTables;
  const length = featureTables.length;
  for (let i = 0; i < length; i++) {
    const featureTable = featureTables[i];

    // This does not include the property table memory, as that is already
    // counted through the structuralMetadata above.
    statistics.propertyTableByteLength += featureTable.batchTextureByteLength;
  }
}

function countPropertyTextures(statistics, structuralMetadata) {
  const propertyTextures = structuralMetadata.propertyTextures;
  if (!defined(propertyTextures)) {
    return;
  }

  // Loop over the property textures from here so we can use
  // statistics.addTexture() which avoids double-counting shared textures.
  const texturesLength = propertyTextures.length;
  for (let i = 0; i < texturesLength; i++) {
    const propertyTexture = propertyTextures[i];
    const properties = propertyTexture.properties;
    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = properties[propertyId];
        const textureReader = property.textureReader;
        if (defined(textureReader.texture)) {
          statistics.addTexture(textureReader.texture);
        }
      }
    }
  }
}

export default MetadataPipelineStage;
