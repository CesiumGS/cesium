attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 position2DHigh;
attribute vec3 position2DLow;
attribute vec3 prevPosition3DHigh;
attribute vec3 prevPosition3DLow;
attribute vec3 prevPosition2DHigh;
attribute vec3 prevPosition2DLow;
attribute vec3 nextPosition3DHigh;
attribute vec3 nextPosition3DLow;
attribute vec3 nextPosition2DHigh;
attribute vec3 nextPosition2DLow;
attribute vec4 texCoordExpandAndBatchIndex;

varying vec2  v_st;
varying float v_width;
varying vec4  czm_pickColor;
varying float v_angle;

void main()
{
    float texCoord = texCoordExpandAndBatchIndex.x;
    float expandDir = texCoordExpandAndBatchIndex.y;
    bool usePrev = texCoordExpandAndBatchIndex.z < 0.0;
    float batchTableIndex = texCoordExpandAndBatchIndex.w;

    vec2 widthAndShow = batchTable_getWidthAndShow(batchTableIndex);
    float width = widthAndShow.x + 0.5;
    float show = widthAndShow.y;

    if (width < 1.0)
    {
        show = 0.0;
    }

    vec4 pickColor = batchTable_getPickColor(batchTableIndex);

    vec4 p, prev, next;
    if (czm_morphTime == 1.0)
    {
        p = czm_translateRelativeToEye(position3DHigh.xyz, position3DLow.xyz);
        prev = czm_translateRelativeToEye(prevPosition3DHigh.xyz, prevPosition3DLow.xyz);
        next = czm_translateRelativeToEye(nextPosition3DHigh.xyz, nextPosition3DLow.xyz);
    }
    else if (czm_morphTime == 0.0)
    {
        p = czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy);
        prev = czm_translateRelativeToEye(prevPosition2DHigh.zxy, prevPosition2DLow.zxy);
        next = czm_translateRelativeToEye(nextPosition2DHigh.zxy, nextPosition2DLow.zxy);
    }
    else
    {
        p = czm_columbusViewMorph(
                czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),
                czm_translateRelativeToEye(position3DHigh.xyz, position3DLow.xyz),
                czm_morphTime);
        prev = czm_columbusViewMorph(
                czm_translateRelativeToEye(prevPosition2DHigh.zxy, prevPosition2DLow.zxy),
                czm_translateRelativeToEye(prevPosition3DHigh.xyz, prevPosition3DLow.xyz),
                czm_morphTime);
        next = czm_columbusViewMorph(
                czm_translateRelativeToEye(nextPosition2DHigh.zxy, nextPosition2DLow.zxy),
                czm_translateRelativeToEye(nextPosition3DHigh.xyz, nextPosition3DLow.xyz),
                czm_morphTime);
    }

    #ifdef DISTANCE_DISPLAY_CONDITION
        vec3 centerHigh = batchTable_getCenterHigh(batchTableIndex);
        vec4 centerLowAndRadius = batchTable_getCenterLowAndRadius(batchTableIndex);
        vec3 centerLow = centerLowAndRadius.xyz;
        float radius = centerLowAndRadius.w;
        vec2 distanceDisplayCondition = batchTable_getDistanceDisplayCondition(batchTableIndex);

        float lengthSq;
        if (czm_sceneMode == czm_sceneMode2D)
        {
            lengthSq = czm_eyeHeight2D.y;
        }
        else
        {
            vec4 center = czm_translateRelativeToEye(centerHigh.xyz, centerLow.xyz);
            lengthSq = max(0.0, dot(center.xyz, center.xyz) - radius * radius);
        }

        float nearSq = distanceDisplayCondition.x * distanceDisplayCondition.x;
        float farSq = distanceDisplayCondition.y * distanceDisplayCondition.y;
        if (lengthSq < nearSq || lengthSq > farSq)
        {
            show = 0.0;
        }
    #endif

    // Compute the points in eye coordinates.
    vec4 prevEC = czm_modelViewRelativeToEye * prev;
    vec4 nextEC = czm_modelViewRelativeToEye * next;
    vec4 pEC = czm_modelViewRelativeToEye * p;

    // Compute the positions in clip space.

    vec4 prevClip = czm_viewportOrthographic * prevEC;
    vec4 nextClip = czm_viewportOrthographic * nextEC;
    vec4 pClip = czm_viewportOrthographic * pEC;

    // Determine the relative screen space direction of the line.
    vec2 dir;
    if (usePrev) {
        dir = normalize(pClip.xy - prevClip.xy);
    }
    else {
        dir = normalize(nextClip.xy - pClip.xy);
    }
    v_angle = atan(dir.x, dir.y) - atan(1.0, 0.0);

    // Quantize the angle so it doesn't change rapidly between segments.
    v_angle = floor(v_angle / czm_piOverFour + 0.5) * czm_piOverFour;

    vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev);
    gl_Position = czm_viewportOrthographic * positionWC * show;

    v_st = vec2(texCoord, clamp(expandDir, 0.0, 1.0));
    v_width = width;
    czm_pickColor = pickColor;
}
