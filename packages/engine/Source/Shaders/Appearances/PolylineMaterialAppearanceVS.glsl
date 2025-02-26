in vec3 position3DHigh;
in vec3 position3DLow;
in vec3 prevPosition3DHigh;
in vec3 prevPosition3DLow;
in vec3 nextPosition3DHigh;
in vec3 nextPosition3DLow;
in vec2 expandAndWidth;
in vec2 st;
in float batchId;

out float v_width;
out vec2 v_st;
out float v_polylineAngle;

void main()
{
    float expandDir = expandAndWidth.x;
    float width = abs(expandAndWidth.y) + 0.5;
    bool usePrev = expandAndWidth.y < 0.0;

    vec4 p = czm_computePosition();
    vec4 prev = czm_computePrevPosition();
    vec4 next = czm_computeNextPosition();

    float angle;
    vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev, angle);
    gl_Position = czm_viewportOrthographic * positionWC;

    v_width = width;
    v_st.s = st.s;
    v_st.t = czm_writeNonPerspective(st.t, gl_Position.w);
    v_polylineAngle = angle;
}
