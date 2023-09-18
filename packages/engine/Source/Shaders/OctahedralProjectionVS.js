//This file is automatically rebuilt by the Cesium build process.
export default "in vec4 position;\n\
in vec3 cubeMapCoordinates;\n\
\n\
out vec3 v_cubeMapCoordinates;\n\
\n\
void main()\n\
{\n\
    gl_Position = position;\n\
    v_cubeMapCoordinates = cubeMapCoordinates;\n\
}\n\
";
