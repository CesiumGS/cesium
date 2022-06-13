void silhouetteStage(out vec4 color) {
    color = czm_gammaCorrect(model_silhouetteColor);
}