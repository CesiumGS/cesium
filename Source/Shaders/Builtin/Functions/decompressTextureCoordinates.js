    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
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
    float stx = floor(temp) / 4096.0;\n\
    float sty = temp - floor(temp);\n\
    return vec2(stx, sty);\n\
 }\n\
";
});