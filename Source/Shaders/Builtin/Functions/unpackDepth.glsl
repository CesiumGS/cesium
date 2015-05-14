/**
 * Unpacks a vec3 depth depth value to a float.
 *
 * @name czm_unpackDepth
 * @glslFunction
 *
 * @param {vec3} packedDepth The packed depth.
 *
 * @returns {float} The floating-point depth.
 */
 float czm_unpackDepth(vec3 packedDepth)
 {
    return packedDepth.r + packedDepth.g / 255.0 + packedDepth.b / 65535.0;
 }
