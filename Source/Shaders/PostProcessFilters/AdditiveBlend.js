    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "uniform sampler2D u_texture0;\n\
uniform sampler2D u_texture1;\n\
\n\
uniform vec2 u_center;\n\
uniform float u_radius;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    vec4 color0 = texture2D(u_texture0, v_textureCoordinates);\n\
    vec4 color1 = texture2D(u_texture1, v_textureCoordinates);\n\
    \n\
    float x = length(gl_FragCoord.xy - u_center) / u_radius;\n\
    float t = smoothstep(0.5, 0.8, x);\n\
    gl_FragColor = mix(color0 + color1, color0, t);\n\
}\n\
";
});