void customShaderStage(
    inout czm_modelVertexOutput vsOutput, 
    inout ProcessedAttributes attributes, 
    FeatureIds featureIds
) {
    // VertexInput and initializeInputStruct() are dynamically generated in JS, 
    // see CustomShaderPipelineStage.js
    VertexInput vsInput;
    initializeInputStruct(vsInput, attributes);
    vsInput.featureIds = featureIds;
    vertexMain(vsInput, vsOutput);
    attributes.positionMC = vsOutput.positionMC;
}
