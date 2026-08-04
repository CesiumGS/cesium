void modelVectorLookupStage(inout vec4 color)
{
    // Fills composite before strokes. Both no-op against 1x1 placeholder textures.
    color = vectorPolygonRender(v_vectorUv, color);
    color = vectorPolylineRender(v_vectorUv, color);
}
