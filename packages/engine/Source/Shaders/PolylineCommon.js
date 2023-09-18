//This file is automatically rebuilt by the Cesium build process.
export default "void clipLineSegmentToNearPlane(\n\
    vec3 p0,\n\
    vec3 p1,\n\
    out vec4 positionWC,\n\
    out bool clipped,\n\
    out bool culledByNearPlane,\n\
    out vec4 clippedPositionEC)\n\
{\n\
    culledByNearPlane = false;\n\
    clipped = false;\n\
\n\
    vec3 p0ToP1 = p1 - p0;\n\
    float magnitude = length(p0ToP1);\n\
    vec3 direction = normalize(p0ToP1);\n\
\n\
    // Distance that p0 is behind the near plane. Negative means p0 is\n\
    // in front of the near plane.\n\
    float endPoint0Distance =  czm_currentFrustum.x + p0.z;\n\
\n\
    // Camera looks down -Z.\n\
    // When moving a point along +Z: LESS VISIBLE\n\
    //   * Points in front of the camera move closer to the camera.\n\
    //   * Points behind the camrea move farther away from the camera.\n\
    // When moving a point along -Z: MORE VISIBLE\n\
    //   * Points in front of the camera move farther away from the camera.\n\
    //   * Points behind the camera move closer to the camera.\n\
\n\
    // Positive denominator: -Z, becoming more visible\n\
    // Negative denominator: +Z, becoming less visible\n\
    // Nearly zero: parallel to near plane\n\
    float denominator = -direction.z;\n\
\n\
    if (endPoint0Distance > 0.0 && abs(denominator) < czm_epsilon7)\n\
    {\n\
        // p0 is behind the near plane and the line to p1 is nearly parallel to\n\
        // the near plane, so cull the segment completely.\n\
        culledByNearPlane = true;\n\
    }\n\
    else if (endPoint0Distance > 0.0)\n\
    {\n\
        // p0 is behind the near plane, and the line to p1 is moving distinctly\n\
        // toward or away from it.\n\
\n\
        // t = (-plane distance - dot(plane normal, ray origin)) / dot(plane normal, ray direction)\n\
        float t = endPoint0Distance / denominator;\n\
        if (t < 0.0 || t > magnitude)\n\
        {\n\
            // Near plane intersection is not between the two points.\n\
            // We already confirmed p0 is behind the naer plane, so now\n\
            // we know the entire segment is behind it.\n\
            culledByNearPlane = true;\n\
        }\n\
        else\n\
        {\n\
            // Segment crosses the near plane, update p0 to lie exactly on it.\n\
            p0 = p0 + t * direction;\n\
\n\
            // Numerical noise might put us a bit on the wrong side of the near plane.\n\
            // Don't let that happen.\n\
            p0.z = min(p0.z, -czm_currentFrustum.x);\n\
\n\
            clipped = true;\n\
        }\n\
    }\n\
\n\
    clippedPositionEC = vec4(p0, 1.0);\n\
    positionWC = czm_eyeToWindowCoordinates(clippedPositionEC);\n\
}\n\
\n\
vec4 getPolylineWindowCoordinatesEC(vec4 positionEC, vec4 prevEC, vec4 nextEC, float expandDirection, float width, bool usePrevious, out float angle)\n\
{\n\
    // expandDirection +1 is to the _left_ when looking from positionEC toward nextEC.\n\
\n\
#ifdef POLYLINE_DASH\n\
    // Compute the window coordinates of the points.\n\
    vec4 positionWindow = czm_eyeToWindowCoordinates(positionEC);\n\
    vec4 previousWindow = czm_eyeToWindowCoordinates(prevEC);\n\
    vec4 nextWindow = czm_eyeToWindowCoordinates(nextEC);\n\
\n\
    // Determine the relative screen space direction of the line.\n\
    vec2 lineDir;\n\
    if (usePrevious) {\n\
        lineDir = normalize(positionWindow.xy - previousWindow.xy);\n\
    }\n\
    else {\n\
        lineDir = normalize(nextWindow.xy - positionWindow.xy);\n\
    }\n\
    angle = atan(lineDir.x, lineDir.y) - 1.570796327; // precomputed atan(1,0)\n\
\n\
    // Quantize the angle so it doesn't change rapidly between segments.\n\
    angle = floor(angle / czm_piOverFour + 0.5) * czm_piOverFour;\n\
#endif\n\
\n\
    vec4 clippedPrevWC, clippedPrevEC;\n\
    bool prevSegmentClipped, prevSegmentCulled;\n\
    clipLineSegmentToNearPlane(prevEC.xyz, positionEC.xyz, clippedPrevWC, prevSegmentClipped, prevSegmentCulled, clippedPrevEC);\n\
\n\
    vec4 clippedNextWC, clippedNextEC;\n\
    bool nextSegmentClipped, nextSegmentCulled;\n\
    clipLineSegmentToNearPlane(nextEC.xyz, positionEC.xyz, clippedNextWC, nextSegmentClipped, nextSegmentCulled, clippedNextEC);\n\
\n\
    bool segmentClipped, segmentCulled;\n\
    vec4 clippedPositionWC, clippedPositionEC;\n\
    clipLineSegmentToNearPlane(positionEC.xyz, usePrevious ? prevEC.xyz : nextEC.xyz, clippedPositionWC, segmentClipped, segmentCulled, clippedPositionEC);\n\
\n\
    if (segmentCulled)\n\
    {\n\
        return vec4(0.0, 0.0, 0.0, 1.0);\n\
    }\n\
\n\
    vec2 directionToPrevWC = normalize(clippedPrevWC.xy - clippedPositionWC.xy);\n\
    vec2 directionToNextWC = normalize(clippedNextWC.xy - clippedPositionWC.xy);\n\
\n\
    // If a segment was culled, we can't use the corresponding direction\n\
    // computed above. We should never see both of these be true without\n\
    // `segmentCulled` above also being true.\n\
    if (prevSegmentCulled)\n\
    {\n\
        directionToPrevWC = -directionToNextWC;\n\
    }\n\
    else if (nextSegmentCulled)\n\
    {\n\
        directionToNextWC = -directionToPrevWC;\n\
    }\n\
\n\
    vec2 thisSegmentForwardWC, otherSegmentForwardWC;\n\
    if (usePrevious)\n\
    {\n\
        thisSegmentForwardWC = -directionToPrevWC;\n\
        otherSegmentForwardWC = directionToNextWC;\n\
    }\n\
    else\n\
    {\n\
        thisSegmentForwardWC = directionToNextWC;\n\
        otherSegmentForwardWC =  -directionToPrevWC;\n\
    }\n\
\n\
    vec2 thisSegmentLeftWC = vec2(-thisSegmentForwardWC.y, thisSegmentForwardWC.x);\n\
\n\
    vec2 leftWC = thisSegmentLeftWC;\n\
    float expandWidth = width * 0.5;\n\
\n\
    // When lines are split at the anti-meridian, the position may be at the\n\
    // same location as the next or previous position, and we need to handle\n\
    // that to avoid producing NaNs.\n\
    if (!czm_equalsEpsilon(prevEC.xyz - positionEC.xyz, vec3(0.0), czm_epsilon1) && !czm_equalsEpsilon(nextEC.xyz - positionEC.xyz, vec3(0.0), czm_epsilon1))\n\
    {\n\
        vec2 otherSegmentLeftWC = vec2(-otherSegmentForwardWC.y, otherSegmentForwardWC.x);\n\
\n\
        vec2 leftSumWC = thisSegmentLeftWC + otherSegmentLeftWC;\n\
        float leftSumLength = length(leftSumWC);\n\
        leftWC = leftSumLength < czm_epsilon6 ? thisSegmentLeftWC : (leftSumWC / leftSumLength);\n\
\n\
        // The sine of the angle between the two vectors is given by the formula\n\
        //         |a x b| = |a||b|sin(theta)\n\
        // which is\n\
        //     float sinAngle = length(cross(vec3(leftWC, 0.0), vec3(-thisSegmentForwardWC, 0.0)));\n\
        // Because the z components of both vectors are zero, the x and y coordinate will be zero.\n\
        // Therefore, the sine of the angle is just the z component of the cross product.\n\
        vec2 u = -thisSegmentForwardWC;\n\
        vec2 v = leftWC;\n\
        float sinAngle = abs(u.x * v.y - u.y * v.x);\n\
        expandWidth = clamp(expandWidth / sinAngle, 0.0, width * 2.0);\n\
    }\n\
\n\
    vec2 offset = leftWC * expandDirection * expandWidth * czm_pixelRatio;\n\
    return vec4(clippedPositionWC.xy + offset, -clippedPositionWC.z, 1.0) * (czm_projection * clippedPositionEC).w;\n\
}\n\
\n\
vec4 getPolylineWindowCoordinates(vec4 position, vec4 previous, vec4 next, float expandDirection, float width, bool usePrevious, out float angle)\n\
{\n\
    vec4 positionEC = czm_modelViewRelativeToEye * position;\n\
    vec4 prevEC = czm_modelViewRelativeToEye * previous;\n\
    vec4 nextEC = czm_modelViewRelativeToEye * next;\n\
    return getPolylineWindowCoordinatesEC(positionEC, prevEC, nextEC, expandDirection, width, usePrevious, angle);\n\
}\n\
";
