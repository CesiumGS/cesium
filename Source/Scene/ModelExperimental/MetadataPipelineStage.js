import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import MetadataStageFS from "../../Shaders/ModelExperimental/MetadataStageFS.js";
import MetadataStageVS from "../../Shaders/ModelExperimental/MetadataStageVS.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

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

  const structuralMetadata = renderResources.model.structuralMetadata;
  if (!defined(structuralMetadata)) {
    return;
  }

  processPropertyAttributes(renderResources, primitive, structuralMetadata);
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

  // TODO: Is it safe to assume that the attribute type matches the final GLSL
  // type? in particular, is normalization handled properly?
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

function addValueTransformUniforms(valueExpression, options) {
  const metadataVariable = options.metadataVariable;
  const offsetUniformName = `u_${metadataVariable}_offset`;
  const scaleUniformName = `u_${metadataVariable}_scale`;

  const renderResources = options.renderResources;
  const shaderBuilder = renderResources.shaderBuilder;
  const glslType = options.glslType;
  shaderBuilder.addUniform(glslType, offsetUniformName, ShaderDestination.BOTH);
  shaderBuilder.addUniform(glslType, scaleUniformName, ShaderDestination.BOTH);

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

export default MetadataPipelineStage;
