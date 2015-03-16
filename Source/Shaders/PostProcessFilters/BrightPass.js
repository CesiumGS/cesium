    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "uniform sampler2D u_texture;\n\
\n\
uniform float u_avgLuminance;\n\
uniform float u_threshold;\n\
uniform float u_offset;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
float key(float avg)\n\
{\n\
    float guess = 1.5 - (1.5 / (avg * 0.1 + 1.0));\n\
    return max(0.0, guess) + 0.1;\n\
}\n\
\n\
// See section 9. \"The bright-pass filter\" of Realtime HDR Rendering\n\
// http://www.cg.tuwien.ac.at/research/publications/2007/Luksch_2007_RHR/Luksch_2007_RHR-RealtimeHDR%20.pdf\n\
\n\
void main()\n\
{\n\
    vec4 color = texture2D(u_texture, v_textureCoordinates);\n\
    vec3 xyz = czm_RGBToXYZ(color.rgb);\n\
    float luminance = xyz.r;\n\
    \n\
    float scaledLum = key(u_avgLuminance) * luminance / u_avgLuminance;\n\
    float brightLum = max(scaledLum - u_threshold, 0.0);\n\
    float brightness = brightLum / (u_offset + brightLum);\n\
    \n\
    xyz.r = brightness;\n\
    gl_FragColor = vec4(czm_XYZToRGB(xyz), 1.0);\n\
}\n\
";
});