//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D u_depthTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    float z_window = czm_unpackDepth(texture2D(u_depthTexture, v_textureCoordinates));\n\
    z_window = czm_reverseLogDepth(z_window);\n\
    float n_range = czm_depthRange.near;\n\
    float f_range = czm_depthRange.far;\n\
    float z_ndc = (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n\
    float scale = pow(z_ndc * 0.5 + 0.5, 8.0);\n\
    gl_FragColor = vec4(mix(vec3(0.0), vec3(1.0), scale), 1.0);\n\
}\n\
";
