uniform vec3 u_radiiAndDynamicAtmosphereColor;

const float G = 0.9;
const float ATMOSPHERE_THICKNESS = 111e3;
const float MAX_RAY_HIT_DISTANCE = 10000000.0;
const vec2 HEIGHT_SCALE = vec2(10e3, 3.2e3); // (Rayleigh, Mie) scales.
const vec3 BETA_RAYLEIGH = vec3(5.5e-6, 13.0e-6, 22.4e-6);
const vec3 BETA_MIE = vec3(21e-6);
const vec3 INTENSITY = vec3(100.0);

/**
 * This function computes the colors contributed by Rayliegh and Mie scattering at a given position, as well as
 * the opacity for the scattering.
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

    // Extract the ray sampling parameteres that affect the visual quality.
    const float primaryRaySteps = 16.0;
    const float lightRaySteps = 4.0;


    // Setup the radii for the inner and outer ring of the atmosphere.
    float atmosphereInnerRadius = u_radiiAndDynamicAtmosphereColor.x;
    float atmosphereOuterRadius = atmosphereInnerRadius + ATMOSPHERE_THICKNESS;

    // Setup the primary ray: from the camera position to the vertex position.
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);
    czm_ray primaryRay = czm_ray(czm_viewerPositionWC, cameraToPositionWCDirection);

    vec3 origin = vec3(0.0);

    // Calculate intersection from the camera to the outer ring of the atmosphere.
    czm_raySegment primaryRayAtmosphereIntersect = czm_raySphereIntersectionInterval(primaryRay, origin, atmosphereOuterRadius);

    // Return empty colors if no intersection with the atmosphere geometry.
    if (primaryRayAtmosphereIntersect == czm_emptyRaySegment) {
        return;
    }

    // Prevent Mie glow on objects right in front of the camera.
    bool allowMie = MAX_RAY_HIT_DISTANCE > primaryRayAtmosphereIntersect.stop;

    primaryRayAtmosphereIntersect.start = max(primaryRayAtmosphereIntersect.start, 0.0);
    primaryRayAtmosphereIntersect.stop = min(primaryRayAtmosphereIntersect.stop, MAX_RAY_HIT_DISTANCE);

    if (primaryRayAtmosphereIntersect.start > primaryRayAtmosphereIntersect.stop) {
        return;
    }

    // Setup for sampling positions along the ray - starting from the intersection with the outer ring of the atmosphere.
    float rayStepLength = (primaryRayAtmosphereIntersect.stop - primaryRayAtmosphereIntersect.start) / primaryRaySteps;
    float rayPositionLength = primaryRayAtmosphereIntersect.start;

    vec3 rayleighAccumulation = vec3(0.0);
    vec3 mieAccumulation = vec3(0.0);
    vec2 opticalDepth = vec2(0.0);

    const int primaryRayStepsInt = int(primaryRaySteps);
    const int lightRayStepsInt = int(lightRaySteps);

    // Sample positions on the primary ray.
    for (int i = 0; i < primaryRayStepsInt; i++) {
        // Calculate sample position along viewpoint ray.
        vec3 samplePosition = czm_viewerPositionWC + cameraToPositionWCDirection * (rayPositionLength + rayStepLength);
        
        // Calculate height of sample position above ellipsoid.
        float sampleHeight = length(samplePosition) - atmosphereInnerRadius;

        // Calculate and accumulate density of particles at the sample position.
        vec2 sampleDensity = exp(-sampleHeight / HEIGHT_SCALE) * rayStepLength;
        opticalDepth += sampleDensity;

        // Generate ray from the sample position segment to the light source, up to the outer ring of the atmosphere.
        czm_ray lightRay = czm_ray(samplePosition, lightDirection);
        czm_raySegment lightRayAtmosphereIntersect = czm_raySphereIntersectionInterval(lightRay, origin, atmosphereOuterRadius);
        
        float lightStepLength = lightRayAtmosphereIntersect.stop / lightRaySteps;
        float lightPositionLength = 0.0;

        vec2 lightOpticalDepth = vec2(0.0);

        // Sample positions along the light ray, to accumulate incidence of light on the latest sample segment.
        for (int j = 0; j < lightRayStepsInt; j++) {

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

    // Compute final color and opacity.
    rayleighColor = BETA_RAYLEIGH * rayleighAccumulation;
    mieColor = allowMie ? BETA_MIE * mieAccumulation : vec3(0.0);
    opacity = length(exp(-((BETA_MIE * opticalDepth.y) + (BETA_RAYLEIGH * opticalDepth.x))));
}


vec4 computeAtmosphereColor(
    vec3 positionWC,
    vec3 lightDirection,
    vec3 rayleighColor,
    vec3 mieColor,
    float opacity
) {

    // Setup the primary ray: from the camera position to the vertex position.
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);

    float cosAngle = dot(cameraToPositionWCDirection, lightDirection);
    float cosAngleSq = cosAngle * cosAngle;
    float GSq = G * G;

    // The Rayleigh phase function.
    float rayleighPhase = 3.0 / (50.2654824574) * (1.0 + cosAngleSq);
    // The Mie phase function.
    float miePhase = 3.0 / (25.1327412287) * ((1.0 - GSq) * (cosAngleSq + 1.0)) / (pow(1.0 + GSq - 2.0 * cosAngle * G, 1.5) * (2.0 + GSq));

    // The final color is generated by combining the effects of the Rayleigh and Mie scattering.
    vec3 rayleigh = rayleighPhase * rayleighColor;
    vec3 mie = miePhase * mieColor;

    return vec4((rayleigh + mie) * INTENSITY, 1.0 - opacity);
}

vec3 getLightDirection(vec3 positionWC)
{
    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;
    vec3 lightDirection =
        positionWC * float(lightEnum == 0.0) +
        czm_lightDirectionWC * float(lightEnum == 1.0) +
        czm_sunDirectionWC * float(lightEnum == 2.0);
    return normalize(lightDirection);
}