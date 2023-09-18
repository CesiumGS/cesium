//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Samples the 4 neighboring pixels and return the weighted average.\n\
 *\n\
 * @private\n\
 */\n\
vec3 czm_sampleOctahedralProjectionWithFiltering(sampler2D projectedMap, vec2 textureSize, vec3 direction, float lod)\n\
{\n\
    direction /= dot(vec3(1.0), abs(direction));\n\
    vec2 rev = abs(direction.zx) - vec2(1.0);\n\
    vec2 neg = vec2(direction.x < 0.0 ? rev.x : -rev.x,\n\
                    direction.z < 0.0 ? rev.y : -rev.y);\n\
    vec2 uv = direction.y < 0.0 ? neg : direction.xz;\n\
    vec2 coord = 0.5 * uv + vec2(0.5);\n\
    vec2 pixel = 1.0 / textureSize;\n\
\n\
    if (lod > 0.0)\n\
    {\n\
        // Each subseqeuent mip level is half the size\n\
        float scale = 1.0 / pow(2.0, lod);\n\
        float offset = ((textureSize.y + 1.0) / textureSize.x);\n\
\n\
        coord.x *= offset;\n\
        coord *= scale;\n\
\n\
        coord.x += offset + pixel.x;\n\
        coord.y += (1.0 - (1.0 / pow(2.0, lod - 1.0))) + pixel.y * (lod - 1.0) * 2.0;\n\
    }\n\
    else\n\
    {\n\
        coord.x *= (textureSize.y / textureSize.x);\n\
    }\n\
\n\
    // Do bilinear filtering\n\
    #ifndef OES_texture_float_linear\n\
        vec3 color1 = texture(projectedMap, coord + vec2(0.0, pixel.y)).rgb;\n\
        vec3 color2 = texture(projectedMap, coord + vec2(pixel.x, 0.0)).rgb;\n\
        vec3 color3 = texture(projectedMap, coord + pixel).rgb;\n\
        vec3 color4 = texture(projectedMap, coord).rgb;\n\
\n\
        vec2 texturePosition = coord * textureSize;\n\
\n\
        float fu = fract(texturePosition.x);\n\
        float fv = fract(texturePosition.y);\n\
\n\
        vec3 average1 = mix(color4, color2, fu);\n\
        vec3 average2 = mix(color1, color3, fu);\n\
\n\
        vec3 color = mix(average1, average2, fv);\n\
    #else\n\
        vec3 color = texture(projectedMap, coord).rgb;\n\
    #endif\n\
\n\
    return color;\n\
}\n\
\n\
\n\
/**\n\
 * Samples from a cube map that has been projected using an octahedral projection from the given direction.\n\
 *\n\
 * @name czm_sampleOctahedralProjection\n\
 * @glslFunction\n\
 *\n\
 * @param {sampler2D} projectedMap The texture with the octahedral projected cube map.\n\
 * @param {vec2} textureSize The width and height dimensions in pixels of the projected map.\n\
 * @param {vec3} direction The normalized direction used to sample the cube map.\n\
 * @param {float} lod The level of detail to sample.\n\
 * @param {float} maxLod The maximum level of detail.\n\
 * @returns {vec3} The color of the cube map at the direction.\n\
 */\n\
vec3 czm_sampleOctahedralProjection(sampler2D projectedMap, vec2 textureSize, vec3 direction, float lod, float maxLod) {\n\
    float currentLod = floor(lod + 0.5);\n\
    float nextLod = min(currentLod + 1.0, maxLod);\n\
\n\
    vec3 colorCurrentLod = czm_sampleOctahedralProjectionWithFiltering(projectedMap, textureSize, direction, currentLod);\n\
    vec3 colorNextLod = czm_sampleOctahedralProjectionWithFiltering(projectedMap, textureSize, direction, nextLod);\n\
\n\
    return mix(colorNextLod, colorCurrentLod, nextLod - lod);\n\
}\n\
";
