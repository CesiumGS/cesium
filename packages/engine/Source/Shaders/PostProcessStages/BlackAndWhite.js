//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
uniform float gradations;\n\
\n\
in vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec3 rgb = texture(colorTexture, v_textureCoordinates).rgb;\n\
#ifdef CZM_SELECTED_FEATURE\n\
    if (czm_selected()) {\n\
        out_FragColor = vec4(rgb, 1.0);\n\
        return;\n\
    }\n\
#endif\n\
    float luminance = czm_luminance(rgb);\n\
    float darkness = luminance * gradations;\n\
    darkness = (darkness - fract(darkness)) / gradations;\n\
    out_FragColor = vec4(vec3(darkness), 1.0);\n\
}\n\
";
