void cpuStylingStage(inout vec4 color, inout FeatureIdentification feature)
{
    #ifdef FEATURE_ID_TEXTURE

    // Read color from the batch texture.
    vec4 featureColor = texture2D(model_batchTexture, feature.st);
    // Discard, if show is false.
    float show = ceil(featureColor.a);
    if (show == 0.0) {
        discard;
    }
    color = featureColor;

    #elif defined(FEATURE_ID_ATTRIBUTE)

    color = feature.color;

    #else
    
    color.rgb = mix(color.rgb, model_color.rgb, model_colorBlend);
    float highlight = ceil(model_colorBlend);
    color.rgb *= mix(model_color.rgb, vec3(1.0), highlight);
    color.a *= model_color.a;
    
    #endif
}
