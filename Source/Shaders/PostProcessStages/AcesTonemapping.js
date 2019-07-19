//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D colorTexture;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
#ifdef AUTO_EXPOSURE\n\
uniform sampler2D autoExposure;\n\
#endif\n\
\n\
// See:\n\
//    https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/\n\
\n\
void main()\n\
{\n\
    vec4 fragmentColor = texture2D(colorTexture, v_textureCoordinates);\n\
    vec3 color = fragmentColor.rgb;\n\
\n\
#ifdef AUTO_EXPOSURE\n\
    color /= texture2D(autoExposure, vec2(0.5)).r;\n\
#endif\n\
    float g = 0.985;\n\
\n\
    float a = 0.065;\n\
    float b = 0.0001;\n\
    float c = 0.433;\n\
    float d = 0.238;\n\
\n\
    color = (color * (color + a) - b) / (color * (g * color + c) + d);\n\
\n\
    color = clamp(color, 0.0, 1.0);\n\
    color = czm_inverseGamma(color);\n\
    gl_FragColor = vec4(color, fragmentColor.a);\n\
}\n\
";
});