void filterByPassType(inout vec3 positionMC, vec4 featureColor)
{
    bool styleTranslucent = (featureColor.a != 1.0);
    // Only render translucent features in the translucent pass (if the style or the original command has translucency).
    if (czm_pass == czm_passTranslucent && !styleTranslucent && !model_commandTranslucent)
    {
        positionMC *= 0.0;
    }
    // If the current pass is not the transluceny pass and the style is not translucent, don't rendeer the feature.
    else if (czm_pass != czm_passTranslucent && styleTranslucent)
    {
        positionMC *= 0.0;
    }
}

void cpuStylingStage(inout vec3 positionMC, inout SelectedFeature feature)
{
    float show = ceil(feature.color.a);
    positionMC *= show;

    #ifdef HAS_SELECTED_FEATURE_ID_ATTRIBUTE
    filterByPassType(positionMC, feature.color);
    #endif
}
