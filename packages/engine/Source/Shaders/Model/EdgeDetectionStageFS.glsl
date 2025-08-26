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