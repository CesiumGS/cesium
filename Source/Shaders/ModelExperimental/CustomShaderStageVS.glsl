vec3 customShaderStage(vec3 position) {
  // initizeInputStruct() is dynamically generated in JS, 
  // see CustomShaderStage.js
  VertexInput vsInput;
  initializeInputStruct(vsInput);

  return vertexMain(vsInput, position);
}