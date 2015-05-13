/**
 * Packs a depth value into a vec3 that can be represented by unsigned bytes.
 *
 * @name czm_packDepth
 * @glslFunction
 *
 * @param {float} depth The floating-point depth.
 * @returns {vec3} The packed depth.
 */
 vec3 czm_packDepth(float depth)
 {
    float temp = depth * 255.0;
    float r = floor(temp) / 255.0;\n' +
    temp = (temp - 255.0) * 255.0;
    float g = floor(temp) / 255.0;
    temp = (temp - 255.0) * 255.0;
    float b = floor(temp) / 255.0;
    return vec3(r, g, b);
 }
