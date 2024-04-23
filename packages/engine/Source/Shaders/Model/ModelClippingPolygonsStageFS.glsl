void modelClippingPolygonsStage()
{
  float threshold = 0.25;
  if (v_minDistance.x <= threshold && v_minDistance.y <= threshold) {
    vec2 clippingPosition = v_clippingPosition;
    int regionIndex = v_regionIndex;
    czm_clipPolygons(model_clippingDistance, CLIPPING_POLYGON_REGIONS_LENGTH, clippingPosition, regionIndex);
  }
  #ifdef CLIPPING_INVERSE 
  else {
      discard;
  }
  #endif
}
