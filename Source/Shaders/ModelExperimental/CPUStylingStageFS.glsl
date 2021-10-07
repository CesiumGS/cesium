void filterByPassType(vec4 featureColor)
{
    bool styleTranslucent = (featureColor.a != 1.0);

    if (czm_pass == czm_passTranslucent)
    {
        // Only render translucent features in the translucent pass (if the style or the original command has trasnlucency).
        if (!styleTranslucent && !model_commandTranslucent)
        {
            discard;
        }
    }
    else
    {
        // Only render opaque featuers in the opaque pass.
        if (styleTranslucent)
        {
            discard;
        }
    }
}

void cpuStylingStage(inout vec3 diffuse, inout float alpha, FeatureIdentification feature)
{

    if (feature.color.a == 0.0)
    {
        discard;
    }
    
    #ifndef FEATURE_ID_ATTRIBUTE
    // Filter rendering of features by translucency.
    filterByPassType(feature.color);
    // Blend model color with style color.
    #endif

    if (model_styleColorBlend == 0.0)
    {
        feature.color = czm_gammaCorrect(feature.color);
        alpha *= feature.color.a;
        float highlight = ceil(model_styleColorBlend);
        diffuse *= mix(feature.color.rgb, vec3(1.0), highlight);
    }
}
