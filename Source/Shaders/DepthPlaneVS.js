//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec4 position;\n\
\n\
varying vec4 positionEC;\n\
\n\
void main()\n\
{\n\
    positionEC = czm_modelView * position;\n\
    gl_Position = czm_projection * positionEC;\n\
\n\
    czm_vertexLogDepth();\n\
}\n\
";
