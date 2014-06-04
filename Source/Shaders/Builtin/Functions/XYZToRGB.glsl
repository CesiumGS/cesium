/**
 * Converts a CIE Yxy color to RGB.
 * <p>The conversion is described in
 * {@link http://content.gpwiki.org/index.php/D3DBook:High-Dynamic_Range_Rendering#Luminance_Transform|Luminance Transform}
 * </p>
 * 
 * @name czm_XYZToRGB
 * @glslFunction
 * 
 * @param {vec3} Yxy The color in CIE Yxy.
 *
 * @returns {vec3} The color in RGB.
 *
 * @example
 * vec3 xyz = czm_RGBToXYZ(rgb);
 * xyz.x = max(xyz.x - luminanceThreshold, 0.0);
 * rgb = czm_XYZToRGB(xyz);
 */
vec3 czm_XYZToRGB(vec3 Yxy)
{
    const mat3 XYZ2RGB = mat3( 3.2405, -0.9693,  0.0556,
                              -1.5371,  1.8760, -0.2040,
                              -0.4985,  0.0416,  1.0572);
    vec3 xyz;
    xyz.r = Yxy.r * Yxy.g / Yxy.b;
    xyz.g = Yxy.r;
    xyz.b = Yxy.r * (1.0 - Yxy.g - Yxy.b) / Yxy.b;
    
    return XYZ2RGB * xyz;
}
