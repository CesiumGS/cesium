//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#define SHIFT_RIGHT_8 0.00390625 //1.0 / 256.0\n\
#define SHIFT_RIGHT_16 0.00001525878 //1.0 / 65536.0\n\
#define SHIFT_RIGHT_24 5.960464477539063e-8//1.0 / 16777216.0\n\
\n\
#define BIAS 38.0\n\
\n\
/**\n\
 * Unpacks a vec4 value containing values expressable as uint8 to an arbitrary float.\n\
 *\n\
 * @name czm_unpackFloat\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} packedFloat The packed float.\n\
 *\n\
 * @returns {float} The floating-point depth in arbitrary range.\n\
 */\n\
 float czm_unpackFloat(vec4 packedFloat)\n\
{\n\
    packedFloat *= 255.0;\n\
    float temp = packedFloat.w / 2.0;\n\
    float exponent = floor(temp);\n\
    float sign = (temp - exponent) * 2.0;\n\
    exponent = exponent - float(BIAS);\n\
    sign = sign * 2.0 - 1.0;\n\
    sign = -sign;\n\
    float unpacked = sign * packedFloat.x * float(SHIFT_RIGHT_8);\n\
    unpacked += sign * packedFloat.y * float(SHIFT_RIGHT_16);\n\
    unpacked += sign * packedFloat.z * float(SHIFT_RIGHT_24);\n\
    return unpacked * pow(10.0, exponent);\n\
}\n\
";
});