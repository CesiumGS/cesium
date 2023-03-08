//This file is automatically rebuilt by the Cesium build process.
export default "vec2 computeSt(float featureId)\n\
{\n\
    float stepX = model_textureStep.x;\n\
    float centerX = model_textureStep.y;\n\
\n\
    #ifdef MULTILINE_BATCH_TEXTURE\n\
    float stepY = model_textureStep.z;\n\
    float centerY = model_textureStep.w;\n\
\n\
    float xId = mod(featureId, model_textureDimensions.x); \n\
    float yId = floor(featureId / model_textureDimensions.x);\n\
    \n\
    return vec2(centerX + (xId * stepX), centerY + (yId * stepY));\n\
    #else\n\
    return vec2(centerX + (featureId * stepX), 0.5);\n\
    #endif\n\
}\n\
\n\
void selectedFeatureIdStage(out SelectedFeature feature, FeatureIds featureIds)\n\
{   \n\
    int featureId = featureIds.SELECTED_FEATURE_ID;\n\
\n\
\n\
    if (featureId < model_featuresLength)\n\
    {\n\
        vec2 featureSt = computeSt(float(featureId));\n\
\n\
        feature.id = featureId;\n\
        feature.st = featureSt;\n\
        feature.color = texture2D(model_batchTexture, featureSt);\n\
    }\n\
    // Floating point comparisons can be unreliable in GLSL, so we\n\
    // increment the feature ID to make sure it's always greater\n\
    // then the model_featuresLength - a condition we check for in the\n\
    // pick ID, to avoid sampling the pick texture if the feature ID is\n\
    // greater than the number of features.\n\
    else\n\
    {\n\
        feature.id = model_featuresLength + 1;\n\
        feature.st = vec2(0.0);\n\
        feature.color = vec4(1.0);\n\
    }\n\
\n\
    #ifdef HAS_NULL_FEATURE_ID\n\
    if (featureId == model_nullFeatureId) {\n\
        feature.id = featureId;\n\
        feature.st = vec2(0.0);\n\
        feature.color = vec4(1.0);\n\
    }\n\
    #endif\n\
}\n\
";
