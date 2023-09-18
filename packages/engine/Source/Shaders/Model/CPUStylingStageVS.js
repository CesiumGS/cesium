//This file is automatically rebuilt by the Cesium build process.
export default "void filterByPassType(inout vec3 positionMC, vec4 featureColor)\n\
{\n\
    bool styleTranslucent = (featureColor.a != 1.0);\n\
    // Only render translucent features in the translucent pass (if the style or the original command has translucency).\n\
    if (czm_pass == czm_passTranslucent && !styleTranslucent && !model_commandTranslucent)\n\
    {\n\
        // If the model has a translucent silhouette, it needs to render during the silhouette color command,\n\
        // (i.e. the command where model_silhouettePass = true), even if the model isn't translucent.\n\
        #ifdef HAS_SILHOUETTE\n\
        positionMC *= float(model_silhouettePass);\n\
        #else\n\
        positionMC *= 0.0;\n\
        #endif\n\
    }\n\
    // If the current pass is not the translucent pass and the style is not translucent, don't render the feature.\n\
    else if (czm_pass != czm_passTranslucent && styleTranslucent)\n\
    {\n\
        positionMC *= 0.0;\n\
    }\n\
}\n\
\n\
void cpuStylingStage(inout vec3 positionMC, inout SelectedFeature feature)\n\
{\n\
    float show = ceil(feature.color.a);\n\
    positionMC *= show;\n\
\n\
    #if defined(HAS_SELECTED_FEATURE_ID_ATTRIBUTE) && !defined(HAS_CLASSIFICATION)\n\
    filterByPassType(positionMC, feature.color);\n\
    #endif\n\
}\n\
";
