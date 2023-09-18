//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
uniform float brightness;\n\
\n\
in vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec3 rgb = texture(colorTexture, v_textureCoordinates).rgb;\n\
    vec3 target = vec3(0.0);\n\
    out_FragColor = vec4(mix(target, rgb, brightness), 1.0);\n\
}\n\
";
