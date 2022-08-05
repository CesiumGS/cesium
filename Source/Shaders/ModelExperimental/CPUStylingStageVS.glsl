void filterByPassType(inout vec3 positionMC, vec4 featureColor)
{
    bool styleTranslucent = (featureColor.a != 1.0);
    // Only render translucent features in the translucent pass (if the style or the original command has translucency).
    if (czm_pass == czm_passTranslucent && !styleTranslucent && !model_commandTranslucent)
    {
        // If the model has a translucent silhouette, it needs to render during the silhouette color command,
        // (i.e. the command where model_silhouettePass = true), even if the model isn't translucent.
        #ifdef HAS_SILHOUETTE
        positionMC *= float(model_silhouettePass);
        #else
        positionMC *= 0.0;
        #endif
    }
    // If the current pass is not the translucent pass and the style is not translucent, don't render the feature.
    else if (czm_pass != czm_passTranslucent && styleTranslucent)
    {
        positionMC *= 0.0;
    }
}

void cpuStylingStage(inout vec3 positionMC, inout SelectedFeature feature)
{
    float show = ceil(feature.color.a);
    positionMC *= show;

    #if defined(HAS_SELECTED_FEATURE_ID_ATTRIBUTE) && !defined(HAS_CLASSIFICATION)
    filterByPassType(positionMC, feature.color);
    #endif
}
