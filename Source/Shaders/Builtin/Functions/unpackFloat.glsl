/**
 * Unpack an IEEE 754 single-precision float that is packed as a little-endian unsigned normalized vec4.
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
    // Convert to [0.0, 255.0] and round to integer
    packedFloat = floor(packedFloat * 255.0 + 0.5);
    float sign = 1.0 - step(128.0, packedFloat[3]) * 2.0;
    float exponent = 2.0 * mod(packedFloat[3], 128.0) + step(128.0, packedFloat[2]) - 127.0;    
    if (exponent == -127.0)
    {
        return 0.0;
    }
    float mantissa = mod(packedFloat[2], 128.0) * 65536.0 + packedFloat[1] * 256.0 + packedFloat[0] + float(0x800000);
    float result = sign * exp2(exponent - 23.0) * mantissa;
    return result;
}
