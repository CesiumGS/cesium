void modelClippingPolygonsStage()
{
    // The lookup uv was computed per vertex in the vertex stage and
    // interpolated across the primitive, so the fragment shader only samples it.
    bool insideAny = vectorClip(v_clippingUv);

#ifdef CLIPPING_INVERSE
    if (!insideAny)
    {
        discard;
    }
#else
    if (insideAny)
    {
        discard;
    }
#endif
}
