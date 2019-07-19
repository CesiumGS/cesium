//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D colorTexture;\n\
uniform sampler2D colorTexture2;\n\
\n\
uniform vec2 center;\n\
uniform float radius;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    vec4 color0 = texture2D(colorTexture, v_textureCoordinates);\n\
    vec4 color1 = texture2D(colorTexture2, v_textureCoordinates);\n\
\n\
    float x = length(gl_FragCoord.xy - center) / radius;\n\
    float t = smoothstep(0.5, 0.8, x);\n\
    gl_FragColor = mix(color0 + color1, color1, t);\n\
}\n\
";
});