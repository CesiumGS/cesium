//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Gets the color with fog at a distance from the camera.\n\
 *\n\
 * @name czm_fog\n\
 * @glslFunction\n\
 *\n\
 * @param {float} distanceToCamera The distance to the camera in meters.\n\
 * @param {vec3} color The original color.\n\
 * @param {vec3} fogColor The color of the fog.\n\
 *\n\
 * @returns {vec3} The color adjusted for fog at the distance from the camera.\n\
 */\n\
vec3 czm_fog(float distanceToCamera, vec3 color, vec3 fogColor)\n\
{\n\
    float scalar = distanceToCamera * czm_fogDensity;\n\
    float fog = 1.0 - exp(-(scalar * scalar));\n\
    return mix(color, fogColor, fog);\n\
}\n\
\n\
/**\n\
 * Gets the color with fog at a distance from the camera.\n\
 *\n\
 * @name czm_fog\n\
 * @glslFunction\n\
 *\n\
 * @param {float} distanceToCamera The distance to the camera in meters.\n\
 * @param {vec3} color The original color.\n\
 * @param {vec3} fogColor The color of the fog.\n\
 * @param {float} fogModifierConstant A constant to modify the appearance of fog.\n\
 *\n\
 * @returns {vec3} The color adjusted for fog at the distance from the camera.\n\
 */\n\
vec3 czm_fog(float distanceToCamera, vec3 color, vec3 fogColor, float fogModifierConstant)\n\
{\n\
    float scalar = distanceToCamera * czm_fogDensity;\n\
    float fog = 1.0 - exp(-((fogModifierConstant * scalar + fogModifierConstant) * (scalar * (1.0 + fogModifierConstant))));\n\
    return mix(color, fogColor, fog);\n\
}\n\
";
});