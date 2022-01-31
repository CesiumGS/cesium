void customShaderStage(
    inout czm_modelMaterial material,
    ProcessedAttributes attributes,
    FeatureIds featureIds
) {
    // FragmentInput and initializeInputStruct() are dynamically generated in JS, 
    // see CustomShaderPipelineStage.js
    FragmentInput fsInput;
    initializeInputStruct(fsInput, attributes);
    fsInput.featureIds = featureIds;
    fragmentMain(fsInput, material);
}
