//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec3 position;\n\
attribute float a_batchId;\n\
\n\
uniform mat4 u_modifiedModelViewProjection;\n\
\n\
void main()\n\
{\n\
    gl_Position = czm_depthClamp(u_modifiedModelViewProjection * vec4(position, 1.0));\n\
}\n\
";
