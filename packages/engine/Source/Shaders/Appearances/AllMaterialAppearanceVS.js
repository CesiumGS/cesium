//This file is automatically rebuilt by the Cesium build process.
export default "in vec3 position3DHigh;\n\
in vec3 position3DLow;\n\
in vec3 normal;\n\
in vec3 tangent;\n\
in vec3 bitangent;\n\
in vec2 st;\n\
in float batchId;\n\
\n\
out vec3 v_positionEC;\n\
out vec3 v_normalEC;\n\
out vec3 v_tangentEC;\n\
out vec3 v_bitangentEC;\n\
out vec2 v_st;\n\
\n\
void main()\n\
{\n\
    vec4 p = czm_computePosition();\n\
\n\
    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates\n\
    v_normalEC = czm_normal * normal;                         // normal in eye coordinates\n\
    v_tangentEC = czm_normal * tangent;                       // tangent in eye coordinates\n\
    v_bitangentEC = czm_normal * bitangent;                   // bitangent in eye coordinates\n\
    v_st = st;\n\
\n\
    gl_Position = czm_modelViewProjectionRelativeToEye * p;\n\
}\n\
";
