#ifdef HAS_EDGE_VISIBILITY
void edgeVisibilityStageVS() {
    if (u_isEdgePass) {
        v_edgeType = a_edgeType;
        v_silhouetteNormalView = czm_normal * a_silhouetteNormal;
        v_faceNormalAView = czm_normal * a_faceNormalA;
        v_faceNormalBView = czm_normal * a_faceNormalB;
        v_edgeOffset = a_edgeOffset;
        
        // Silhouette detection: check both endpoints of the edge
        v_shouldDiscard = 0.0;
        float edgeTypeInt = a_edgeType * 255.0;
        if (edgeTypeInt > 0.5 && edgeTypeInt < 1.5) {
            vec3 normalA = normalize(v_faceNormalAView);
            vec3 normalB = normalize(v_faceNormalBView);
            const float perpTol = 2.5e-4;
            
            // Check at current vertex (first endpoint)
            vec4 currentPosEC = czm_modelView * vec4(v_positionMC, 1.0);
            vec3 toEye1 = normalize(-currentPosEC.xyz);
            float dotA1 = dot(normalA, toEye1);
            float dotB1 = dot(normalB, toEye1);
            
            // Check at other vertex (second endpoint)
            vec4 otherPosEC = czm_modelView * vec4(a_edgeOtherPos, 1.0);
            vec3 toEye2 = normalize(-otherPosEC.xyz);
            float dotA2 = dot(normalA, toEye2);
            float dotB2 = dot(normalB, toEye2);
            
            // Discard if EITHER endpoint is non-silhouette
            if (dotA1 * dotB1 > perpTol || dotA2 * dotB2 > perpTol) {
                v_shouldDiscard = 1.0;
            }
        }
        
#ifdef HAS_EDGE_FEATURE_ID
        v_featureId_0 = a_edgeFeatureId;
#endif

#ifdef HAS_EDGE_COLOR_ATTRIBUTE
        v_edgeColor = a_edgeColor;
#endif

#ifdef HAS_LINE_PATTERN
        // 16-bit pattern, 1 bit = 1 screen pixel, repeats every 16 pixels
        vec4 currentClip = czm_modelViewProjection * vec4(v_positionMC, 1.0);
        vec2 currentScreen = ((currentClip.xy / currentClip.w) * 0.5 + 0.5) * czm_viewport.zw;
        
        vec4 otherClip = czm_modelViewProjection * vec4(a_edgeOtherPos, 1.0);
        vec2 otherScreen = ((otherClip.xy / otherClip.w) * 0.5 + 0.5) * czm_viewport.zw;
        vec2 windowDir = otherScreen - currentScreen;
        
        // Offset base for texture coordinates to handle perspective clipping
        const float textureCoordinateBase = 8192.0;
        
        if (abs(windowDir.x) > abs(windowDir.y)) {
            v_lineCoord = textureCoordinateBase + currentScreen.x;
        } else {
            v_lineCoord = textureCoordinateBase + currentScreen.y;
        }
#endif
        
        // Expand vertex to form quad
        vec4 posClip = gl_Position;
        
        if (length(a_edgeOtherPos) > 0.0 && abs(a_edgeOffset) > 0.0) {
            vec4 currentClip = posClip;
            vec4 otherClip = czm_modelViewProjection * vec4(a_edgeOtherPos, 1.0);
            
            vec2 currentNDC = currentClip.xy / currentClip.w;
            vec2 otherNDC = otherClip.xy / otherClip.w;
            
            vec2 edgeDirNDC = otherNDC - currentNDC;
            
            // Ensure consistent edge direction
            if (edgeDirNDC.x < 0.0 || (abs(edgeDirNDC.x) < 0.001 && edgeDirNDC.y < 0.0)) {
                edgeDirNDC = -edgeDirNDC;
            }
            
            edgeDirNDC = normalize(edgeDirNDC);
            vec2 perpNDC = vec2(-edgeDirNDC.y, edgeDirNDC.x);
            
            // Convert line width from pixels to clip space
            float lineWidthPixels = u_lineWidth;
            vec2 viewportSize = czm_viewport.zw;
            vec2 clipPerPixel = (2.0 / viewportSize) * currentClip.w;
            vec2 offsetClip = perpNDC * lineWidthPixels * clipPerPixel * 0.5 * a_edgeOffset;
            
            posClip.xy += offsetClip;
        }
        
        gl_Position = posClip;
    }
}
#endif
