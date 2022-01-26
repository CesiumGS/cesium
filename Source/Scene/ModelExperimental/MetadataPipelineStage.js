import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import MetadataStageFS from "../../Shaders/ModelExperimental/MetadataStageFS.js";
import MetadataStageVS from "../../Shaders/ModelExperimental/MetadataStageVS.js";

var MetadataPipelineStage = {};
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
  var shaderBuilder = renderResources.shaderBuilder;

  // Always declare structs, even if not used
  declareStructsAndFunctions(shaderBuilder);
  shaderBuilder.addVertexLines([MetadataStageVS]);
  shaderBuilder.addFragmentLines([MetadataStageFS]);

  var featureMetadata = renderResources.model.featureMetadata;
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
  var propertyTextures = featureMetadata.propertyTextures;
  var shaderBuilder = renderResources.shaderBuilder;

  for (var i = 0; i < propertyTextures.length; i++) {
    var propertyTexture = propertyTextures[i];
    // example: u_propertyTexture_0
    var uniformName = "u_propertyTexture_" + i;
    addPropertyTextureUniform(renderResources, uniformName, propertyTexture);

    // need to add a uniform
    var properties = propertyTexture.properties;
    for (var propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        var property = properties[propertyId];
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

// TODO: This is a temporary hack. PropertyTexture and PropertyTextureProperty
// need some reworking to avoid property textures spread across multiple
// textures
function getFirstProperty(propertyTexture) {
  var propertyId = Object.keys(propertyTexture.properties)[0];
  return propertyTexture.properties[propertyId];
}

function addPropertyTextureUniform(
  renderResources,
  uniformName,
  propertyTexture
) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addUniform(
    "sampler2D",
    uniformName,
    ShaderDestination.FRAGMENT
  );

  var firstProperty = getFirstProperty(propertyTexture);

  var uniformMap = renderResources.uniformMap;
  uniformMap[uniformName] = function () {
    return firstProperty.textureReader.texture;
  };
}

function addPropertyTextureProperty(
  shaderBuilder,
  uniformName,
  propertyId,
  property
) {
  var glslType = property.getGlslType();

  // for use in the shader, the property ID must be a valid GLSL identifier,
  // so replace invalid characters with _
  var glslPropertyId = propertyId.replaceAll(/[^_a-zA-Z0-9]+/g, "_");

  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA_FS,
    glslType,
    glslPropertyId
  );

  // Insert the texture read.
  // Example:
  // metadata.<property> = texture2D(u_propertyTexture_<n>, <texCoords>).<channels>;
  var textureReader = property.textureReader;
  var texCoord = textureReader.texCoord;
  var texCoordVariable = "attributes.texCoord_" + texCoord;
  var channels = textureReader.channels;

  // TODO: Sometimes initialization will be need to be wrapped in an unpacking
  // function (e.g. convert from unsigned to signed)
  var initializationLine =
    "metadata." +
    glslPropertyId +
    " = texture2D(" +
    uniformName +
    ", " +
    texCoordVariable +
    ")." +
    channels +
    ";";

  shaderBuilder.addFunctionLines(
    MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
    [initializationLine]
  );
}

export default MetadataPipelineStage;
