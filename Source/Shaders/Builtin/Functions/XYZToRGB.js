    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Converts a CIE Yxy color to RGB.\n\
 * <p>The conversion is described in\n\
 * {@link http://content.gpwiki.org/index.php/D3DBook:High-Dynamic_Range_Rendering#Luminance_Transform|Luminance Transform}\n\
 * </p>\n\
 * \n\
 * @name czm_XYZToRGB\n\
 * @glslFunction\n\
 * \n\
 * @param {vec3} Yxy The color in CIE Yxy.\n\
 *\n\
 * @returns {vec3} The color in RGB.\n\
 *\n\
 * @example\n\
 * vec3 xyz = czm_RGBToXYZ(rgb);\n\
 * xyz.x = max(xyz.x - luminanceThreshold, 0.0);\n\
 * rgb = czm_XYZToRGB(xyz);\n\
 */\n\
vec3 czm_XYZToRGB(vec3 Yxy)\n\
{\n\
    const mat3 XYZ2RGB = mat3( 3.2405, -0.9693,  0.0556,\n\
                              -1.5371,  1.8760, -0.2040,\n\
                              -0.4985,  0.0416,  1.0572);\n\
    vec3 xyz;\n\
    xyz.r = Yxy.r * Yxy.g / Yxy.b;\n\
    xyz.g = Yxy.r;\n\
    xyz.b = Yxy.r * (1.0 - Yxy.g - Yxy.b) / Yxy.b;\n\
    \n\
    return XYZ2RGB * xyz;\n\
}\n\
";
});