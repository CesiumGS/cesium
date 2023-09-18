//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
uniform float contrast;\n\
uniform float brightness;\n\
\n\
in vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec3 sceneColor = texture(colorTexture, v_textureCoordinates).xyz;\n\
    sceneColor = czm_RGBToHSB(sceneColor);\n\
    sceneColor.z += brightness;\n\
    sceneColor = czm_HSBToRGB(sceneColor);\n\
\n\
    float factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));\n\
    sceneColor = factor * (sceneColor - vec3(0.5)) + vec3(0.5);\n\
    out_FragColor = vec4(sceneColor, 1.0);\n\
}\n\
";
