//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "attribute vec4 currentPosition;\n\
attribute vec4 previousPosition;\n\
attribute vec4 nextPosition;\n\
attribute vec2 expandAndWidth;\n\
attribute float a_batchId;\n\
\n\
uniform mat4 u_modifiedModelView;\n\
\n\
void main()\n\
{\n\
    float expandDir = expandAndWidth.x;\n\
    float width = abs(expandAndWidth.y) + 0.5;\n\
    bool usePrev = expandAndWidth.y < 0.0;\n\
\n\
    vec4 p = u_modifiedModelView * currentPosition;\n\
    vec4 prev = u_modifiedModelView * previousPosition;\n\
    vec4 next = u_modifiedModelView * nextPosition;\n\
\n\
    float angle;\n\
    vec4 positionWC = getPolylineWindowCoordinatesEC(p, prev, next, expandDir, width, usePrev, angle);\n\
    gl_Position = czm_viewportOrthographic * positionWC;\n\
\n\
#ifdef LOG_DEPTH\n\
    czm_vertexLogDepth(czm_projection * p);\n\
#endif\n\
}\n\
";
});