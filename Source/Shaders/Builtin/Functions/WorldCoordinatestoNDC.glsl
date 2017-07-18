/**
 * Calculates the normalized device coordinates from world coordinates.
 *
 * @name czm_WorldCoordinatestoNDC
 * @glslFunction
 *
 * @param {vec3} worldCoordinates object's position in world coordinates.
 *
 * @returns {vec4} The normalized device coordinates biased earth's x coordinate with length of its radius. 
 *
 * @example 
 * vec3 objWorldCoordinates = vec3(0.0, 0.0, 0.0);
 * vec4 result = czm_WorldCoordinatestoNDC(objWorldCoordinates);
 */

vec4 czm_WorldCoordinatestoNDC(vec3 worldCoordinates)
{
    vec4 worldCoordinates4 = vec4(worldCoordinates, 1.0);
    vec4 eyeCoordinates4 = czm_view * worldCoordinates4;
	worldCoordinates4 = czm_eyeToWindowCoordinates(eyeCoordinates4);
    return czm_viewportOrthographic * vec4(worldCoordinates4.xy, -worldCoordinates4.z, 1.0);
}
