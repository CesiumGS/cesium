void featureStage(inout FeatureIdentification feature)
{
    #ifdef FEATURE_ID_TEXTURE
    float featureId = floor(texture2D(FEATURE_ID_TEXTURE, FEATURE_ID_TEXCOORD).FEATURE_ID_CHANNEL * 255.0 + 0.5);
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

    vec4 featureColor = texture2D(model_batchTexture, feature.st);
    feature.color = featureColor;

    #else
    // In the case of Feature ID vertex attributes, the id and st (and possibly color) are set in the vertex shader.
    // This function populated the FeatureIdentification struct with the info set in the vertex shader.
    updateFeatureIdStruct(feature);
    #endif
}
