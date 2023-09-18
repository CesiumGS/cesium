//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D heights;\n\
uniform sampler2D colors;\n\
\n\
// This material expects heights to be sorted from lowest to highest.\n\
\n\
float getHeight(int idx, float invTexSize)\n\
{\n\
    vec2 uv = vec2((float(idx) + 0.5) * invTexSize, 0.5);\n\
#ifdef OES_texture_float\n\
    return texture(heights, uv).x;\n\
#else\n\
    return czm_unpackFloat(texture(heights, uv));\n\
#endif\n\
}\n\
\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
\n\
    float height = materialInput.height;\n\
    float invTexSize = 1.0 / float(heightsDimensions.x);\n\
\n\
    float minHeight = getHeight(0, invTexSize);\n\
    float maxHeight = getHeight(heightsDimensions.x - 1, invTexSize);\n\
\n\
    // early-out when outside the height range\n\
    if (height < minHeight || height > maxHeight) {\n\
        material.diffuse = vec3(0.0);\n\
        material.alpha = 0.0;\n\
        return material;\n\
    }\n\
\n\
    // Binary search to find heights above and below.\n\
    int idxBelow = 0;\n\
    int idxAbove = heightsDimensions.x;\n\
    float heightBelow = minHeight;\n\
    float heightAbove = maxHeight;\n\
\n\
    // while loop not allowed, so use for loop with max iterations.\n\
    // maxIterations of 16 supports a texture size up to 65536 (2^16).\n\
    const int maxIterations = 16;\n\
    for (int i = 0; i < maxIterations; i++) {\n\
        if (idxBelow >= idxAbove - 1) {\n\
            break;\n\
        }\n\
\n\
        int idxMid = (idxBelow + idxAbove) / 2;\n\
        float heightTex = getHeight(idxMid, invTexSize);\n\
\n\
        if (height > heightTex) {\n\
            idxBelow = idxMid;\n\
            heightBelow = heightTex;\n\
        } else {\n\
            idxAbove = idxMid;\n\
            heightAbove = heightTex;\n\
        }\n\
    }\n\
\n\
    float lerper = heightBelow == heightAbove ? 1.0 : (height - heightBelow) / (heightAbove - heightBelow);\n\
    vec2 colorUv = vec2(invTexSize * (float(idxBelow) + 0.5 + lerper), 0.5);\n\
    vec4 color = texture(colors, colorUv);\n\
\n\
    // undo preumultiplied alpha\n\
    if (color.a > 0.0) \n\
    {\n\
        color.rgb /= color.a;\n\
    }\n\
    \n\
    color.rgb = czm_gammaCorrect(color.rgb);\n\
\n\
    material.diffuse = color.rgb;\n\
    material.alpha = color.a;\n\
    return material;\n\
}\n\
";
