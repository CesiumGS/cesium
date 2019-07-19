//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D colorTexture;\n\
uniform sampler2D bloomTexture;\n\
uniform bool  glowOnly;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec4 bloom = texture2D(bloomTexture, v_textureCoordinates);\n\
    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n\
    gl_FragColor = glowOnly ? bloom : bloom + color;\n\
}\n\
";
});