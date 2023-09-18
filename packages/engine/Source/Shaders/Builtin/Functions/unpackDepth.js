//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Unpacks a vec4 depth value to a float in [0, 1) range.\n\
 *\n\
 * @name czm_unpackDepth\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} packedDepth The packed depth.\n\
 *\n\
 * @returns {float} The floating-point depth in [0, 1) range.\n\
 */\n\
 float czm_unpackDepth(vec4 packedDepth)\n\
 {\n\
    // See Aras Pranckevičius' post Encoding Floats to RGBA\n\
    // http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/\n\
    return dot(packedDepth, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));\n\
 }\n\
";
