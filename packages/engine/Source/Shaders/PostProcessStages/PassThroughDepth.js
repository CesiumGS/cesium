//This file is automatically rebuilt by the Cesium build process.
export default "uniform highp sampler2D u_depthTexture;\n\
\n\
in vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    out_FragColor = czm_packDepth(texture(u_depthTexture, v_textureCoordinates).r);\n\
}\n\
";
