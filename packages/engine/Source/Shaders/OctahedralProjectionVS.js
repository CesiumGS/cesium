//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec4 position;\n\
attribute vec3 cubeMapCoordinates;\n\
\n\
varying vec3 v_cubeMapCoordinates;\n\
\n\
void main()\n\
{\n\
    gl_Position = position;\n\
    v_cubeMapCoordinates = cubeMapCoordinates;\n\
}\n\
";
