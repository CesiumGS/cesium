const float SHIFT_RIGHT16 = 1.0 / 65536.0;
const float SHIFT_RIGHT8 = 1.0 / 256.0;
const float SHIFT_LEFT16 = 65536.0;
const float SHIFT_LEFT8 = 256.0;

/**
 * Decompresses RGB values packed into a single float.
 *
 * @name czm_decompressRGB
 * @glslFunction
 *
 * @param {float} encoded The compressed RGB values.
 * @returns {vec2} The decompressed RGB values.
 */
vec4 czm_decompressRGB(float encoded) {
    vec4 color = vec4(255.0);
    color.r = floor(encoded * SHIFT_RIGHT16);
    color.g = floor((encoded - color.r * SHIFT_LEFT16) * SHIFT_RIGHT8);
    color.b = floor(encoded - color.r * SHIFT_LEFT16 - color.g * SHIFT_LEFT8);
    return color / 255.0;
}
