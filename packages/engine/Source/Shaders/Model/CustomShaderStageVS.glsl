void customShaderStage(
    inout czm_modelVertexOutput vsOutput, 
    inout ProcessedAttributes attributes, 
    FeatureIds featureIds,
    Metadata metadata,
    MetadataClass metadataClass,
    MetadataStatistics metadataStatistics
) {
    // VertexInput and initializeInputStruct() are dynamically generated in JS, 
    // see CustomShaderPipelineStage.js
    VertexInput vsInput;
    initializeInputStruct(vsInput, attributes);
    vsInput.featureIds = featureIds;
    vsInput.metadata = metadata;
    vsInput.metadataClass = metadataClass;
    vsInput.metadataStatistics = metadataStatistics;
    vertexMain(vsInput, vsOutput);
    attributes.positionMC = vsOutput.positionMC;
}
