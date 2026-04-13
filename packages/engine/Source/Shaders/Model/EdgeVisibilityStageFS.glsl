// CESIUM_REDIRECTED_COLOR_OUTPUT flag is used to avoid color attachment conflicts
// when shaders are processed by different rendering pipelines (e.g., OIT).
// Only declare MRT outputs when not in a derived shader context.
#if defined(HAS_EDGE_VISIBILITY_MRT) && !defined(CESIUM_REDIRECTED_COLOR_OUTPUT)
layout(location = 1) out vec4 out_id;        // edge id / metadata
layout(location = 2) out vec4 out_edgeDepth; // packed depth
#endif

void edgeVisibilityStage(inout vec4 color, inout FeatureIds featureIds)
{
#ifdef HAS_EDGE_VISIBILITY

    if (!u_isEdgePass) {
        return;
    }
 
    float edgeTypeInt = v_edgeType * 255.0;

    if (edgeTypeInt < 0.5) {
        discard;
    }

    if (edgeTypeInt > 0.5 && edgeTypeInt < 1.5) { // silhouette candidate
        // Silhouette check done in vertex shader
        // v_shouldDiscard will be > 0.5 if this edge should be discarded
        if (v_shouldDiscard > 0.5) {
            discard;
        }
    }

    vec4 finalColor = color;
#ifdef HAS_EDGE_COLOR_ATTRIBUTE
    if (v_edgeColor.a >= 0.0) {
        finalColor = v_edgeColor;
    }
#endif

#ifdef HAS_LINE_PATTERN
    // Pattern is 16-bit, each bit represents visibility at that position
    const float maskLength = 16.0;
    
    // Get the relative position within the dash from 0 to 1
    float dashPosition = fract(v_lineCoord / maskLength);
    // Figure out the mask index
    float maskIndex = floor(dashPosition * maskLength);
    // Test the bit mask
    float maskTest = floor(u_linePattern / pow(2.0, maskIndex));
    
    // If bit is 0 (gap), discard the fragment (use < 1.0 for better numerical stability)
    if (mod(maskTest, 2.0) < 1.0) {
        discard;
    }
#endif
    color = finalColor;
    
    #if defined(HAS_EDGE_VISIBILITY_MRT) && !defined(CESIUM_REDIRECTED_COLOR_OUTPUT)
        // Write edge metadata
        out_id = vec4(0.0);
        out_id.r = edgeTypeInt;                    // Edge type (0-3)
#ifdef HAS_EDGE_FEATURE_ID
        out_id.g = float(featureIds.featureId_0); // Feature ID if available
#else
        out_id.g = 0.0;
#endif
        // Pack depth into separate MRT attachment
        out_edgeDepth = czm_packDepth(gl_FragCoord.z);
    #endif
#endif
}