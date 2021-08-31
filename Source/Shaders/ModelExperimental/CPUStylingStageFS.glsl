vec4 cpuStylingStage(vec4 color)
{
    #ifdef FEATURE_STYLING

    color = model_featureColor;

    #else
    
    color.rgb = mix(color.rgb, model_color.rgb, model_colorBlend);
    float highlight = ceil(model_colorBlend);
    color.rgb *= mix(model_color.rgb, vec3(1.0), highlight);
    color.a *= model_color.a;
    
    #endif

    return color;
}
