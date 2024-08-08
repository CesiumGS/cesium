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
  frameState
) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "METADATA_PICKING_VALUE_TYPE",
    "float",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addDefine(
    "METADATA_PICKING_VALUE_STRING",
    "0.0",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addDefine(
    "METADATA_PICKING_VALUE_COMPONENT_X",
    "0.0",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addDefine(
    "METADATA_PICKING_VALUE_COMPONENT_Y",
    "0.0",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addDefine(
    "METADATA_PICKING_VALUE_COMPONENT_Z",
    "0.0",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addDefine(
    "METADATA_PICKING_VALUE_COMPONENT_W",
    "0.0",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFunction(
    "metadataPickingStage",
    "void metadataPickingStage(Metadata metadata, MetadataClass metadataClass, inout vec4 metadataValues)",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFunctionLines(
    "metadataPickingStage",
    [
      "METADATA_PICKING_VALUE_TYPE value = METADATA_PICKING_VALUE_TYPE(METADATA_PICKING_VALUE_STRING);",
      "metadataValues.x = METADATA_PICKING_VALUE_COMPONENT_X;",
      "metadataValues.y = METADATA_PICKING_VALUE_COMPONENT_Y;",
      "metadataValues.z = METADATA_PICKING_VALUE_COMPONENT_Z;",
      "metadataValues.w = METADATA_PICKING_VALUE_COMPONENT_W;",
    ],
    ShaderDestination.FRAGMENT
  );
};

export default MetadataPickingPipelineStage;
