void customShaderStage(
    inout czm_modelMaterial material,
    ProcessedAttributes attributes,
    FeatureIds featureIds,
    Metadata metadata,
    MetadataClass metadataClass,
    MetadataStatistics metadataStatistics
) {
    // FragmentInput and initializeInputStruct() are dynamically generated in JS, 
    // see CustomShaderPipelineStage.js
    FragmentInput fsInput;
    initializeInputStruct(fsInput, attributes);
    fsInput.featureIds = featureIds;
    fsInput.metadata = metadata;
    fsInput.metadataClass = metadataClass;
    fsInput.metadataStatistics = metadataStatistics;
    fragmentMain(fsInput, material);
}
