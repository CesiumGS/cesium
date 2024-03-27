/**
 * Compute atmosphere scattering for the ground atmosphere and fog. This method
 * uses automatic uniforms so it is always synced with the scene settings.
 *
 * @name czm_computeGroundAtmosphereScattering
 * @glslfunction
 *
 * @param {vec3} positionWC The position of the fragment in world coordinates.
 * @param {vec3} lightDirection The direction of the light to calculate the scattering from.
 * @param {vec3} rayleighColor The variable the Rayleigh scattering will be written to.
 * @param {vec3} mieColor The variable the Mie scattering will be written to.
 * @param {float} opacity The variable the transmittance will be written to.
 */
void czm_computeGroundAtmosphereScattering(vec3 positionWC, vec3 lightDirection, out vec3 rayleighColor, out vec3 mieColor, out float opacity) {
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);
    czm_ray primaryRay = czm_ray(czm_viewerPositionWC, cameraToPositionWCDirection);

    float atmosphereInnerRadius = length(positionWC);

    czm_computeScattering(
        primaryRay,
        length(cameraToPositionWC),
        lightDirection,
        atmosphereInnerRadius,
        rayleighColor,
        mieColor,
        opacity
    );
}
