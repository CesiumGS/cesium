void customShaderStage(
    inout czm_modelMaterial material,
    ProcessedAttributes attributes,
    FeatureIds featureIds,
    Metadata metadata,
    MetadataClass metadataClass
) {
    // FragmentInput and initializeInputStruct() are dynamically generated in JS, 
    // see CustomShaderPipelineStage.js
    FragmentInput fsInput;
    initializeInputStruct(fsInput, attributes);
    fsInput.featureIds = featureIds;
    fsInput.metadata = metadata;
    fsInput.metadataClass = metadataClass;
    fragmentMain(fsInput, material);
}
