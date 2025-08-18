void edgeVisibilityStage(
  inout ProcessedAttributes attributes
) {
  #ifdef HAS_EDGE_VISIBILITY
  // Replace the standard position with edge vertex position for edge rendering to make sure edge lines are drawn at the correct positions
  attributes.positionMC = a_edgeVertexPos;
  #endif
}
