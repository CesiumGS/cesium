void silhouetteStage(out vec4 color) {
    if(model_silhouettePass > 0.0) {
        color = czm_gammaCorrect(model_silhouetteColor);
    }
}