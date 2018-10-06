//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform vec4 color;\n\
uniform vec4 gapColor;\n\
uniform float dashLength;\n\
uniform float dashPattern;\n\
varying float v_polylineAngle;\n\
const float maskLength = 16.0;\n\
mat2 rotate(float rad) {\n\
float c = cos(rad);\n\
float s = sin(rad);\n\
return mat2(\n\
c, s,\n\
-s, c\n\
);\n\
}\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
czm_material material = czm_getDefaultMaterial(materialInput);\n\
vec2 pos = rotate(v_polylineAngle) * gl_FragCoord.xy;\n\
float dashPosition = fract(pos.x / dashLength);\n\
float maskIndex = floor(dashPosition * maskLength);\n\
float maskTest = floor(dashPattern / pow(2.0, maskIndex));\n\
vec4 fragColor = (mod(maskTest, 2.0) < 1.0) ? gapColor : color;\n\
if (fragColor.a < 0.005) {\n\
discard;\n\
}\n\
material.emission = fragColor.rgb;\n\
material.alpha = fragColor.a;\n\
return material;\n\
}\n\
";
});