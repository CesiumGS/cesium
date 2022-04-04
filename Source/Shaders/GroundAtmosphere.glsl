const float ATMOSPHERE_THICKNESS = 111e3; // The thickness of the atmosphere in meters.
const float G = 0.9; // The anisotropy of the medium. Only used in the phase function for Mie scattering.
const float RAYLEIGH_HEIGHT_LIMIT = 10e3; // The height at which Rayleigh scattering stops.
const float MIE_HEIGHT_LIMIT = 3.2e3; // The height at which Mie scattering stops.
const vec3 BETA_RAYLEIGH = vec3(5.8e-6, 13.5e-6, 33.1e-6); // Better constants from Precomputed Atmospheric Scattering (https://hal.inria.fr/inria-00288758/document)
const vec3 BETA_MIE = vec3(21e-6);
const vec3 LIGHT_INTENSITY = vec3(15.0);
const int PRIMARY_STEPS = 16; // Number of times the ray from the camera to the world position (primary ray) is sampled.
const int LIGHT_STEPS = 4; // Number of times the light is sampled from the light source's intersection with the atmosphere to a sample position on the primary ray.

/**
 * This function computes the colors contributed by Rayliegh and Mie scattering at a given position, as well as
 * the opacity for the scattering.
 *
 * This function uses a similar algorithm to the SkyAtmosphere shader, however, there are some differences, such as
 * atmosphere radii and the computation of the transmittance value (written into the opacity).
 *
 * @param {vec3} positionWC The world position at which to calculate the scattering colors.
 * @param {vec3} lightDirection The direction of the light to calculate the scattering from.
 * @param {vec3} rayleighColor The variable the rayleigh color will be written to.
 * @param {vec3} mieColor The variable the mie color will be written to.
 * @param {float} opacity The variable the opacity will be written to.
 * @glslFunction
 */
void computeAtmosphericScattering(
    vec3 positionWC,
    vec3 lightDirection,
    out vec3 rayleighColor,
    out vec3 mieColor,
    out float opacity
) {
    // Initialize the default scattering amounts to 0.
    rayleighColor = vec3(0.0);
    mieColor = vec3(0.0);
    opacity = 0.0;

    vec2 HEIGHT_SCALE = vec2(RAYLEIGH_HEIGHT_LIMIT, MIE_HEIGHT_LIMIT);

    // Setup the radii for the inner and outer ring of the atmosphere.
    float atmosphereInnerRadius = length(positionWC);
    float atmosphereOuterRadius = atmosphereInnerRadius + ATMOSPHERE_THICKNESS;

    // Setup the primary ray: from the camera position to the vertex position.
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);
    czm_ray primaryRay = czm_ray(czm_viewerPositionWC, cameraToPositionWCDirection);

    // Calculate intersection from the camera to the outer ring of the atmosphere.
    vec3 origin = vec3(0.0);
    czm_raySegment primaryRayAtmosphereIntersect = czm_raySphereIntersectionInterval(primaryRay, origin, atmosphereOuterRadius);

    // Return empty colors if no intersection with the atmosphere geometry.
    if (primaryRayAtmosphereIntersect == czm_emptyRaySegment) {
        return;
    }

    // The ray should start from the first intersection with the outer atmopshere, or from the camera position, if it is inside the atmosphere.
    primaryRayAtmosphereIntersect.start = max(primaryRayAtmosphereIntersect.start, 0.0);
    // The ray should end at the exit from the atmosphere or at the distance to the vertex, whichever is smaller.
    primaryRayAtmosphereIntersect.stop = min(primaryRayAtmosphereIntersect.stop, length(cameraToPositionWC));

    // Set up for sampling positions along the ray - starting from the intersection with the outer ring of the atmosphere.
    float rayStepLength = (primaryRayAtmosphereIntersect.stop - primaryRayAtmosphereIntersect.start) / float(PRIMARY_STEPS);
    float rayPositionLength = primaryRayAtmosphereIntersect.start;

    vec3 rayleighAccumulation = vec3(0.0);
    vec3 mieAccumulation = vec3(0.0);
    vec2 opticalDepth = vec2(0.0);

    // Sample positions along the primary ray.
    for (int i = 0; i < PRIMARY_STEPS; i++) {

        // Calculate sample position along viewpoint ray.
        vec3 samplePosition = czm_viewerPositionWC + cameraToPositionWCDirection * (rayPositionLength + rayStepLength);

        // Calculate height of sample position above ellipsoid.
        float sampleHeight = length(samplePosition) - atmosphereInnerRadius;

        // Calculate density of particles at the sample position.
        vec2 sampleDensity = exp(-sampleHeight / HEIGHT_SCALE) * rayStepLength;

        // Add these densities to the optical depth, so that we know how many particles are on this ray.
        opticalDepth += sampleDensity;

        // Generate ray from the sample position segment to the light source, up to the outer ring of the atmosphere.
        czm_ray lightRay = czm_ray(samplePosition, lightDirection);
        czm_raySegment lightAtmosphereIntersect = czm_raySphereIntersectionInterval(lightRay, origin, atmosphereOuterRadius);
        
        float lightStepLength = lightAtmosphereIntersect.stop / float(LIGHT_STEPS);
        float lightPositionLength = 0.0;

        vec2 lightOpticalDepth = vec2(0.0);

        // Sample positions along the light ray, to accumulate incidence of light on the latest sample segment.
        for (int j = 0; j < LIGHT_STEPS; j++) {

            // Calculate sample position along light ray.
            vec3 lightPosition = samplePosition + lightDirection * (lightPositionLength + lightStepLength * 0.5);

            // Calculate height of the light sample position above ellipsoid.
            float lightHeight = length(lightPosition) - atmosphereInnerRadius;

            // Calculate density of photons at the light sample position.
            lightOpticalDepth += exp(-lightHeight / HEIGHT_SCALE) * lightStepLength;

            // Increment distance on light ray.
            lightPositionLength += lightStepLength;
        }

        // Compute attenuation via the primary ray and the light ray.
        vec3 attenuation = exp(-((BETA_MIE * (opticalDepth.y + lightOpticalDepth.y)) + (BETA_RAYLEIGH * (opticalDepth.x + lightOpticalDepth.x))));

        // Accumulate the scattering.
        rayleighAccumulation += sampleDensity.x * attenuation;
        mieAccumulation += sampleDensity.y * attenuation;

        // Increment distance on primary ray.
        rayPositionLength += rayStepLength;
    }

    // Compute colors for each scattering type.
    rayleighColor = BETA_RAYLEIGH * rayleighAccumulation;
    mieColor = BETA_MIE * mieAccumulation;

    // Compute the transmittance i.e. how much light is passing through the atmosphere.
    opacity = length(exp(-((BETA_MIE * opticalDepth.y) + (BETA_RAYLEIGH * opticalDepth.x))));
}

vec4 computeFinalColor(vec3 positionWC, bool dynamicLighting, vec3 lightDirectionWC, vec3 rayleighColor, vec3 mieColor, float opacity)
{
    vec3 lightDirection = czm_branchFreeTernary(dynamicLighting, lightDirectionWC, normalize(positionWC));
    vec3 cameraToPositionRay = positionWC - czm_viewerPositionWC;
    vec3 direction = normalize(cameraToPositionRay);

    float cosAngle = dot(direction, lightDirection);
    float cosAngle2 = cosAngle * cosAngle;
    float G2 = G * G;

    // The Rayleigh phase function.
    float rayleighPhase = 3.0 / (50.2654824574) * (1.0 + cosAngle2);
    // The Mie phase function.
    float miePhase = 3.0 / (25.1327412287) * ((1.0 - G2) * (cosAngle2 + 1.0)) / (pow(1.0 + G2 - 2.0 * cosAngle * G, 1.5) * (2.0 + G2));

    // The final color is generated by combining the effects of the Rayleigh and Mie scattering.
    vec3 rayleigh = rayleighPhase * rayleighColor;
    vec3 mie = miePhase * mieColor;

    return vec4((rayleigh + mie) * LIGHT_INTENSITY, 1.0 - opacity);
}