//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D image;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
    vec4 rampColor = texture2D(image, vec2(materialInput.slope, 0.5));\n\
    material.diffuse = rampColor.rgb;\n\
    material.alpha = rampColor.a;\n\
    return material;\n\
}\n\
";
});