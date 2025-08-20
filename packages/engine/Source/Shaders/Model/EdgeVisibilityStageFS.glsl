void edgeVisibilityStage(inout vec4 color)
{
    #ifdef HAS_EDGE_VISIBILITY
    // Color coding based on edge type:
    // Type 1 (SILHOUETTE) = Red
    // Type 2 (HARD) = Green  
    // Type 3 (REPEATED) = Blue
    // Type 0 (HIDDEN) = Default (should not be rendered)
    
    float edgeType = v_edgeType;
    
    if (edgeType > 0.5 && edgeType < 1.5) {
        // SILHOUETTE edges - Red
        color = vec4(1.0, 0.0, 0.0, 1.0);
    } else if (edgeType > 1.5 && edgeType < 2.5) {
        // HARD edges - Green
        color = vec4(0.0, 1.0, 0.0, 1.0);
    } else if (edgeType > 2.5 && edgeType < 3.5) {
        // REPEATED edges - Blue
        color = vec4(0.0, 0.0, 1.0, 1.0);
    } else {
        // Default fallback (should not happen for visible edges)
        color = vec4(1.0, 1.0, 1.0, 1.0); // White
    }
    #endif
}
