vec3 cpuStylingStage(vec3 position)
{
    vec4 featureProperties = texture2D(model_batchTexture, model_featureSt);
    float show = ceil(featureProperties.a);
    position *= show;
    model_featureColor = featureProperties;
    return position;
}