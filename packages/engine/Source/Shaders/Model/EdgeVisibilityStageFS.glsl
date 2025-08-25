#ifdef HAS_EDGE_VISIBILITY_MRT
layout(location = 0) out vec4 out_FragColor;
layout(location = 1) out vec4 out_id;
#endif

void edgeVisibilityStage(inout vec4 color)
{
#ifdef HAS_EDGE_VISIBILITY

    if (!u_isEdgePass) {
        return;
    }
    
    // Convert normalized edge type back to 0-255 range for proper classification
    float edgeTypeInt = v_edgeType * 255.0;
    
    // Color code different edge types
    vec4 edgeColor = vec4(0.0);
    vec4 edgeId = vec4(0.0);
    
    if (edgeTypeInt < 0.5) { // HIDDEN (0)
        edgeColor = vec4(0.0, 0.0, 0.0, 0.0); // Transparent for hidden edges
        edgeId = vec4(0.0); // No ID for hidden edges
    }
    else if (edgeTypeInt > 0.5 && edgeTypeInt < 1.5) { // SILHOUETTE (1) - Conditional visibility
        // Proper silhouette detection using face normals
        vec3 normalA = normalize(v_faceNormalAView);
        vec3 normalB = normalize(v_faceNormalBView);
        
        // Calculate view direction from camera to fragment (perspective-correct)
        // In view space, camera is at origin, so view direction is -normalize(position)
        vec3 viewDir = -normalize(v_positionView);
        
        // Calculate dot products to determine triangle facing
        float dotA = dot(normalA, viewDir);
        float dotB = dot(normalB, viewDir);
        
        // Silhouette edge is visible when one triangle is front-facing and other is back-facing
        // Same sign = both front or both back = not silhouette, discard
        float tolerance = 0.01;
        if (dotA * dotB > tolerance) {
            discard; // Both triangles face same direction
        } else {
            // True silhouette
            edgeColor = vec4(1.0, 0.0, 0.0, 1.0);
            edgeId = vec4(1.0, 0.0, 0.0, 1.0); // Red ID for silhouette edges
        }
    }
    else if (edgeTypeInt > 1.5 && edgeTypeInt < 2.5) { // HARD (2) - BRIGHT GREEN
        edgeColor = vec4(0.0, 2.0, 0.0, 1.0); // Extra bright green
        edgeId = vec4(0.0, 1.0, 0.0, 1.0); // Green ID for hard edges
    }
    else if (edgeTypeInt > 2.5 && edgeTypeInt < 3.5) { // REPEATED (3) - Same as HARD but secondary encoding
        edgeColor = vec4(0.0, 2.0, 0.0, 1.0); // Same bright green as HARD edges
        edgeId = vec4(0.0, 1.0, 0.0, 1.0); // Green ID for repeated edges
    }
    else { // Unknown - YELLOW
        edgeColor = vec4(1.0, 1.0, 0.0, 1.0);
        edgeId = vec4(1.0, 1.0, 0.0, 1.0); // Yellow ID for unknown edges
    }
    // Output to color buffer
    color = edgeColor;
    
    // Output to ID buffer if MRT is enabled
    #ifdef HAS_EDGE_VISIBILITY_MRT
        out_FragColor = edgeColor;
        out_id = edgeId;
    #endif
#endif
}
