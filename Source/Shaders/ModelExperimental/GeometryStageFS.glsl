void geometryStage(out ProcessedAttributes attributes)
{
  attributes.positionMC = v_positionMC;
  attributes.positionEC = v_positionEC;

  #ifdef COMPUTE_POSITION_WC
  attributes.positionWC = v_positionWC;
  #endif

  #ifdef HAS_NORMALS
  // renormalize after interpolation
  attributes.normal = normalize(v_normal);
  #endif

  #ifdef HAS_TANGENTS
  attributes.tangent = normalize(v_tangent);
  #endif

  #ifdef HAS_BITANGENTS
  attributes.bitangent = normalize(v_bitangent);
  #endif

  // Everything else is dynamically generated in GeometryPipelineStage
  setDynamicVaryings(attributes);
}
