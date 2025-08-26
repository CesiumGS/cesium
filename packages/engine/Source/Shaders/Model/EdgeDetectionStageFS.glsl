void edgeDetectionStage(inout vec4 color) {
    if (u_isEdgePass) {
        return;
    }

    vec2 screenCoord = gl_FragCoord.xy / czm_viewport.zw;

    vec4 edgeColor = texture(czm_edgeColorTexture, screenCoord);
    vec4 edgeId = texture(czm_edgeIdTexture, screenCoord);
    
    if (edgeId.r > 0.0) {
        color = edgeColor;
        return;
        float edgeFeatureId = edgeId.g;

        float currentFeatureId = 0.0;
        
        #ifdef HAS_FEATURE_IDS
            currentFeatureId = float(featureIds.featureId_0);
        #endif
        
        float featureIdDifference = abs(edgeFeatureId - currentFeatureId);
        
        if (featureIdDifference < 0.5) {
            color = edgeColor;
            return;
        }
    }
    
    /*
    float edgeDepth = texture(czm_globeDepthTexture, screenCoord).r;
    float fragmentDepth = gl_FragCoord.z;
    
    if (edgeId.a > 0.0 && abs(fragmentDepth - edgeDepth) < czm_edgeDepthTolerance) {
        discard;
    }
    */
}