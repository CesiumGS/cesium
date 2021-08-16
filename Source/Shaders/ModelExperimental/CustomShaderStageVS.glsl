vec3 customShaderStage(vec3 position) {
  // VertexInput and initializeInputStruct() are dynamically generated in JS, 
  // see CustomShaderStage.js
  VertexInput vsInput;
  initializeInputStruct(vsInput);

  // needed so the fragment shader can set fsInput.referenceFrame.positionWC
  // Note that this is a 32-bit position which may result in jitter on small
  // scales.
  v_positionWC = (czm_model * vec4(position, 1.0)).xyz;

  return vertexMain(vsInput, position);
}