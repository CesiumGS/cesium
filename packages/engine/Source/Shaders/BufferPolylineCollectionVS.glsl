in vec3 positionHigh;
in vec3 positionLow;
in vec3 prevPositionHigh;
in vec3 prevPositionLow;
in vec3 nextPositionHigh;
in vec3 nextPositionLow;
in vec4 showColorWidthAndTexCoord;

out vec4 v_color;
out vec2  v_st;
out float v_width;
out float v_polylineAngle;

void main()
{
    float show = showColorWidthAndTexCoord.x;
    vec4 color = czm_decodeRGB8(showColorWidthAndTexCoord.y);
    float width = showColorWidthAndTexCoord.z;
    float texCoord = showColorWidthAndTexCoord.w;

    ///////////////////////////////////////////////////////////////////////////

    bool usePrevious = texCoord == 1.0;
    float expandDir = gl_VertexID % 2 == 1 ? 1.0 : -1.0;
    float polylineAngle;

    vec4 positionEC = czm_translateRelativeToEye(positionHigh, positionLow);
    vec4 prevPositionEC = czm_translateRelativeToEye(prevPositionHigh, prevPositionLow);
    vec4 nextPositionEC = czm_translateRelativeToEye(nextPositionHigh, nextPositionLow);

    vec4 positionWC = getPolylineWindowCoordinates(positionEC, prevPositionEC, nextPositionEC, expandDir, width, usePrevious, polylineAngle);

    ///////////////////////////////////////////////////////////////////////////

    gl_Position = czm_viewportOrthographic * positionWC * show;

    v_color = color;
    v_color.a *= show;

    v_st.s = texCoord;
    v_st.t = czm_writeNonPerspective(clamp(expandDir, 0.0, 1.0), gl_Position.w);

    v_width = width;
    v_polylineAngle = polylineAngle;
}
