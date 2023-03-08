//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n\
}\n\
";
