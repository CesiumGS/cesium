//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
uniform sampler2D bloomTexture;\n\
uniform bool glowOnly;\n\
\n\
in vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec4 color = texture(colorTexture, v_textureCoordinates);\n\
\n\
#ifdef CZM_SELECTED_FEATURE\n\
    if (czm_selected()) {\n\
        out_FragColor = color;\n\
        return;\n\
    }\n\
#endif\n\
\n\
    vec4 bloom = texture(bloomTexture, v_textureCoordinates);\n\
    out_FragColor = glowOnly ? bloom : bloom + color;\n\
}\n\
";
