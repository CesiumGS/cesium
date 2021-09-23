void cpuStylingStage(inout vec3 positionMC, inout FeatureIdentification feature)
{
    vec4 featureColor = texture2D(model_batchTexture, feature.st);

    float show = ceil(featureColor.a);
    positionMC *= show;

    feature.color = featureColor;
}