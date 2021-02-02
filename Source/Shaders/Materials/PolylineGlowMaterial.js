//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec4 color;\n\
uniform float glowPower;\n\
uniform float taperPower;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    vec2 st = materialInput.st;\n\
    float glow = glowPower / abs(st.t - 0.5) - (glowPower / 0.5);\n\
\n\
    if (taperPower <= 0.99999) {\n\
        glow *= min(1.0, taperPower / (0.5 - st.s * 0.5) - (taperPower / 0.5));\n\
    }\n\
\n\
    vec4 fragColor;\n\
    fragColor.rgb = max(vec3(glow - 1.0 + color.rgb), color.rgb);\n\
    fragColor.a = clamp(0.0, 1.0, glow) * color.a;\n\
    fragColor = czm_gammaCorrect(fragColor);\n\
\n\
    material.emission = fragColor.rgb;\n\
    material.alpha = fragColor.a;\n\
\n\
    return material;\n\
}\n\
";
