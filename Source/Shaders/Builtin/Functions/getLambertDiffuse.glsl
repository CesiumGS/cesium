/**
 * Calculates the intensity of diffusely reflected light.
 *
 * @name czm_getLambertDiffuse
 * @glslFunction
 *
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.
 * @param {vec3} normalEC The surface normal in eye coordinates.
 *
 * @returns {float} The intensity of the diffuse reflection.
 *
 * @see czm_phong
 *
 * @example
 * float diffuseIntensity = czm_getLambertDiffuse(lightDirectionEC, normalEC);
 * float specularIntensity = czm_getSpecular(lightDirectionEC, toEyeEC, normalEC, 200);
 * vec3 color = (diffuseColor * diffuseIntensity) + (specularColor * specularIntensity);
 */
float czm_getLambertDiffuse(vec3 lightDirectionEC, vec3 normalEC)
{
    return max(dot(lightDirectionEC, normalEC), 0.0);
}