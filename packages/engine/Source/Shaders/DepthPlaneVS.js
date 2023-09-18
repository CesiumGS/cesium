//This file is automatically rebuilt by the Cesium build process.
export default "in vec4 position;\n\
\n\
out vec4 positionEC;\n\
\n\
void main()\n\
{\n\
    positionEC = czm_modelView * position;\n\
    gl_Position = czm_projection * positionEC;\n\
\n\
    czm_vertexLogDepth();\n\
}\n\
";
