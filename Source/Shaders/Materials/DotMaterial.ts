//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform vec4 lightColor;\n\
uniform vec4 darkColor;\n\
uniform vec2 repeat;\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
czm_material material = czm_getDefaultMaterial(materialInput);\n\
float b = smoothstep(0.3, 0.32, length(fract(repeat * materialInput.st) - 0.5));\n\
vec4 color = mix(lightColor, darkColor, b);\n\
material.diffuse = color.rgb;\n\
material.alpha = color.a;\n\
return material;\n\
}\n\
";
});