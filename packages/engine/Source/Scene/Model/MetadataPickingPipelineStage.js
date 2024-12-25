import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The MetadataPickingPipelineStage is inserting the
 * metadataPickingStage function into the shader code,
 * including the 'defines' that will be filled with
 * the proper values for metadata picking in the
 * 'DerivedCommands'
 *
 * @namespace MetadataPickingPipelineStage
 * @private
 */
const MetadataPickingPipelineStage = {
  name: "MetadataPickingPipelineStage", // Helps with debugging

  // The identifiers for 'define' directives that are inserted into the
  // shader code. The values of these defines will be be assigned
  // in the `DerivedCommands` class when a derived command for metadata
  // picking is created.
  METADATA_PICKING_ENABLED: "METADATA_PICKING_ENABLED",
  METADATA_PICKING_VALUE_TYPE: "METADATA_PICKING_VALUE_TYPE",
  METADATA_PICKING_VALUE_STRING: "METADATA_PICKING_VALUE_STRING",
  METADATA_PICKING_VALUE_COMPONENT_X: "METADATA_PICKING_VALUE_COMPONENT_X",
  METADATA_PICKING_VALUE_COMPONENT_Y: "METADATA_PICKING_VALUE_COMPONENT_Y",
  METADATA_PICKING_VALUE_COMPONENT_Z: "METADATA_PICKING_VALUE_COMPONENT_Z",
  METADATA_PICKING_VALUE_COMPONENT_W: "METADATA_PICKING_VALUE_COMPONENT_W",
};

/**
 * Process a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>adds the required defines and "metadataPickingStage" to function in the shader</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 */
MetadataPickingPipelineStage.process = function (
  renderResources,
  primitive,
  frameState,
) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_TYPE,
    "float",
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addDefine(
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_STRING,
    "0.0",
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addDefine(
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_X,
    "0.0",
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addDefine(
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_Y,
    "0.0",
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addDefine(
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_Z,
    "0.0",
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addDefine(
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_W,
    "0.0",
    ShaderDestination.FRAGMENT,
  );

  shaderBuilder.addFunction(
    "metadataPickingStage",
    "void metadataPickingStage(Metadata metadata, MetadataClass metadataClass, inout vec4 metadataValues)",
    ShaderDestination.FRAGMENT,
  );

  shaderBuilder.addFunctionLines(
    "metadataPickingStage",
    [
      `${MetadataPickingPipelineStage.METADATA_PICKING_VALUE_TYPE} value = ${MetadataPickingPipelineStage.METADATA_PICKING_VALUE_TYPE}(${MetadataPickingPipelineStage.METADATA_PICKING_VALUE_STRING});`,
      `metadataValues.x = ${MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_X};`,
      `metadataValues.y = ${MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_Y};`,
      `metadataValues.z = ${MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_Z};`,
      `metadataValues.w = ${MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_W};`,
    ],
    ShaderDestination.FRAGMENT,
  );
};

export default MetadataPickingPipelineStage;
