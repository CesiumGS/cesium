#ifdef VERTEX_TEXTURE_FETCH_SUPPORTED

varying vec2 model_featureSt;
varying vec4 model_featureColor;
uniform sampler2D model_batchTexture;

vec3 pickingStage(vec3 position)
{
    // By default, PickingStage will set this to FEATURE_ID_0
    vec2 st = computeSt(PICKING_ATTRIBUTE);
    vec4 featureColor = texture2D(model_batchTexture, st);

    // Per-feature show/hide
    float show = ceil(featureColor.a);
    position *= show;

    model_featureColor = featureColor;
    model_featureSt = st;

    return position;
}

#endif
