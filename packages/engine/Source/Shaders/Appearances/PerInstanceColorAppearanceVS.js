//This file is automatically rebuilt by the Cesium build process.
export default "in vec3 position3DHigh;\n\
in vec3 position3DLow;\n\
in vec3 normal;\n\
in vec4 color;\n\
in float batchId;\n\
\n\
out vec3 v_positionEC;\n\
out vec3 v_normalEC;\n\
out vec4 v_color;\n\
\n\
void main()\n\
{\n\
    vec4 p = czm_computePosition();\n\
\n\
    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates\n\
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates\n\
    v_color = color;\n\
\n\
    gl_Position = czm_modelViewProjectionRelativeToEye * p;\n\
}\n\
";
