//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
uniform sampler2D colorTexture2;\n\
\n\
uniform vec2 center;\n\
uniform float radius;\n\
\n\
in vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    vec4 color0 = texture(colorTexture, v_textureCoordinates);\n\
    vec4 color1 = texture(colorTexture2, v_textureCoordinates);\n\
\n\
    float x = length(gl_FragCoord.xy - center) / radius;\n\
    float t = smoothstep(0.5, 0.8, x);\n\
    out_FragColor = mix(color0 + color1, color1, t);\n\
}\n\
";
