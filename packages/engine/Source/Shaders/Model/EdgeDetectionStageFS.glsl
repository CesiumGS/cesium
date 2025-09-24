void edgeDetectionStage(inout vec4 color, inout FeatureIds featureIds) {
    if (u_isEdgePass) {
        return;
    }

    vec2 screenCoord = gl_FragCoord.xy / czm_viewport.zw;

    vec4 edgeColor = texture(czm_edgeColorTexture, screenCoord);
    vec4 edgeId    = texture(czm_edgeIdTexture,    screenCoord);

    // Packed window-space depth from edge pass (0..1)
    float edgeDepthWin = czm_unpackDepth(texture(czm_edgeDepthTexture, screenCoord));

    // Near / far for current frustum
    float n = czm_currentFrustum.x;
    float f = czm_currentFrustum.y;

    // geometry depth in eye coordinate
    vec4 geomEC = czm_windowToEyeCoordinates(gl_FragCoord);
    float geomDepthLinear = -geomEC.z;

    // Convert edge depth to linear depth
    float z_ndc_edge = edgeDepthWin * 2.0 - 1.0;
    float edgeDepthLinear = (2.0 * n * f) / (f + n - z_ndc_edge * (f - n));

    float d = abs(edgeDepthLinear - geomDepthLinear);

    // Adaptive epsilon using linear depth fwidth for robustness
    float pixelStepLinear = fwidth(geomDepthLinear);
    float rel = geomDepthLinear * 0.0005;
    float eps = max(n * 1e-4, max(pixelStepLinear * 1.5, rel));

    // If Edge isn't behind any geometry and the pixel has edge data
    if (d < eps && edgeId.r > 0.0) {
#ifdef HAS_EDGE_FEATURE_ID
        float edgeFeatureId    = edgeId.g;
        float currentFeatureId = float(featureIds.featureId_0);
#endif
        float globeDepth       = czm_unpackDepth(texture(czm_globeDepthTexture, screenCoord));
        color = vec4(globeDepth, globeDepth, globeDepth, 1.0);
        return;

        // Background / sky / globe: always show edge
        if (gl_FragCoord.z > globeDepth) {
            color = edgeColor;
            return;
        }

#ifdef HAS_EDGE_FEATURE_ID
        // Feature-to-feature: only draw when IDs match or one is background
        if (edgeFeatureId > 0.0 && currentFeatureId > 0.0 && edgeFeatureId != currentFeatureId) {
            return;
        }
#endif
    }
}