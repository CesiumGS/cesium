    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "attribute vec2 direction;\n\
\n\
uniform float u_size;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main() \n\
{\n\
    vec4 position;\n\
    if (czm_morphTime == 1.0)\n\
    {\n\
        position = vec4(czm_sunPositionWC, 1.0);\n\
    }\n\
    else\n\
    {\n\
        position = vec4(czm_sunPositionColumbusView.zxy, 1.0);\n\
    }\n\
    \n\
    vec4 positionEC = czm_view * position;\n\
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);\n\
    \n\
    vec2 halfSize = vec2(u_size * 0.5);\n\
    halfSize *= ((direction * 2.0) - 1.0);\n\
    \n\
    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy + halfSize, -positionWC.z, 1.0);\n\
    \n\
    v_textureCoordinates = direction;\n\
}\n\
";
});