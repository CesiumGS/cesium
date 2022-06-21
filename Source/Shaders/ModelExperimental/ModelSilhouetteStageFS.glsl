void silhouetteStage(out vec4 color) {
    if(model_silhouettePass) {
        color = czm_gammaCorrect(model_silhouetteColor);
    }
}