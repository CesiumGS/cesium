void customShaderStage(inout Attributes attributes) {
  #ifdef HAS_CUSTOM_VERTEX_SHADER  
  // VertexInput and initializeInputStruct() are dynamically generated in JS, 
  // see CustomShaderStage.js
  VertexInput vsInput;
  initializeInputStruct(vsInput);
  vertexMain(vsInput, attributes.positionMC);
  #endif
}
