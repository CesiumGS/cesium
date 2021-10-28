// This stage is only applied for Feature ID vertex attributes.
// If Feature ID textures are present, those are used in the fragment shader.
void featureStage(inout Feature feature)
{
    float featureId = FEATURE_ID_ATTRIBUTE;

    if (featureId < model_featuresLength)
    {
        vec2 featureSt = computeSt(featureId);

        feature.id = featureId;
        feature.st = featureSt;
        feature.color = texture2D(model_batchTexture, featureSt);
    }
    // Floating point comparisons can be unreliable in GLSL, so we
    // increment the feature ID to make sure it's always greater
    // then the model_featuresLength - a condition we check for in the
    // pick ID, to avoid sampling the pick texture if the feature ID is
    // greater than the number of features.
    else
    {
        feature.id = model_featuresLength + 1.0;
        feature.st = vec2(0.0);
        feature.color = vec4(1.0);
    }
}
