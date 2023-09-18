//This file is automatically rebuilt by the Cesium build process.
export default "void filterByPassType(vec4 featureColor)\n\
{\n\
    bool styleTranslucent = (featureColor.a != 1.0);\n\
    // Only render translucent features in the translucent pass (if the style or the original command has translucency).\n\
    if (czm_pass == czm_passTranslucent && !styleTranslucent && !model_commandTranslucent)\n\
    {   \n\
        // If the model has a translucent silhouette, it needs to render during the silhouette color command,\n\
        // (i.e. the command where model_silhouettePass = true), even if the model isn't translucent.\n\
        #ifdef HAS_SILHOUETTE\n\
        if(!model_silhouettePass) {\n\
            discard;\n\
        }\n\
        #else\n\
        discard;\n\
        #endif\n\
    }\n\
    // If the current pass is not the translucent pass and the style is not translucent, don't render the feature.\n\
    else if (czm_pass != czm_passTranslucent && styleTranslucent)\n\
    {\n\
        discard;\n\
    }\n\
}\n\
\n\
void cpuStylingStage(inout czm_modelMaterial material, SelectedFeature feature)\n\
{\n\
    vec4 featureColor = feature.color;\n\
    if (featureColor.a == 0.0)\n\
    {\n\
        discard;\n\
    }\n\
\n\
    // If a feature ID vertex attribute is used, the pass type filter is applied in the vertex shader.\n\
    // So, we only apply in in the fragment shader if the feature ID texture is used.\n\
    #if defined(HAS_SELECTED_FEATURE_ID_TEXTURE) && !defined(HAS_CLASSIFICATION)\n\
    filterByPassType(featureColor);\n\
    #endif\n\
\n\
    featureColor = czm_gammaCorrect(featureColor);\n\
\n\
    // Classification models compute the diffuse differently.\n\
    #ifdef HAS_CLASSIFICATION\n\
    material.diffuse = featureColor.rgb * featureColor.a;\n\
    #else\n\
    float highlight = ceil(model_colorBlend);\n\
    material.diffuse *= mix(featureColor.rgb, vec3(1.0), highlight);\n\
    #endif\n\
    \n\
    material.alpha *= featureColor.a;\n\
}\n\
";
