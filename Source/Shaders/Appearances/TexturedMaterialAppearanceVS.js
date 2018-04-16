//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "attribute vec3 position3DHigh;\n\
attribute vec3 position3DLow;\n\
attribute vec3 normal;\n\
attribute vec2 st;\n\
attribute float batchId;\n\
\n\
varying vec3 v_positionEC;\n\
varying vec3 v_normalEC;\n\
varying vec2 v_st;\n\
\n\
void main()\n\
{\n\
    vec4 p = czm_computePosition();\n\
\n\
    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates\n\
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates\n\
    v_st = st;\n\
\n\
    gl_Position = czm_modelViewProjectionRelativeToEye * p;\n\
}\n\
";
});