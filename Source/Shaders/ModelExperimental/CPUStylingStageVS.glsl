void cpuStylingStage(inout vec3 position)
{
    vec4 featureProperties = texture2D(model_batchTexture, v_featureSt);
    float show = ceil(featureProperties.a);
    position *= show;

    v_featureColor = featureProperties;
}