#define SHIFT_RIGHT_8 0.00390625 //1.0 / 256.0
#define SHIFT_RIGHT_16 0.00001525878 //1.0 / 65536.0
#define SHIFT_RIGHT_24 5.960464477539063e-8//1.0 / 16777216.0

#define BIAS 38.0

/**
 * Unpacks a vec4 value containing values expressable as uint8 to an arbitrary float.
 *
 * @name czm_unpackFloat
 * @glslFunction
 *
 * @param {vec4} packedFloat The packed float.
 *
 * @returns {float} The floating-point depth in arbitrary range.
 */
 float czm_unpackFloat(vec4 packedFloat)
{
    packedFloat *= 255.0;
    float temp = packedFloat.w / 2.0;
    float exponent = floor(temp);
    float sign = (temp - exponent) * 2.0;
    exponent = exponent - float(BIAS);
    sign = sign * 2.0 - 1.0;
    sign = -sign;
    float unpacked = sign * packedFloat.x * float(SHIFT_RIGHT_8);
    unpacked += sign * packedFloat.y * float(SHIFT_RIGHT_16);
    unpacked += sign * packedFloat.z * float(SHIFT_RIGHT_24);
    return unpacked * pow(10.0, exponent);
}
