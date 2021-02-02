//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D depthTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    float depth = czm_readDepth(depthTexture, v_textureCoordinates);\n\
    gl_FragColor = vec4(vec3(depth), 1.0);\n\
}\n\
";
