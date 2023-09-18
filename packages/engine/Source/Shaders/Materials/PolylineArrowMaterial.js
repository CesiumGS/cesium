//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec4 color;\n\
\n\
float getPointOnLine(vec2 p0, vec2 p1, float x)\n\
{\n\
    float slope = (p0.y - p1.y) / (p0.x - p1.x);\n\
    return slope * (x - p0.x) + p0.y;\n\
}\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    vec2 st = materialInput.st;\n\
\n\
#if (__VERSION__ == 300 || defined(GL_OES_standard_derivatives))\n\
    float base = 1.0 - abs(fwidth(st.s)) * 10.0 * czm_pixelRatio;\n\
#else\n\
     // If no derivatives available (IE 10?), 2.5% of the line will be the arrow head\n\
    float base = 0.975;\n\
#endif\n\
\n\
    vec2 center = vec2(1.0, 0.5);\n\
    float ptOnUpperLine = getPointOnLine(vec2(base, 1.0), center, st.s);\n\
    float ptOnLowerLine = getPointOnLine(vec2(base, 0.0), center, st.s);\n\
\n\
    float halfWidth = 0.15;\n\
    float s = step(0.5 - halfWidth, st.t);\n\
    s *= 1.0 - step(0.5 + halfWidth, st.t);\n\
    s *= 1.0 - step(base, st.s);\n\
\n\
    float t = step(base, materialInput.st.s);\n\
    t *= 1.0 - step(ptOnUpperLine, st.t);\n\
    t *= step(ptOnLowerLine, st.t);\n\
\n\
    // Find the distance from the closest separator (region between two colors)\n\
    float dist;\n\
    if (st.s < base)\n\
    {\n\
        float d1 = abs(st.t - (0.5 - halfWidth));\n\
        float d2 = abs(st.t - (0.5 + halfWidth));\n\
        dist = min(d1, d2);\n\
    }\n\
    else\n\
    {\n\
        float d1 = czm_infinity;\n\
        if (st.t < 0.5 - halfWidth && st.t > 0.5 + halfWidth)\n\
        {\n\
            d1 = abs(st.s - base);\n\
        }\n\
        float d2 = abs(st.t - ptOnUpperLine);\n\
        float d3 = abs(st.t - ptOnLowerLine);\n\
        dist = min(min(d1, d2), d3);\n\
    }\n\
\n\
    vec4 outsideColor = vec4(0.0);\n\
    vec4 currentColor = mix(outsideColor, color, clamp(s + t, 0.0, 1.0));\n\
    vec4 outColor = czm_antialias(outsideColor, color, currentColor, dist);\n\
\n\
    outColor = czm_gammaCorrect(outColor);\n\
    material.diffuse = outColor.rgb;\n\
    material.alpha = outColor.a;\n\
    return material;\n\
}\n\
";
