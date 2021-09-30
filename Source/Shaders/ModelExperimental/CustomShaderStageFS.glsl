void customShaderStage(inout czm_modelMaterial material, ProcessedAttributes attributes) 
{
    // FragmentInput and initializeInputStruct() are dynamically generated in JS, 
    // see CustomShaderPipelineStage.js
    FragmentInput fsInput;
    initializeInputStruct(fsInput, attributes);
    fragmentMain(fsInput, material);
}

//#ifdef HAS_METADATA
void customShaderStage(inout czm_modelMaterial material, ProcessedAttributes attributes, inout Metadata metadata)
{
    FragmentInput fsInput;
    fsInput.metadata = metadata;
    initializeInputStruct(fsInput, attributes);
    fragmentMain(fsInput, material);
}
//#endif
