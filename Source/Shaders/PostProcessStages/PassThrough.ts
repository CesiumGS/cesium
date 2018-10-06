//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D colorTexture;\n\
varying vec2 v_textureCoordinates;\n\
void main()\n\
{\n\
gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n\
}\n\
";
});