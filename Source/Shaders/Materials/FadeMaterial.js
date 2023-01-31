//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec4 fadeInColor;\n\
uniform vec4 fadeOutColor;\n\
uniform float maximumDistance;\n\
uniform bool repeat;\n\
uniform vec2 fadeDirection;\n\
uniform vec2 time;\n\
\n\
float getTime(float t, float coord)\n\
{\n\
    float scalar = 1.0 / maximumDistance;\n\
    float q  = distance(t, coord) * scalar;\n\
    if (repeat)\n\
    {\n\
        float r = distance(t, coord + 1.0) * scalar;\n\
        float s = distance(t, coord - 1.0) * scalar;\n\
        q = min(min(r, s), q);\n\
    }\n\
    return clamp(q, 0.0, 1.0);\n\
}\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    vec2 st = materialInput.st;\n\
    float s = getTime(time.x, st.s) * fadeDirection.s;\n\
    float t = getTime(time.y, st.t) * fadeDirection.t;\n\
\n\
    float u = length(vec2(s, t));\n\
    vec4 color = mix(fadeInColor, fadeOutColor, u);\n\
\n\
    color = czm_gammaCorrect(color);\n\
    material.emission = color.rgb;\n\
    material.alpha = color.a;\n\
\n\
    return material;\n\
}\n\
";
