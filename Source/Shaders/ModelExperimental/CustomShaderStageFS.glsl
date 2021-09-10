void customShaderStage(inout czm_modelMaterial material, ProcessedAttributes attributes) 
{
    // FragmentInput and initializeInputStruct() are dynamically generated in JS, 
    // see CustomShaderStage.js
    FragmentInput fsInput;
    initializeInputStruct(fsInput, attributes);
    fragmentMain(fsInput, material);
}
