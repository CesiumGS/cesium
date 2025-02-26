void modelSplitterStage()
{
    // Don't split when rendering the shadow map, because it is rendered from
    // the perspective of a totally different camera.
#ifndef SHADOW_MAP
    if (model_splitDirection < 0.0 && gl_FragCoord.x > czm_splitPosition) discard;
    if (model_splitDirection > 0.0 && gl_FragCoord.x < czm_splitPosition) discard;
#endif
}
