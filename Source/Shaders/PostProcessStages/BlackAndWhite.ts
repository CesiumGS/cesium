//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D colorTexture;\n\
uniform float gradations;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
void main(void)\n\
{\n\
    vec3 rgb = texture2D(colorTexture, v_textureCoordinates).rgb;\n\
#ifdef CZM_SELECTED_FEATURE\n\
    if (czm_selected()) {\n\
        gl_FragColor = vec4(rgb, 1.0);\n\
        return;\n\
    }\n\
#endif\n\
    float luminance = czm_luminance(rgb);\n\
    float darkness = luminance * gradations;\n\
    darkness = (darkness - fract(darkness)) / gradations;\n\
    gl_FragColor = vec4(vec3(darkness), 1.0);\n\
}\n\
";
});