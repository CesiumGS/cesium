//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
\n\
in vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    out_FragColor = texture(colorTexture, v_textureCoordinates);\n\
}\n\
";
