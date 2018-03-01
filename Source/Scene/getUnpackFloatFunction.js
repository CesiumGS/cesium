define([
    '../Core/defined'
], function(
    defined
) {
'use strict';

    var SHIFT_RIGHT_8 = 1.0 / 256.0;
    var SHIFT_RIGHT_16 = 1.0 / 65536.0;
    var SHIFT_RIGHT_24 = 1.0 / 16777216.0;

    var BIAS = 38.0;

    /**
     * Gets a glsl function that takes a vec4 representing a float packed to Uint8 RGBA and returns the unpacked float.
     *
     * @param {String} [functionName='unpackFloat'] An optional name for the glsl function.
     * @returns {String} A string containing a glsl function that takes a vec4 and returns a float.
     * @private
     * @see Cartesian4#packFloat
     */
    function getUnpackFloatFunction(functionName) {
        if (!defined(functionName)) {
            functionName = 'unpackFloat';
        }
        return 'float ' + functionName + '(vec4 value) \n' +
               '{ \n' +
               '    value *= 255.0; \n' +
               '    float temp = value.w / 2.0; \n' +
               '    float exponent = floor(temp); \n' +
               '    float sign = (temp - exponent) * 2.0; \n' +
               '    exponent = exponent - float(' + BIAS + '); \n' +
               '    sign = sign * 2.0 - 1.0; \n' +
               '    sign = -sign; \n' +
               '    float unpacked = sign * value.x * float(' + SHIFT_RIGHT_8 + '); \n' +
               '    unpacked += sign * value.y * float(' + SHIFT_RIGHT_16 + '); \n' +
               '    unpacked += sign * value.z * float(' + SHIFT_RIGHT_24 + '); \n' +
               '    return unpacked * pow(10.0, exponent); \n' +
               '} \n';
    }

    return getUnpackFloatFunction;
});
