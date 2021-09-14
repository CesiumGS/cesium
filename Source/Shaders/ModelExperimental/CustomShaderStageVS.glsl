void customShaderStage(inout ProcessedAttributes attributes)
{
    // VertexInput and initializeInputStruct() are dynamically generated in JS, 
    // see CustomShaderPipelineStage.js
    VertexInput vsInput;
    initializeInputStruct(vsInput, attributes);
    vertexMain(vsInput, attributes.positionMC);
}
