/**
 * Gets the color with fog at a distance from the camera.
 *
 * @name czm_fog
 * @glslFunction
 *
 * @param {float} distanceToCamera The distance to the camera in meters.
 * @param {vec3} color The original color.
 * @param {vec3} fogColor The color of the fog.
 *
 * @returns {vec3} The color adjusted for fog at the distance from the camera.
 */
vec3 czm_fog(float distanceToCamera, vec3 color, vec3 fogColor)
{
    float scalar = distanceToCamera * czm_fogDensity;
    float fog = 1.0 - exp(-(scalar * scalar));
    return mix(color, fogColor, fog);
}

/**
 * Gets the color with fog at a distance from the camera.
 *
 * @name czm_fog
 * @glslFunction
 *
 * @param {float} distanceToCamera The distance to the camera in meters.
 * @param {vec3} color The original color.
 * @param {vec3} fogColor The color of the fog.
 * @param {float} fogModifierConstant A constant to modify the appearance of fog.
 *
 * @returns {vec3} The color adjusted for fog at the distance from the camera.
 */
vec3 czm_fog(float distanceToCamera, vec3 color, vec3 fogColor, float fogModifierConstant)
{
    float scalar = distanceToCamera * czm_fogDensity;
    float fog = 1.0 - exp(-((fogModifierConstant * scalar + fogModifierConstant) * (scalar * (1.0 + fogModifierConstant))));
    return mix(color, fogColor, fog);
}
