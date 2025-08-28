void edgeDetectionStage(inout vec4 color, inout FeatureIds featureIds) {
    if (u_isEdgePass) {
        return;
    }

    vec2 screenCoord = gl_FragCoord.xy / czm_viewport.zw;

    vec4 edgeColor = texture(czm_edgeColorTexture, screenCoord);
    vec4 edgeId = texture(czm_edgeIdTexture, screenCoord);
    
    if (edgeId.r > 0.0) {
        color = edgeColor;
        float edgeFeatureId = edgeId.g;
        float currentFeatureId = float(featureIds.featureId_0);
        float globeDepth = czm_unpackDepth(texture(czm_globeDepthTexture, screenCoord));
        
        // Background/sky/Globe Etc.: show all edges
        if (gl_FragCoord.z > globeDepth) {
            return;
        }
        
        // Feature ID matching
        if (edgeFeatureId > 0.0 && currentFeatureId > 0.0) {
            if (edgeFeatureId != currentFeatureId) {
                discard;
            }
        }
    }
}