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
    
    // Color code different edge types
    vec4 edgeColor = vec4(0.0);
    
    if (edgeTypeInt < 0.5) { // HIDDEN (0)
        edgeColor = vec4(0.0, 0.0, 0.0, 0.0); // Transparent for hidden edges
    }
    else if (edgeTypeInt > 0.5 && edgeTypeInt < 1.5) { // SILHOUETTE (1) - Conditional visibility
        // Proper silhouette detection using face normals
        vec3 normalA = normalize(v_faceNormalAView);
        vec3 normalB = normalize(v_faceNormalBView);
        
        // Calculate view direction using existing eye-space position varying (v_positionEC)
        vec3 viewDir = -normalize(v_positionEC);
        
        // Calculate dot products to determine triangle facing
        float dotA = dot(normalA, viewDir);
        float dotB = dot(normalB, viewDir);
        
        const float eps = 1e-3;
        bool frontA = dotA > eps;
        bool backA  = dotA < -eps;
        bool frontB = dotB > eps;
        bool backB  = dotB < -eps;
        
        // True silhouette: one triangle front-facing, other back-facing
        bool oppositeFacing = (frontA && backB) || (backA && frontB);
        
        // Exclude edges where both triangles are nearly grazing (perpendicular to view)
        // This handles the top-view cylinder case where both normals are ~horizontal
        bool bothNearGrazing = (abs(dotA) <= eps && abs(dotB) <= eps);
        
        if (!(oppositeFacing && !bothNearGrazing)) {
            discard; // Not a true silhouette edge
        } else {
            // True silhouette
            edgeColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
    }
    else if (edgeTypeInt > 1.5 && edgeTypeInt < 2.5) { // HARD (2) - BRIGHT GREEN
        edgeColor = vec4(0.0, 1.0, 0.0, 1.0); // Extra bright green
    }
    else if (edgeTypeInt > 2.5 && edgeTypeInt < 3.5) { // REPEATED (3)
        edgeColor = vec4(0.0, 0.0, 1.0, 1.0);
    } else {
        edgeColor = vec4(0.0, 0.0, 0.0, 0.0);
    }

    // Temporary color: white
    edgeColor = vec4(1.0, 1.0, 1.0, 1.0);
    color = edgeColor;
    
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
