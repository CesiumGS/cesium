//This file is automatically rebuilt by the Cesium build process.
export default "in vec3 position3DHigh;\n\
in vec3 position3DLow;\n\
in vec3 prevPosition3DHigh;\n\
in vec3 prevPosition3DLow;\n\
in vec3 nextPosition3DHigh;\n\
in vec3 nextPosition3DLow;\n\
in vec2 expandAndWidth;\n\
in vec2 st;\n\
in float batchId;\n\
\n\
out float v_width;\n\
out vec2 v_st;\n\
out float v_polylineAngle;\n\
\n\
void main()\n\
{\n\
    float expandDir = expandAndWidth.x;\n\
    float width = abs(expandAndWidth.y) + 0.5;\n\
    bool usePrev = expandAndWidth.y < 0.0;\n\
\n\
    vec4 p = czm_computePosition();\n\
    vec4 prev = czm_computePrevPosition();\n\
    vec4 next = czm_computeNextPosition();\n\
\n\
    float angle;\n\
    vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev, angle);\n\
    gl_Position = czm_viewportOrthographic * positionWC;\n\
\n\
    v_width = width;\n\
    v_st.s = st.s;\n\
    v_st.t = czm_writeNonPerspective(st.t, gl_Position.w);\n\
    v_polylineAngle = angle;\n\
}\n\
";
