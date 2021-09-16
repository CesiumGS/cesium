float featureId;
vec2 featureSt;

vec4 cpuStylingStage(vec4 color)
{
    #ifdef FEATURE_ID_TEXTURE
    // Read color from the batch texture.
    vec4 featureProperties = texture2D(model_batchTexture, featureSt);
    // Discard, if show is false.
    float show = ceil(featureProperties.a);
    if (show == 0.0) {
        discard;
    }
    color = featureProperties;

    #elif defined(FEATURE_ID_ATTRIBUTE)
    color = v_featureColor;
    #else
    
    color.rgb = mix(color.rgb, model_color.rgb, model_colorBlend);
    float highlight = ceil(model_colorBlend);
    color.rgb *= mix(model_color.rgb, vec3(1.0), highlight);
    color.a *= model_color.a;
    
    #endif

    return color;
}
