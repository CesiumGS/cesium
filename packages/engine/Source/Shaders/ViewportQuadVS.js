//This file is automatically rebuilt by the Cesium build process.
export default "in vec4 position;\n\
in vec2 textureCoordinates;\n\
\n\
out vec2 v_textureCoordinates;\n\
\n\
void main() \n\
{\n\
    gl_Position = position;\n\
    v_textureCoordinates = textureCoordinates;\n\
}\n\
";
