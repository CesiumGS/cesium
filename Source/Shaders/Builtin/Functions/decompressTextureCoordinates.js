//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Decompresses texture coordinates that were packed into a single float.\n\
 *\n\
 * @name czm_decompressTextureCoordinates\n\
 * @glslFunction\n\
 *\n\
 * @param {float} encoded The compressed texture coordinates.\n\
 * @returns {vec2} The decompressed texture coordinates.\n\
 */\n\
 vec2 czm_decompressTextureCoordinates(float encoded)\n\
 {\n\
    float temp = encoded / 4096.0;\n\
    float xZeroTo4095 = floor(temp);\n\
    float stx = xZeroTo4095 / 4095.0;\n\
    float sty = (encoded - xZeroTo4095 * 4096.0) / 4095.0;\n\
    return vec2(stx, sty);\n\
 }\n\
";
