//This file is automatically rebuilt by the Cesium build process.
export default "void silhouetteStage(inout vec4 color) {\n\
    if(model_silhouettePass) {\n\
        color = czm_gammaCorrect(model_silhouetteColor);\n\
    }\n\
}";
