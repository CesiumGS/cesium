#ifdef USE_FLOAT64
in vec3 positionHigh;
in vec3 positionLow;
in vec3 prevPositionHigh;
in vec3 prevPositionLow;
in vec3 nextPositionHigh;
in vec3 nextPositionLow;
#else
in vec3 position;
in vec3 prevPosition;
in vec3 nextPosition;
#endif
in vec4 pickColor;
in vec4 showColorWidthAndTexCoord;
in float alpha;

out vec4 v_pickColor;
out vec4 v_color;
out vec2  v_st;
out float v_width;
out float v_polylineAngle;

void main()
{
    float show = showColorWidthAndTexCoord.x;
    vec4 color = czm_decodeRGB8(showColorWidthAndTexCoord.y);
    float signedWidth = showColorWidthAndTexCoord.z;
    float texCoord = showColorWidthAndTexCoord.w;

    ///////////////////////////////////////////////////////////////////////////

    bool usePrevious = texCoord == 1.0;
    float expandDir = gl_VertexID % 2 == 1 ? 1.0 : -1.0;
    float polylineAngle;

#ifdef USE_FLOAT64
    vec4 positionEC = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 prevPositionEC = czm_translateRelativeToEye(prevPositionHigh, prevPositionLow);
    vec4 nextPositionEC = czm_translateRelativeToEye(nextPositionHigh, nextPositionLow);
#else
    vec4 positionEC = czm_modelView * vec4(position, 1.0);
    vec4 prevPositionEC = czm_modelView * vec4(prevPosition, 1.0);
    vec4 nextPositionEC = czm_modelView * vec4(nextPosition, 1.0);
#endif

    // A negative width is in meters; see renderBufferPolylineCollection. The quad is
    // extruded in window coordinates, so convert it at this vertex's depth.
    float width = abs(signedWidth);
    if (signedWidth < 0.0)
    {
        width /= max(czm_metersPerPixel(positionEC), czm_epsilon7);
    }

#ifdef USE_FLOAT64
    vec4 positionWC = getPolylineWindowCoordinates(positionEC, prevPositionEC, nextPositionEC, expandDir, width, usePrevious, polylineAngle);
#else
    // Positions are already in eye space; use the EC variant to skip the redundant transform.
    vec4 positionWC = getPolylineWindowCoordinatesEC(positionEC, prevPositionEC, nextPositionEC, expandDir, width, usePrevious, polylineAngle);
#endif

    ///////////////////////////////////////////////////////////////////////////

    gl_Position = czm_viewportOrthographic * positionWC * show;

    v_pickColor = pickColor / 255.0;

    v_color = color;
    v_color.a *= alpha / 255.0 * show;

    v_st.s = texCoord;
    v_st.t = czm_writeNonPerspective(clamp(expandDir, 0.0, 1.0), gl_Position.w);

    v_width = width;
    v_polylineAngle = polylineAngle;
}
