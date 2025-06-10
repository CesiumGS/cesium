uniform float u_maxTotalPointSize;

in vec4 positionHighAndSize;
in vec4 positionLowAndOutline;
in vec4 compressedAttribute0;                                        // color, outlineColor, pick color
in vec4 compressedAttribute1;                                        // show, translucency by distance, some free space
in vec4 scaleByDistance;                                             // near, nearScale, far, farScale
in vec4 distanceDisplayConditionAndDisableDepthAndSplitDirection;    // near, far, disableDepthTestDistance, splitDirection

out vec4 v_color;
out vec4 v_outlineColor;
out float v_innerPercent;
out float v_pixelDistance;
out vec4 v_pickColor;
out float v_splitDirection;

const float SHIFT_LEFT8 = 256.0;
const float SHIFT_RIGHT8 = 1.0 / 256.0;

void main()
{
    // Modifying this shader may also require modifications to PointPrimitive._computeScreenSpacePosition

    // unpack attributes
    vec3 positionHigh = positionHighAndSize.xyz;
    vec3 positionLow = positionLowAndOutline.xyz;
    float outlineWidthBothSides = 2.0 * positionLowAndOutline.w;
    float totalSize = positionHighAndSize.w + outlineWidthBothSides;
    float outlinePercent = outlineWidthBothSides / totalSize;
    // Scale in response to browser-zoom.
    totalSize *= czm_pixelRatio;

    float temp = compressedAttribute1.x * SHIFT_RIGHT8;
    float show = floor(temp);

#ifdef EYE_DISTANCE_TRANSLUCENCY
    vec4 translucencyByDistance;
    translucencyByDistance.x = compressedAttribute1.z;
    translucencyByDistance.z = compressedAttribute1.w;

    translucencyByDistance.y = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;

    temp = compressedAttribute1.y * SHIFT_RIGHT8;
    translucencyByDistance.w = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;
#endif

    ///////////////////////////////////////////////////////////////////////////

    vec4 color;
    vec4 outlineColor;
    vec4 pickColor;

    // compressedAttribute0.z => pickColor.rgb

    temp = compressedAttribute0.z * SHIFT_RIGHT8;
    pickColor.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    pickColor.g = (temp - floor(temp)) * SHIFT_LEFT8;
    pickColor.r = floor(temp);

    // compressedAttribute0.x => color.rgb

    temp = compressedAttribute0.x * SHIFT_RIGHT8;
    color.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    color.g = (temp - floor(temp)) * SHIFT_LEFT8;
    color.r = floor(temp);

    // compressedAttribute0.y => outlineColor.rgb

    temp = compressedAttribute0.y * SHIFT_RIGHT8;
    outlineColor.b = (temp - floor(temp)) * SHIFT_LEFT8;
    temp = floor(temp) * SHIFT_RIGHT8;
    outlineColor.g = (temp - floor(temp)) * SHIFT_LEFT8;
    outlineColor.r = floor(temp);

    // compressedAttribute0.w => color.a, outlineColor.a, pickColor.a

    temp = compressedAttribute0.w * SHIFT_RIGHT8;
    pickColor.a = (temp - floor(temp)) * SHIFT_LEFT8;
    pickColor = pickColor / 255.0;

    temp = floor(temp) * SHIFT_RIGHT8;
    outlineColor.a = (temp - floor(temp)) * SHIFT_LEFT8;
    outlineColor /= 255.0;
    color.a = floor(temp);
    color /= 255.0;

    ///////////////////////////////////////////////////////////////////////////

    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 positionEC = czm_modelViewRelativeToEye * p;

    ///////////////////////////////////////////////////////////////////////////

#if defined(EYE_DISTANCE_SCALING) || defined(EYE_DISTANCE_TRANSLUCENCY) || defined(DISTANCE_DISPLAY_CONDITION) || defined(DISABLE_DEPTH_DISTANCE)
    float lengthSq;
    if (czm_sceneMode == czm_sceneMode2D)
    {
        // 2D camera distance is a special case
        // treat all billboards as flattened to the z=0.0 plane
        lengthSq = czm_eyeHeight2D.y;
    }
    else
    {
        lengthSq = dot(positionEC.xyz, positionEC.xyz);
    }
#endif

#ifdef EYE_DISTANCE_SCALING
    totalSize *= czm_nearFarScalar(scaleByDistance, lengthSq);
#endif
    if (totalSize > 0.0) {
        // Add padding for anti-aliasing on both sides.
        totalSize += 3.0;
    }

    // Clamp to max point size.
    totalSize = min(totalSize, u_maxTotalPointSize);
    // If size is too small, push vertex behind near plane for clipping.
    // Note that context.minimumAliasedPointSize "will be at most 1.0".
    if (totalSize < 1.0)
    {
        positionEC.xyz = vec3(0.0);
        totalSize = 1.0;
    }

    float translucency = 1.0;
#ifdef EYE_DISTANCE_TRANSLUCENCY
    translucency = czm_nearFarScalar(translucencyByDistance, lengthSq);
    // push vertex behind near plane for clipping
    if (translucency < 0.004)
    {
        positionEC.xyz = vec3(0.0);
    }
#endif

#ifdef DISTANCE_DISPLAY_CONDITION
    float nearSq = distanceDisplayConditionAndDisableDepthAndSplitDirection.x;
    float farSq = distanceDisplayConditionAndDisableDepthAndSplitDirection.y;
    if (lengthSq < nearSq || lengthSq > farSq) {
        // push vertex behind camera to force it to be clipped
        positionEC.xyz = vec3(0.0, 0.0, 1.0);
    }
#endif

    gl_Position = czm_projection * positionEC;
    czm_vertexLogDepth();

#ifdef DISABLE_DEPTH_DISTANCE
    float disableDepthTestDistance = distanceDisplayConditionAndDisableDepthAndSplitDirection.z;
    if (disableDepthTestDistance == 0.0 && czm_minimumDisableDepthTestDistance != 0.0)
    {
        disableDepthTestDistance = czm_minimumDisableDepthTestDistance;
    }

    if (disableDepthTestDistance != 0.0)
    {
        // Don't try to "multiply both sides" by w.  Greater/less-than comparisons won't work for negative values of w.
        float zclip = gl_Position.z / gl_Position.w;
        bool clipped = (zclip < -1.0 || zclip > 1.0);
        if (!clipped && (disableDepthTestDistance < 0.0 || (lengthSq > 0.0 && lengthSq < disableDepthTestDistance)))
        {
            // Position z on the near plane.
            gl_Position.z = -gl_Position.w;
#ifdef LOG_DEPTH
            czm_vertexLogDepth(vec4(czm_currentFrustum.x));
#endif
        }
    }
#endif

    v_color = color;
    v_color.a *= translucency * show;
    v_outlineColor = outlineColor;
    v_outlineColor.a *= translucency * show;

    v_innerPercent = 1.0 - outlinePercent;
    v_pixelDistance = 2.0 / totalSize;
    gl_PointSize = totalSize * show;
    gl_Position *= show;

    v_pickColor = pickColor;
    v_splitDirection = distanceDisplayConditionAndDisableDepthAndSplitDirection.w;
}
