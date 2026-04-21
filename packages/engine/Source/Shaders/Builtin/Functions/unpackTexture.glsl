/**
 * Useful for reinterpreting texture data as higher-precision values.
 * Only works correctly in WebGL 2, which supports the uint type and bitwise operations.
 *
 * @param {float|vec2|vec3|vec4} 1-4 values from a texture lookup (RGBA channels), normalized to [0.0, 1.0].
 * @return {uint} Raw bits as an unsigned integer.
*/
uint czm_unpackTexture(float packedValue) {
    float rounded = czm_round(packedValue * 255.0);
    return uint(rounded);
}

uint czm_unpackTexture(vec2 packedValue) {
    vec2 rounded = czm_round(packedValue * 255.0);
    uint byte0 = uint(rounded.x);
    uint byte1 = uint(rounded.y);
    return byte0 | (byte1 << 8);
}

uint czm_unpackTexture(vec3 packedValue) {
    vec3 rounded = czm_round(packedValue * 255.0);
    uint byte0 = uint(rounded.x);
    uint byte1 = uint(rounded.y);
    uint byte2 = uint(rounded.z);
    return byte0 | (byte1 << 8) | (byte2 << 16);
}

uint czm_unpackTexture(vec4 packedValue) {
    vec4 rounded = czm_round(packedValue * 255.0);
    uint byte0 = uint(rounded.x);
    uint byte1 = uint(rounded.y);
    uint byte2 = uint(rounded.z);
    uint byte3 = uint(rounded.w);
    return byte0 | (byte1 << 8) | (byte2 << 16) | (byte3 << 24);
}
