//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D u_opaqueDepthTexture;\n\
uniform sampler2D u_translucentDepthTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    float opaqueDepth = texture2D(u_opaqueDepthTexture, v_textureCoordinates).r;\n\
    float translucentDepth = texture2D(u_translucentDepthTexture, v_textureCoordinates).r;\n\
    translucentDepth = czm_branchFreeTernary(translucentDepth > opaqueDepth, 1.0, translucentDepth);\n\
    gl_FragColor = czm_packDepth(translucentDepth);\n\
}\n\
";
