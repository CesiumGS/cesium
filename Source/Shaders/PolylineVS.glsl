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
varying vec4 v_pickColor;
varying float v_polylineAngle;

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

    vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev, v_polylineAngle);
    gl_Position = czm_viewportOrthographic * positionWC * show;

    v_st = vec2(texCoord, clamp(expandDir, 0.0, 1.0));
    v_width = width;
    v_pickColor = pickColor;

#ifdef LOG_DEPTH
    czm_vertexLogDepth(czm_modelViewProjectionRelativeToEye * p);
#endif
}
