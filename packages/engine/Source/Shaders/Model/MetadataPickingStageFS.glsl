
/**
 * A function that is called in ModelFS.glsl when the METADATA_PICKING
 * define was set. It will be called after the `metadataStage`, and
 * fill a vec4 with property values from the `Metadata` struct. 
 * The properties are selected via the METADATA_PICKING_PROPERTY_NAME
 * define.
 */
void metadataPickingStage(
    Metadata metadata,
    MetadataClass metadataClass,
    inout vec4 metadataValues
) {
    float value = float(metadata.METADATA_PICKING_PROPERTY_NAME);
    metadataValues.x = value / 255.0;
    metadataValues.y = 0.0;
    metadataValues.z = 0.0;
    metadataValues.w = 0.0;
}
