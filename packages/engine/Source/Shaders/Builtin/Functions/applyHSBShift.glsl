/**
 * Apply a color shift in HSB color space
 *
 *
 * @param {vec3} rgb The color in RGB space.
 * @param {vec3} hsbShift The amount to shift each component. The xyz components correspond to hue, saturation, and brightness. Shifting the hue by +/- 1.0 corresponds to shifting the hue by a full cycle. Saturation and brightness are clamped between 0 and 1 after the adjustment
 */
vec3 czm_applyHSBShift(vec3 rgb, vec3 hsbShift) {
    // Convert rgb color to hsb
    vec3 hsb = czm_RGBToHSB(rgb);

    // Perform hsb shift
    // Hue cycles around so no clamp is needed.
    hsb.x += hsbShift.x; // hue
    hsb.y = clamp(hsb.y + hsbShift.y, 0.0, 1.0); // saturation
    hsb.z = clamp(hsb.z + hsbShift.z, 0.0, 1.0); // brightness

    // Convert shifted hsb back to rgb
    return czm_HSBToRGB(hsb);
}
