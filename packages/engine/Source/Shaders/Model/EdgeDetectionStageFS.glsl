void edgeDetectionStage() {
    // Skip edge detection for edge passes themselves
    if (u_isEdgePass) {
        return;
    }

    // Get screen coordinate for texture lookup
    vec2 screenCoord = gl_FragCoord.xy / czm_viewport.zw;
    
    // Read edge ID from the edge buffer
    vec4 edgeId = texture(czm_edgeIdTexture, screenCoord);
    
    // Read depth from the globe depth texture (includes 3D Tiles)
    float edgeDepth = texture(czm_globeDepthTexture, screenCoord).r;
    
    // Convert fragment depth to same coordinate system
    float fragmentDepth = gl_FragCoord.z;
    
    // If there's an edge at this pixel and the depths are close, discard
    // This prevents z-fighting between edges and underlying surfaces
    if (edgeId.a > 0.0 && abs(fragmentDepth - edgeDepth) < czm_edgeDepthTolerance) {
        discard;
    }
}