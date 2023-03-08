//This file is automatically rebuilt by the Cesium build process.
export default "void customShaderStage(\n\
    inout czm_modelVertexOutput vsOutput, \n\
    inout ProcessedAttributes attributes, \n\
    FeatureIds featureIds,\n\
    Metadata metadata,\n\
    MetadataClass metadataClass,\n\
    MetadataStatistics metadataStatistics\n\
) {\n\
    // VertexInput and initializeInputStruct() are dynamically generated in JS, \n\
    // see CustomShaderPipelineStage.js\n\
    VertexInput vsInput;\n\
    initializeInputStruct(vsInput, attributes);\n\
    vsInput.featureIds = featureIds;\n\
    vsInput.metadata = metadata;\n\
    vsInput.metadataClass = metadataClass;\n\
    vsInput.metadataStatistics = metadataStatistics;\n\
    vertexMain(vsInput, vsOutput);\n\
    attributes.positionMC = vsOutput.positionMC;\n\
}\n\
";
