//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "attribute vec4 position;\n\
attribute vec2 textureCoordinates;\n\
varying vec2 v_textureCoordinates;\n\
void main()\n\
{\n\
gl_Position = position;\n\
v_textureCoordinates = textureCoordinates;\n\
}\n\
";
});