vec4 cpuStylingStage(vec4 color)
{
    #if !defined(FEATURE_ID_TEXTURE) && !defined(FEATURE_ID_ATTRIBUTE)
    vec4 featureProperties = texture2D(model_batchTexture, featureSt);
    float show = ceil(featureProperties.a);
    if (show == 0.0) {
        discard;
    }

    #elif defined(FEATURE_ID_ATTRIBUTE)
    color = model_featureColor;
    #else
    
    color.rgb = mix(color.rgb, model_color.rgb, model_colorBlend);
    float highlight = ceil(model_colorBlend);
    color.rgb *= mix(model_color.rgb, vec3(1.0), highlight);
    color.a *= model_color.a;
    
    #endif

    return color;
}
