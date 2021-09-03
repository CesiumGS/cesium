float featureId;
vec2 featureSt;

void featureStage()
{
    #ifdef FEATURE_ID_TEXTURE
    featureId = floor(texture2D(FEATURE_ID_TEXTURE, FEATURE_ID_TEXCOORD).FEATURE_ID_CHANNEL * 255.0 + 0.5);
    if (featureId < model_featuresLength)
    {
        featureSt = computeSt(featureId);
    }
    else
    {
        featureId = model_featuresLength + 1.0;
    }
    #else
    featureId = model_featureId;
    featureSt = model_featureSt;
    #endif
}
