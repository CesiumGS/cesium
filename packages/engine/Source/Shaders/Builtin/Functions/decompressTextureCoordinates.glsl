/**
 * Decompresses texture coordinates that were packed into a single float.
 *
 * @name czm_decompressTextureCoordinates
 * @glslFunction
 *
 * @param {float} encoded The compressed texture coordinates.
 * @returns {vec2} The decompressed texture coordinates.
 */
 vec2 czm_decompressTextureCoordinates(float encoded)
 {
    float temp = encoded / 4096.0;
    float xZeroTo4095 = floor(temp);
    float stx = xZeroTo4095 / 4095.0;
    float sty = (encoded - xZeroTo4095 * 4096.0) / 4095.0;
    return vec2(stx, sty);
 }
