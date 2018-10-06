//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "attribute vec3 position3DHigh;\n\
attribute vec3 position3DLow;\n\
attribute vec4 color;\n\
attribute float batchId;\n\
varying vec4 v_color;\n\
void main()\n\
{\n\
vec4 p = czm_computePosition();\n\
v_color = color;\n\
gl_Position = czm_modelViewProjectionRelativeToEye * p;\n\
}\n\
";
});