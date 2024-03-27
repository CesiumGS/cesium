void modelClippingPolygonsStage()
{
    czm_clipPolygons(model_clippingExtents, model_clippingDistance, vec2(CLIPPING_EXTENTS_TEXTURE_WIDTH, CLIPPING_EXTENTS_TEXTURE_HEIGHT), vec2(CLIPPING_DISTANCE_TEXTURE_WIDTH, CLIPPING_DISTANCE_TEXTURE_HEIGHT), CLIPPING_POLYGONS_LENGTH, v_clippingPosition);
}
