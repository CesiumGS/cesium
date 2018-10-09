//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D image;\n\
uniform float minimumHeight;\n\
uniform float maximumHeight;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
    float scaledHeight = clamp((materialInput.height - minimumHeight) / (maximumHeight - minimumHeight), 0.0, 1.0);\n\
    vec4 rampColor = texture2D(image, vec2(scaledHeight, 0.5));\n\
    material.diffuse = rampColor.rgb;\n\
    material.alpha = rampColor.a;\n\
    return material;\n\
}\n\
";
});