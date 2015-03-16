    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "attribute vec3 position3DHigh;\n\
attribute vec3 position3DLow;\n\
attribute vec4 color;\n\
\n\
varying vec4 v_color;\n\
\n\
void main() \n\
{\n\
    vec4 p = czm_computePosition();\n\
\n\
    v_color = color;\n\
    \n\
    gl_Position = czm_modelViewProjectionRelativeToEye * p;\n\
}\n\
";
});