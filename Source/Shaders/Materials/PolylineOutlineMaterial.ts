//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform vec4 color;\n\
uniform vec4 outlineColor;\n\
uniform float outlineWidth;\n\
varying float v_width;\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
czm_material material = czm_getDefaultMaterial(materialInput);\n\
vec2 st = materialInput.st;\n\
float halfInteriorWidth =  0.5 * (v_width - outlineWidth) / v_width;\n\
float b = step(0.5 - halfInteriorWidth, st.t);\n\
b *= 1.0 - step(0.5 + halfInteriorWidth, st.t);\n\
float d1 = abs(st.t - (0.5 - halfInteriorWidth));\n\
float d2 = abs(st.t - (0.5 + halfInteriorWidth));\n\
float dist = min(d1, d2);\n\
vec4 currentColor = mix(outlineColor, color, b);\n\
vec4 outColor = czm_antialias(outlineColor, color, currentColor, dist);\n\
material.diffuse = outColor.rgb;\n\
material.alpha = outColor.a;\n\
return material;\n\
}\n\
";
});