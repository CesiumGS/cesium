//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
uniform sampler2D silhouetteTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec4 silhouetteColor = texture2D(silhouetteTexture, v_textureCoordinates);\n\
    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n\
    gl_FragColor = mix(color, silhouetteColor, silhouetteColor.a);\n\
}\n\
";
