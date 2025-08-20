void edgeVisibilityStage(inout vec4 color)
{
#ifdef HAS_EDGE_VISIBILITY
    // Convert normalized edge type back to 0-255 range for proper classification
    float edgeTypeInt = v_edgeType * 255.0;
    
    // Color code different edge types
    if (edgeTypeInt < 0.5) { // HIDDEN (0)
        color = vec4(0.0, 0.0, 0.0, 0.0); // Transparent for hidden edges
    }
    else if (edgeTypeInt > 0.5 && edgeTypeInt < 1.5) { // SILHOUETTE (1) - RED
        color = vec4(1.0, 0.0, 0.0, 1.0);
    }
    else if (edgeTypeInt > 1.5 && edgeTypeInt < 2.5) { // HARD (2) - GREEN
        color = vec4(0.0, 1.0, 0.0, 1.0);
    }
    else if (edgeTypeInt > 2.5 && edgeTypeInt < 3.5) { // REPEATED (3) - BLUE
        color = vec4(0.0, 0.0, 1.0, 1.0);
    }
    else { // Unknown - YELLOW (this will help us see if values are out of range)
        color = vec4(1.0, 1.0, 0.0, 1.0);
    }
#endif
}
