#ifdef VTF_SUPPORTED
// When VTF is supported, perform per-feature show/hide in the vertex shader
#ifdef HANDLE_TRANSLUCENT
uniform bool model_translucentCommand;
#endif

uniform sampler2D model_batchTexture;
varying vec4 model_featureColor;
varying vec2 model_featureSt;

vec3 featurePicking(vec3 position)
{
    vec2 st = computeSt(BATCH_ID_ATTRIBUTE);
    vec4 featureProperties = texture2D(model_batchTexture, st);
    // TODO: Coloring in the vertex shader
    //model_color(featureProperties);
    float show = ceil(featureProperties.a); // 0 - false, non-zeo - true
    position *= show; // Per-feature show/hide
    
    #ifdef HANDLE_TRANSLUCENT
    bool isStyleTranslucent = (featureProperties.a != 1.0);
    if (czm_pass == czm_passTranslucent && !isStyleTranslucent && !model_translucentCommand)
    {
        // Do not render opaque features in the translucent pass
        position *= 0.0;
    }
    else if (isStyleTranslucent) // Do not render translucent features in the opaque pass
    {
        position *= 0.0;
    }
    #endif

    model_featureColor = featureProperties;
    model_featureSt = st;
    return position;
}
#else
// When VTF is not supported, color blend mode MIX will look incorrect due to the feature's color not being available in the vertex shader
varying vec2 model_featureSt;
vec3 featurePicking(vec3 position)
{
    // TODO: coloring in the vertex shaders
    //model_color(vec4(1.0));
    model_featureSt = computeSt(BATCH_ID_ATTRIBUTE);
    return position;
}
#endif