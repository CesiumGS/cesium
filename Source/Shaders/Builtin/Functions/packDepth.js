//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Packs a depth value into a vec3 that can be represented by unsigned bytes.\n\
 *\n\
 * @name czm_packDepth\n\
 * @glslFunction\n\
 *\n\
 * @param {float} depth The floating-point depth.\n\
 * @returns {vec3} The packed depth.\n\
 */\n\
vec4 czm_packDepth(float depth)\n\
{\n\
    // See Aras Pranckevičius' post Encoding Floats to RGBA\n\
    // http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/\n\
    vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * depth;\n\
    enc = fract(enc);\n\
    enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);\n\
    return enc;\n\
}\n\
";
});