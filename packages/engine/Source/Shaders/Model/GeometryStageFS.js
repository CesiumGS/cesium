//This file is automatically rebuilt by the Cesium build process.
export default "void geometryStage(out ProcessedAttributes attributes)\n\
{\n\
  attributes.positionMC = v_positionMC;\n\
  attributes.positionEC = v_positionEC;\n\
\n\
  #ifdef COMPUTE_POSITION_WC_CUSTOM_SHADER\n\
  attributes.positionWC = v_positionWC;\n\
  #endif\n\
\n\
  #ifdef HAS_NORMALS\n\
  // renormalize after interpolation\n\
  attributes.normalEC = normalize(v_normalEC);\n\
  #endif\n\
\n\
  #ifdef HAS_TANGENTS\n\
  attributes.tangentEC = normalize(v_tangentEC);\n\
  #endif\n\
\n\
  #ifdef HAS_BITANGENTS\n\
  attributes.bitangentEC = normalize(v_bitangentEC);\n\
  #endif\n\
\n\
  // Everything else is dynamically generated in GeometryPipelineStage\n\
  setDynamicVaryings(attributes);\n\
}\n\
";
