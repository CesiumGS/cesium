//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec4 evenColor;\n\
uniform vec4 oddColor;\n\
uniform float offset;\n\
uniform float repeat;\n\
uniform bool horizontal;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    // Based on the Stripes Fragment Shader in the Orange Book (11.1.2)\n\
    float coord = mix(materialInput.st.s, materialInput.st.t, float(horizontal));\n\
    float value = fract((coord - offset) * (repeat * 0.5));\n\
    float dist = min(value, min(abs(value - 0.5), 1.0 - value));\n\
\n\
    vec4 currentColor = mix(evenColor, oddColor, step(0.5, value));\n\
    vec4 color = czm_antialias(evenColor, oddColor, currentColor, dist);\n\
    color = czm_gammaCorrect(color);\n\
\n\
    material.diffuse = color.rgb;\n\
    material.alpha = color.a;\n\
\n\
    return material;\n\
}\n\
";
