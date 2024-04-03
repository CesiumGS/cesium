void modelClippingPolygonsStage()
{
  vec2 clippingPosition = v_clippingPositionAndRegionIndex.xy;
  int regionIndex = int(floor(v_clippingPositionAndRegionIndex.z));
  vec2 clippingDistanceTextureDimensions = vec2(CLIPPING_DISTANCE_TEXTURE_WIDTH, CLIPPING_DISTANCE_TEXTURE_HEIGHT);
  czm_clipPolygons(model_clippingDistance, clippingDistanceTextureDimensions, CLIPPING_POLYGON_REGIONS_LENGTH, clippingPosition, regionIndex);
}
