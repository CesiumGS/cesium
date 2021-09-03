void featureStage()
{
    float featureId = FEATURE_ID_ATTRIBUTE;
    if (featureId < model_featuresLength)
    {
        model_featureId = featureId;
        model_featureSt = computeSt(featureId);
    }
    else
    {
        model_featureId = model_featuresLength + 1.0;
    }
}
