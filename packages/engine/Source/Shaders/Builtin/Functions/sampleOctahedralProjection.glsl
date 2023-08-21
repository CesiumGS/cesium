/**
 * Samples the 4 neighboring pixels and return the weighted average.
 *
 * @private
 */
vec3 czm_sampleOctahedralProjectionWithFiltering(sampler2D projectedMap, vec2 textureSize, vec3 direction, float lod)
{
    direction /= dot(vec3(1.0), abs(direction));
    vec2 rev = abs(direction.zx) - vec2(1.0);
    vec2 neg = vec2(direction.x < 0.0 ? rev.x : -rev.x,
                    direction.z < 0.0 ? rev.y : -rev.y);
    vec2 uv = direction.y < 0.0 ? neg : direction.xz;
    vec2 coord = 0.5 * uv + vec2(0.5);
    vec2 pixel = 1.0 / textureSize;

    if (lod > 0.0)
    {
        // Each subseqeuent mip level is half the size
        float scale = 1.0 / pow(2.0, lod);
        float offset = ((textureSize.y + 1.0) / textureSize.x);

        coord.x *= offset;
        coord *= scale;

        coord.x += offset + pixel.x;
        coord.y += (1.0 - (1.0 / pow(2.0, lod - 1.0))) + pixel.y * (lod - 1.0) * 2.0;
    }
    else
    {
        coord.x *= (textureSize.y / textureSize.x);
    }

    // Do bilinear filtering
    #ifndef OES_texture_float_linear
        vec3 color1 = texture(projectedMap, coord + vec2(0.0, pixel.y)).rgb;
        vec3 color2 = texture(projectedMap, coord + vec2(pixel.x, 0.0)).rgb;
        vec3 color3 = texture(projectedMap, coord + pixel).rgb;
        vec3 color4 = texture(projectedMap, coord).rgb;

        vec2 texturePosition = coord * textureSize;

        float fu = fract(texturePosition.x);
        float fv = fract(texturePosition.y);

        vec3 average1 = mix(color4, color2, fu);
        vec3 average2 = mix(color1, color3, fu);

        vec3 color = mix(average1, average2, fv);
    #else
        vec3 color = texture(projectedMap, coord).rgb;
    #endif

    return color;
}


/**
 * Samples from a cube map that has been projected using an octahedral projection from the given direction.
 *
 * @name czm_sampleOctahedralProjection
 * @glslFunction
 *
 * @param {sampler2D} projectedMap The texture with the octahedral projected cube map.
 * @param {vec2} textureSize The width and height dimensions in pixels of the projected map.
 * @param {vec3} direction The normalized direction used to sample the cube map.
 * @param {float} lod The level of detail to sample.
 * @param {float} maxLod The maximum level of detail.
 * @returns {vec3} The color of the cube map at the direction.
 */
vec3 czm_sampleOctahedralProjection(sampler2D projectedMap, vec2 textureSize, vec3 direction, float lod, float maxLod) {
    float currentLod = floor(lod + 0.5);
    float nextLod = min(currentLod + 1.0, maxLod);

    vec3 colorCurrentLod = czm_sampleOctahedralProjectionWithFiltering(projectedMap, textureSize, direction, currentLod);
    vec3 colorNextLod = czm_sampleOctahedralProjectionWithFiltering(projectedMap, textureSize, direction, nextLod);

    return mix(colorNextLod, colorCurrentLod, nextLod - lod);
}
