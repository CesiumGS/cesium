    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "attribute vec4 position;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main() \n\
{\n\
    float x = (position.x - czm_viewport.x) / czm_viewport.z;\n\
    float y = (position.y - czm_viewport.y) / czm_viewport.w;\n\
    v_textureCoordinates = vec2(x, y);\n\
    \n\
    gl_Position = czm_viewportOrthographic * position;\n\
}";
});