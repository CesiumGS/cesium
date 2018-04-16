//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Converts an RGB color to CIE Yxy.\n\
 * <p>The conversion is described in\n\
 * {@link http://content.gpwiki.org/index.php/D3DBook:High-Dynamic_Range_Rendering#Luminance_Transform|Luminance Transform}\n\
 * </p>\n\
 * \n\
 * @name czm_RGBToXYZ\n\
 * @glslFunction\n\
 * \n\
 * @param {vec3} rgb The color in RGB.\n\
 *\n\
 * @returns {vec3} The color in CIE Yxy.\n\
 *\n\
 * @example\n\
 * vec3 xyz = czm_RGBToXYZ(rgb);\n\
 * xyz.x = max(xyz.x - luminanceThreshold, 0.0);\n\
 * rgb = czm_XYZToRGB(xyz);\n\
 */\n\
vec3 czm_RGBToXYZ(vec3 rgb)\n\
{\n\
    const mat3 RGB2XYZ = mat3(0.4124, 0.2126, 0.0193,\n\
                              0.3576, 0.7152, 0.1192,\n\
                              0.1805, 0.0722, 0.9505);\n\
    vec3 xyz = RGB2XYZ * rgb;\n\
    vec3 Yxy;\n\
    Yxy.r = xyz.g;\n\
    float temp = dot(vec3(1.0), xyz);\n\
    Yxy.gb = xyz.rg / temp;\n\
    return Yxy;\n\
}\n\
";
});