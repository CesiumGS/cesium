void geometryStage(out ProcessedAttributes attributes)
{
  attributes.positionMC = v_positionMC;
  attributes.positionEC = v_positionEC;

  #ifdef COMPUTE_POSITION_WC
  attributes.positionWC = v_positionWC;
  #endif

  #ifdef HAS_NORMALS
  // renormalize after interpolation
  attributes.normalEC = normalize(v_normalEC);
  #endif

  #ifdef HAS_TANGENTS
  attributes.tangentEC = normalize(v_tangentEC);
  #endif

  #ifdef HAS_BITANGENTS
  attributes.bitangentEC = normalize(v_bitangentEC);
  #endif

  // Everything else is dynamically generated in GeometryPipelineStage
  setDynamicVaryings(attributes);
}
