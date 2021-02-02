//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec4 lightColor;\n\
uniform vec4 darkColor;\n\
uniform vec2 repeat;\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    vec2 st = materialInput.st;\n\
\n\
    // From Stefan Gustavson's Procedural Textures in GLSL in OpenGL Insights\n\
    float b = mod(floor(repeat.s * st.s) + floor(repeat.t * st.t), 2.0);  // 0.0 or 1.0\n\
\n\
    // Find the distance from the closest separator (region between two colors)\n\
    float scaledWidth = fract(repeat.s * st.s);\n\
    scaledWidth = abs(scaledWidth - floor(scaledWidth + 0.5));\n\
    float scaledHeight = fract(repeat.t * st.t);\n\
    scaledHeight = abs(scaledHeight - floor(scaledHeight + 0.5));\n\
    float value = min(scaledWidth, scaledHeight);\n\
\n\
    vec4 currentColor = mix(lightColor, darkColor, b);\n\
    vec4 color = czm_antialias(lightColor, darkColor, currentColor, value, 0.03);\n\
\n\
    color = czm_gammaCorrect(color);\n\
    material.diffuse = color.rgb;\n\
    material.alpha = color.a;\n\
\n\
    return material;\n\
}\n\
";
