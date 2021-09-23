void cpuStylingStage(inout vec4 color, inout FeatureIdentification feature)
{
    #ifdef FEATURE_ID_TEXTURE

    vec4 featureColor = texture2D(model_batchTexture, feature.st);
    color = featureColor;

    // Used to show/hide the feature.
    float show = ceil(featureColor.a);
    if (show == 0.0) {
        discard;
    }
    
    #elif defined(FEATURE_ID_ATTRIBUTE)

    color = feature.color;

    #else
    
    color.rgb = mix(color.rgb, model_color.rgb, model_colorBlend);
    float highlight = ceil(model_colorBlend);
    color.rgb *= mix(model_color.rgb, vec3(1.0), highlight);
    color.a *= model_color.a;
    
    #endif
}
