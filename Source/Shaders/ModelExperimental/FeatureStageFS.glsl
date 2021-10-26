void featureStage(inout Feature feature)
{   

    #ifdef FEATURE_ID_TEXTURE
    
    float featureId = floor(texture2D(FEATURE_ID_TEXTURE, FEATURE_ID_TEXCOORD).FEATURE_ID_CHANNEL * 255.0 + 0.5);
    vec2 featureSt;
    if (featureId < model_featuresLength)
    {
        featureSt = computeSt(featureId);

        feature.id = featureId;
        feature.st = featureSt;
        feature.color = texture2D(model_batchTexture, featureSt);
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
    #else
    // For feature ID vertex attributes, the function generated in FeatureIdPipelineStage 
    // is used to update the Feature struct from the varyings passed in.
    updateFeatureStruct(feature);
    #endif
}
