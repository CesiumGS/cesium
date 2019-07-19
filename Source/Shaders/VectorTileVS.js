//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "attribute vec3 position;\n\
attribute float a_batchId;\n\
\n\
uniform mat4 u_modifiedModelViewProjection;\n\
\n\
void main()\n\
{\n\
    gl_Position = czm_depthClampFarPlane(u_modifiedModelViewProjection * vec4(position, 1.0));\n\
}\n\
";
});