//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D colorTexture;\n\
uniform float brightness;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec3 rgb = texture2D(colorTexture, v_textureCoordinates).rgb;\n\
    vec3 target = vec3(0.0);\n\
    gl_FragColor = vec4(mix(target, rgb, brightness), 1.0);\n\
}\n\
";
});