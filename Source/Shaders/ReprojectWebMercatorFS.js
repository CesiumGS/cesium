//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D u_texture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    gl_FragColor = texture2D(u_texture, v_textureCoordinates);\n\
}\n\
";
