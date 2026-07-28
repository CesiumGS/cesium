void modelVectorLookupStage(inout vec4 color)
{
    // Drape clamped vector data onto the model surface. Fill composites
    // before strokes; both functions no-op when their lookup textures are
    // 1x1 placeholders.
    color = vectorPolygonRender(v_vectorUv, color);
    color = vectorPolylineRender(v_vectorUv, color);
}
