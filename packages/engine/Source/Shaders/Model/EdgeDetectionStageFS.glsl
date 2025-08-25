void edgeDetectionStage(inout vec4 color) {
    if (u_isEdgePass) {
        return;
    }

    vec2 screenCoord = gl_FragCoord.xy / czm_viewport.zw;
    
    // TEMPORARY: Show edge color texture for debugging
    // vec4 edgeColor = texture(czm_edgeColorTexture, screenCoord);
    // if (edgeColor.a > 0.0 || edgeColor.r > 0.0 || edgeColor.g > 0.0 || edgeColor.b > 0.0) {
    //     color = edgeColor;
    //     return;
    // }
    // Also check edge ID for fallback
    vec4 edgeId = texture(czm_edgeIdTexture, screenCoord);
    if (edgeId.a > 0.0) {
        color = vec4(1.0, 0.0, 0.0, 1.0); // Red to indicate ID data exists but no color
        return;
    }
    
    // Original edge detection logic (commented for now)
    /*
    float edgeDepth = texture(czm_globeDepthTexture, screenCoord).r;
    float fragmentDepth = gl_FragCoord.z;
    
    if (edgeId.a > 0.0 && abs(fragmentDepth - edgeDepth) < czm_edgeDepthTolerance) {
        discard;
    }
    */
}