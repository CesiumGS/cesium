void filterByPassType(vec4 featureColor)
{
    bool styleTranslucent = (featureColor.a != 1.0);
    // Only render translucent features in the translucent pass (if the style or the original command has translucency).
    if (czm_pass == czm_passTranslucent && !styleTranslucent && !model_commandTranslucent)
    {
        discard;
    }
    // If the current pass is not the translucent pass and the style is not translucent, don't render the feature.
    else if (czm_pass != czm_passTranslucent && styleTranslucent)
    {
        discard;
    }
}

void cpuStylingStage(inout czm_modelMaterial material, Feature feature)
{
    vec4 featureColor = feature.color;

    if (featureColor.a == 0.0)
    {
        discard;
    }

    // If a feature ID vertex attribute is used, the pass type filter is applied in the vertex shader.
    // So, we only apply in in the fragment shader if the feature ID texture is used.
    #ifdef FEATURE_ID_TEXTURE
    filterByPassType(featureColor);
    #endif

    featureColor = czm_gammaCorrect(featureColor);

    float highlight = ceil(model_colorBlend);
    material.diffuse *= mix(featureColor.rgb, vec3(1.0), highlight);
    material.alpha *= featureColor.a;
}
