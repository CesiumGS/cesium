/**
 * Adjusts the saturation of a color.
 * 
 * @name czm_saturation
 * @glslFunction
 * 
 * @param {vec3} rgb The color.
 * @param {float} adjustment The amount to adjust the saturation of the color.
 *
 * @returns {float} The color with the saturation adjusted.
 *
 * @example
 * vec3 greyScale = czm_saturation(color, 0.0);
 * vec3 doubleSaturation = czm_saturation(color, 2.0);
 */
vec3 czm_saturation(vec3 rgb, float adjustment)
{
    // Algorithm from Chapter 16 of OpenGL Shading Language
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    vec3 intensity = vec3(dot(rgb, W));
    return mix(intensity, rgb, adjustment);
}
