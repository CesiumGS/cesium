//This file is automatically rebuilt by the Cesium build process.
export default "attribute vec4 position;\n\
attribute vec2 textureCoordinates;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main() \n\
{\n\
    gl_Position = position;\n\
    v_textureCoordinates = textureCoordinates;\n\
}\n\
";
