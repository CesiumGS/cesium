//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec3 position3DHigh;\n\
attribute vec3 position3DLow;\n\
attribute vec3 prevPosition3DHigh;\n\
attribute vec3 prevPosition3DLow;\n\
attribute vec3 nextPosition3DHigh;\n\
attribute vec3 nextPosition3DLow;\n\
attribute vec2 expandAndWidth;\n\
attribute vec4 color;\n\
attribute float batchId;\n\
\n\
varying vec4 v_color;\n\
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
    v_color = color;\n\
}\n\
";
