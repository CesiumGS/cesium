//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
uniform sampler2D silhouetteTexture;\n\
\n\
in vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec4 silhouetteColor = texture(silhouetteTexture, v_textureCoordinates);\n\
    vec4 color = texture(colorTexture, v_textureCoordinates);\n\
    out_FragColor = mix(color, silhouetteColor, silhouetteColor.a);\n\
}\n\
";
