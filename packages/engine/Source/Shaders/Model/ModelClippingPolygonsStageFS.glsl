void modelClippingPolygonsStage()
{
    vec2 clippingPosition = v_clippingPosition;
    int regionIndex = v_regionIndex;
    czm_clipPolygons(model_clippingDistance, CLIPPING_POLYGON_REGIONS_LENGTH, clippingPosition, regionIndex);
}
