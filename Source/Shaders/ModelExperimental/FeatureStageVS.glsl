// This stage is only applied for Feature ID vertex attributes.
// If Feature ID textures are present, those are used in the fragment shader.
void featureStage(inout FeatureIdentification feature)
{
    float featureId = FEATURE_ID_ATTRIBUTE;
    if (featureId < model_featuresLength)
    {
        feature.id = featureId;
        feature.st = computeSt(featureId);
    }
    // Floating point comparisons can be unreliable in GLSL, so we
    // increment the v_activeFeatureId to make sure it's always greater
    // then the model_featuresLength - a condition we check for in the
    // pick ID, to avoid sampling the pick texture if the feature ID is
    // greater than the number of features.
    else
    {
        feature.id = model_featuresLength + 1.0;
    }
}
