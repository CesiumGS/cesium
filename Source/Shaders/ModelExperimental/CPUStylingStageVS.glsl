void cpuStylingStage(inout vec3 positionMC, inout FeatureIdentification feature)
{
    vec4 featureColor = texture2D(model_batchTexture, feature.st);
    feature.color = featureColor;

    // Used to show/hide the feature.
    float show = ceil(featureColor.a);
    positionMC *= show;

    // Render features in the correct pass.
    filterByPassType(positionMC);
}

void filterByPassType(inout vec3 positionMC)
{
    bool styleTranslucent = (featureColor.a != 1.0);

    if (czm_pass == czm_passTranslucent)
    {
        // Only render translucent features in the translucent pass (if the style or the original command has trasnlucency).
        if (!styleTranslucent && !model_commandTranslucent)
        {
            positionMC *= 0.0;
        }
    }
    else
    {
        // Only render opaque featuers in the opaque pass.
        if (styleTranslucent)
        {
            positionMC *= 0.0;
        }
    }
}
