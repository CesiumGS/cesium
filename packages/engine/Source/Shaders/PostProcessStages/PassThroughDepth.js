//This file is automatically rebuilt by the Cesium build process.
export default "uniform highp sampler2D u_depthTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    gl_FragColor = czm_packDepth(texture2D(u_depthTexture, v_textureCoordinates).r);\n\
}\n\
";
