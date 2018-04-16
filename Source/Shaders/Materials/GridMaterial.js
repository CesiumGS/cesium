//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef GL_OES_standard_derivatives\n\
    #extension GL_OES_standard_derivatives : enable\n\
#endif\n\
\n\
uniform vec4 color;\n\
uniform float cellAlpha;\n\
uniform vec2 lineCount;\n\
uniform vec2 lineThickness;\n\
uniform vec2 lineOffset;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    vec2 st = materialInput.st;\n\
\n\
    float scaledWidth = fract(lineCount.s * st.s - lineOffset.s);\n\
    scaledWidth = abs(scaledWidth - floor(scaledWidth + 0.5));\n\
    float scaledHeight = fract(lineCount.t * st.t - lineOffset.t);\n\
    scaledHeight = abs(scaledHeight - floor(scaledHeight + 0.5));\n\
\n\
    float value;\n\
#ifdef GL_OES_standard_derivatives\n\
    // Fuzz Factor - Controls blurriness of lines\n\
    const float fuzz = 1.2;\n\
    vec2 thickness = (lineThickness * czm_resolutionScale) - 1.0;\n\
\n\
    // From \"3D Engine Design for Virtual Globes\" by Cozzi and Ring, Listing 4.13.\n\
    vec2 dx = abs(dFdx(st));\n\
    vec2 dy = abs(dFdy(st));\n\
    vec2 dF = vec2(max(dx.s, dy.s), max(dx.t, dy.t)) * lineCount;\n\
    value = min(\n\
        smoothstep(dF.s * thickness.s, dF.s * (fuzz + thickness.s), scaledWidth),\n\
        smoothstep(dF.t * thickness.t, dF.t * (fuzz + thickness.t), scaledHeight));\n\
#else\n\
    // Fuzz Factor - Controls blurriness of lines\n\
    const float fuzz = 0.05;\n\
\n\
    vec2 range = 0.5 - (lineThickness * 0.05);\n\
    value = min(\n\
        1.0 - smoothstep(range.s, range.s + fuzz, scaledWidth),\n\
        1.0 - smoothstep(range.t, range.t + fuzz, scaledHeight));\n\
#endif\n\
\n\
    // Edges taken from RimLightingMaterial.glsl\n\
    // See http://www.fundza.com/rman_shaders/surface/fake_rim/fake_rim1.html\n\
    float dRim = 1.0 - abs(dot(materialInput.normalEC, normalize(materialInput.positionToEyeEC)));\n\
    float sRim = smoothstep(0.8, 1.0, dRim);\n\
    value *= (1.0 - sRim);\n\
\n\
    vec3 halfColor = color.rgb * 0.5;\n\
    material.diffuse = halfColor;\n\
    material.emission = halfColor;\n\
    material.alpha = color.a * (1.0 - ((1.0 - cellAlpha) * value));\n\
\n\
    return material;\n\
}\n\
";
});