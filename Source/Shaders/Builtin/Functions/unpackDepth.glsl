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
 float czm_unpackDepth(vec4 packedDepth)
 {
    // See Aras Pranckevičius' post Encoding Floats to RGBA
    // http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
    return dot(packedDepth, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
 }
