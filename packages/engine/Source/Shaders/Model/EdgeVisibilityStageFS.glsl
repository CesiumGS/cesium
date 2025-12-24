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
        vec3 normalA = normalize(v_faceNormalAView);
        vec3 normalB = normalize(v_faceNormalBView);
        vec3 viewDir = -normalize(v_positionEC);
        float dotA = dot(normalA, viewDir);
        float dotB = dot(normalB, viewDir);
        const float eps = 1e-3;
        bool frontA = dotA > eps;
        bool backA = dotA < -eps;
        bool frontB = dotB > eps;
        bool backB = dotB < -eps;
        bool oppositeFacing = (frontA && backB) || (backA && frontB);
        bool bothNearGrazing = (abs(dotA) <= eps && abs(dotB) <= eps);
        if (!(oppositeFacing && !bothNearGrazing)) {
            discard;
        }
    }

    vec4 finalColor = color;
#ifdef HAS_EDGE_COLOR_ATTRIBUTE
    if (v_edgeColor.a >= 0.0) {
        finalColor = v_edgeColor;
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
