vec2 computeSt(float featureId)
{
    float stepX = model_textureStep.x;
    float centerX = model_textureStep.y;

    #ifdef MULTILINE_BATCH_TEXTURE
    float stepY = model_textureStep.z;
    float centerY = model_textureStep.w;

    float xId = mod(featureId, model_textureDimensions.x); 
    float yId = floor(featureId / model_textureDimensions.x);
    
    return vec2(centerX + (xId * stepX), centerY + (yId * stepY));
    #else
    return vec2(centerX + (featureId * stepX), 0.5);
    #endif
}

void selectedFeatureIdStage(out SelectedFeature feature, FeatureIds featureIds)
{   
    int featureId = featureIds.SELECTED_FEATURE_ID;

    #ifdef HAS_NULL_FEATURE_ID
    // if featureID == nullFeatureID { do whatever the null case did }
    #endif


    if (featureId < model_featuresLength)
    {
        vec2 featureSt = computeSt(float(featureId));

        feature.id = int(featureId);
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
        feature.id = int(model_featuresLength) + 1;
        feature.st = vec2(0.0);
        feature.color = vec4(1.0);
    }
}
