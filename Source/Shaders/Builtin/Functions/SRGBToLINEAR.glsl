/**
 * Converts an sRGB color to a linear RGB color.
 *
 * @param {vec3|vec4} srgbIn The color in sRGB space
 * @returns {vec3|vec4} The color in linear color space. The vector type matches the input.
 */
vec3 czm_SRGBtoLINEAR(vec3 srgbIn)
{
    return pow(srgbIn, vec3(2.2));
}

vec4 czm_SRGBtoLINEAR(vec4 srgbIn) 
{
    vec3 linearOut = pow(srgbIn.rgb, vec3(2.2));
    return vec4(linearOut, srgbIn.a);
}
