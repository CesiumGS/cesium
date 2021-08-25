vec3 customShaderStage(vec3 position) {
  #ifdef COMPUTE_POSITION_WC
  // needed so the fragment shader can set fsInput.positionWC
  // Note that this is a 32-bit position which may result in jitter on small
  // scales.
  v_positionWC = (czm_model * vec4(position, 1.0)).xyz;
  #endif

  #ifdef HAS_CUSTOM_VERTEX_SHADER  
  // VertexInput and initializeInputStruct() are dynamically generated in JS, 
  // see CustomShaderStage.js
  VertexInput vsInput;
  initializeInputStruct(vsInput);

  return vertexMain(vsInput, position);
  #else
  return position;
  #endif
}
