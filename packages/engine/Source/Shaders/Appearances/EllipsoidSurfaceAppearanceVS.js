//This file is automatically rebuilt by the Cesium build process.
export default "in vec3 position3DHigh;\n\
in vec3 position3DLow;\n\
in vec2 st;\n\
in float batchId;\n\
\n\
out vec3 v_positionMC;\n\
out vec3 v_positionEC;\n\
out vec2 v_st;\n\
\n\
void main()\n\
{\n\
    vec4 p = czm_computePosition();\n\
\n\
    v_positionMC = position3DHigh + position3DLow;           // position in model coordinates\n\
    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;     // position in eye coordinates\n\
    v_st = st;\n\
\n\
    gl_Position = czm_modelViewProjectionRelativeToEye * p;\n\
}\n\
";
