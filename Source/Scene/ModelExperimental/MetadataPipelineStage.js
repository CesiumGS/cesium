import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import MetadataStageFS from "../../Shaders/ModelExperimental/MetadataStageFS.js";
import MetadataStageVS from "../../Shaders/ModelExperimental/MetadataStageVS.js";

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

  const featureMetadata = renderResources.model.featureMetadata;
  if (!defined(featureMetadata)) {
    return;
  }

  processPropertyTextures(renderResources, featureMetadata);

  // Coming Soon:
  //processPropertyTables(renderResources, featureMetadata);
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

function processPropertyTextures(renderResources, featureMetadata) {
  const propertyTextures = featureMetadata.propertyTextures;
  const shaderBuilder = renderResources.shaderBuilder;

  if (!defined(propertyTextures)) {
    return;
  }

  for (let i = 0; i < propertyTextures.length; i++) {
    const propertyTexture = propertyTextures[i];
    // example: u_propertyTexture_0
    const uniformName = `u_propertyTexture_${i}`;
    addPropertyTextureUniform(renderResources, uniformName, propertyTexture);

    // need to add a uniform
    const properties = propertyTexture.properties;
    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = properties[propertyId];
        addPropertyTextureProperty(
          shaderBuilder,
          uniformName,
          propertyId,
          property
        );
      }
    }
  }
}

function addPropertyTextureUniform(
  renderResources,
  uniformName,
  propertyTexture
) {
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addUniform(
    "sampler2D",
    uniformName,
    ShaderDestination.FRAGMENT
  );

  const uniformMap = renderResources.uniformMap;
  uniformMap[uniformName] = function () {
    return propertyTexture.texture;
  };
}

function addPropertyTextureProperty(
  shaderBuilder,
  uniformName,
  propertyId,
  property
) {
  const glslType = property.getGlslType();

  // for use in the shader, the property ID must be a valid GLSL identifier,
  // so replace invalid characters with _
  const glslPropertyId = propertyId.replaceAll(/[^_a-zA-Z0-9]+/g, "_");

  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    glslType,
    glslPropertyId
  );

  // Insert the texture read.
  // Example:
  // metadata.<property> = texture2D(u_propertyTexture_<n>, <texCoords>).<channels>;
  const textureReader = property.textureReader;
  const texCoord = textureReader.texCoord;
  const texCoordVariable = `attributes.texCoord_${texCoord}`;
  const channels = textureReader.channels;

  let initializationLine = `metadata.${glslPropertyId} = texture2D(${uniformName}, ${texCoordVariable}).${channels};`;

  // Sometimes initialization will be need to be wrapped in an unpacking
  // function (e.g. convert from unsigned to signed)
  const unpackingSteps = property.getUnpackingSteps();
  for (let i = 0; i < unpackingSteps.length; i++) {
    initializationLine = unpackingSteps[i](initializationLine);
  }

  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    [initializationLine]
  );
}

export default MetadataPipelineStage;
