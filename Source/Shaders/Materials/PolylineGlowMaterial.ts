//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform vec4 color;\n\
uniform float glowPower;\n\
\n\
varying float v_width;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    vec2 st = materialInput.st;\n\
    float glow = glowPower / abs(st.t - 0.5) - (glowPower / 0.5);\n\
\n\
    material.emission = max(vec3(glow - 1.0 + color.rgb), color.rgb);\n\
    material.alpha = clamp(0.0, 1.0, glow) * color.a;\n\
\n\
    return material;\n\
}\n\
";
});