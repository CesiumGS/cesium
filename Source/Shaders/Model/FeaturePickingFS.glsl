#ifdef VTF_SUPPORTED
// When VTF is supported, per-feature show/hide already happened in the fragment shader
uniform sampler2D model_pickTexture;
varying vec2 model_featureSt;
varying vec4 model_featureColor;
vec4 featurePicking(vec4 color)
{
    // TODO: What is the old tile_color() doing really?
    //model_color(model_featureColor);

    #ifdef HAS_PREMULTIPLIED_ALPHA
    color.rgb *= color.a;
    #endif

    return color;
}
#else
// VTF not supported

#ifdef HANDLE_TRANSLUCENT
uniform bool model_translucentCommand;
#endif

uniform sampler2D model_pickTexture;
uniform sampler2D model_batchTexture;
varying vec2 model_featureSt;
vec4 featurePicking(vec4 color)
{
    vec4 featureProperties = texture2D(model_batchTexture, model_featureSt);
    if (featureProperties.a == 0.0) { // show: alpha == 0 - false, non-zeo - true
        discard;
    }
    
    #ifdef HANDLE_TRANSLUCENT
    bool isStyleTranslucent = featureProperties.a != 1.0;
    if (czm_pass == czm_passTranslucent && !isStyleTranslucent && !model_translucentCommand)
    {
        // Do not render opaque features in the translucent pass
        discard;   
    }
    else
    {
        if (isStyleTranslucent) // Do not render translucent features in the opaque pass
        {
            discard;
        }
    }
    #endif

    //model_color(featureProperties);

    #ifdef HAS_PREMULTIPLIED_ALPHA
    color.rgb *= color.a;
    #endif

    return color;
}
#endif