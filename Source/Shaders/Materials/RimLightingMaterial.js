    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "uniform vec4 color;\n\
uniform vec4 rimColor;\n\
uniform float width;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    // See http://www.fundza.com/rman_shaders/surface/fake_rim/fake_rim1.html\n\
    float d = 1.0 - dot(materialInput.normalEC, normalize(materialInput.positionToEyeEC));\n\
    float s = smoothstep(1.0 - width, 1.0, d);\n\
\n\
    material.diffuse = color.rgb;\n\
    material.emission = rimColor.rgb * s; \n\
    material.alpha = mix(color.a, rimColor.a, s);\n\
\n\
    return material;\n\
}\n\
";
});