//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec4 color;\n\
uniform vec4 outlineColor;\n\
uniform float outlineWidth;\n\
\n\
in float v_width;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    vec2 st = materialInput.st;\n\
    float halfInteriorWidth =  0.5 * (v_width - outlineWidth) / v_width;\n\
    float b = step(0.5 - halfInteriorWidth, st.t);\n\
    b *= 1.0 - step(0.5 + halfInteriorWidth, st.t);\n\
\n\
    // Find the distance from the closest separator (region between two colors)\n\
    float d1 = abs(st.t - (0.5 - halfInteriorWidth));\n\
    float d2 = abs(st.t - (0.5 + halfInteriorWidth));\n\
    float dist = min(d1, d2);\n\
\n\
    vec4 currentColor = mix(outlineColor, color, b);\n\
    vec4 outColor = czm_antialias(outlineColor, color, currentColor, dist);\n\
    outColor = czm_gammaCorrect(outColor);\n\
\n\
    material.diffuse = outColor.rgb;\n\
    material.alpha = outColor.a;\n\
\n\
    return material;\n\
}\n\
";
