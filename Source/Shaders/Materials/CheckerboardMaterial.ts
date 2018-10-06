//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform vec4 lightColor;\n\
uniform vec4 darkColor;\n\
uniform vec2 repeat;\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
czm_material material = czm_getDefaultMaterial(materialInput);\n\
vec2 st = materialInput.st;\n\
float b = mod(floor(repeat.s * st.s) + floor(repeat.t * st.t), 2.0);\n\
float scaledWidth = fract(repeat.s * st.s);\n\
scaledWidth = abs(scaledWidth - floor(scaledWidth + 0.5));\n\
float scaledHeight = fract(repeat.t * st.t);\n\
scaledHeight = abs(scaledHeight - floor(scaledHeight + 0.5));\n\
float value = min(scaledWidth, scaledHeight);\n\
vec4 currentColor = mix(lightColor, darkColor, b);\n\
vec4 color = czm_antialias(lightColor, darkColor, currentColor, value, 0.03);\n\
material.diffuse = color.rgb;\n\
material.alpha = color.a;\n\
return material;\n\
}\n\
";
});