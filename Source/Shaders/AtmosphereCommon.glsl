uniform vec3 u_radiiAndDynamicAtmosphereColor;

const float G = 0.9;
const float ATMOSPHERE_THICKNESS = 111e3;
const vec2 HEIGHT_SCALE = vec2(10e3, 3.2e3); // (Rayleigh, Mie) scales.
const vec3 BETA_RAYLEIGH = vec3(5.8e-6, 13.5e-6, 33.1e-6); // Better constants from Precomputed Atmospheric Scattering (https://hal.inria.fr/inria-00288758/document)
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

    // Adjust the radius of the sky atmosphere, so at far away distances, low LOD tiles don't show gaps.
    float distMin = u_radiiAndDynamicAtmosphereColor.x / 4.0;
    float distMax = u_radiiAndDynamicAtmosphereColor.x;
    float distAdjust = 10e3 * clamp((czm_eyeHeight - distMin) / (distMax - distMin), 0.2, 1.2);

    // Setup the radii for the inner and outer ring of the atmosphere.
    float ellipsoidRadiiDifference = (u_radiiAndDynamicAtmosphereColor.x - u_radiiAndDynamicAtmosphereColor.y) + distAdjust;
    float atmosphereInnerRadius = (length(czm_viewerPositionWC) - czm_eyeHeight) - ellipsoidRadiiDifference;
    float atmosphereOuterRadius = atmosphereInnerRadius + ATMOSPHERE_THICKNESS;

    // Setup the primary ray: from the camera position to the vertex position.
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);
    czm_ray primaryRay = czm_ray(czm_viewerPositionWC, cameraToPositionWCDirection);

    vec3 origin = vec3(0.0);

    // Calculate intersection from the camera to the outer ring of the atmosphere.
    czm_raySegment primaryRayAtmosphereIntersect = czm_raySphereIntersectionInterval(primaryRay, origin, atmosphereOuterRadius);

    // Return empty colors if intersects with globe geometry, if globe is translucent and camera is inside atmosphere.
    #if defined(GLOBE_TRANSLUCENT)
        czm_raySegment primaryRayEarthIntersect = czm_raySphereIntersectionInterval(primaryRay, origin, atmosphereInnerRadius + ellipsoidRadiiDifference);
        if (primaryRayEarthIntersect.start > 0.0 && primaryRayEarthIntersect.stop > 0.0) {
            return;
        }
    #endif

    // Return empty colors if no intersection with the atmosphere geometry.
    if (primaryRayAtmosphereIntersect == czm_emptyRaySegment) {
        return;
    }

    // Prevent Mie glow on objects right in front of the camera.
    bool allowMie = length(cameraToPositionWC) > primaryRayAtmosphereIntersect.stop;

    primaryRayAtmosphereIntersect.start = max(primaryRayAtmosphereIntersect.start, 0.0);
    primaryRayAtmosphereIntersect.stop = min(primaryRayAtmosphereIntersect.stop, length(cameraToPositionWC));

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
    
    // Alter the opacity based on how close the viewer is to the ground.
    // (0.0 = At edge of atmospher, 1.0 = On ground)
    float cameraHeight = czm_eyeHeight + atmosphereInnerRadius;
    opacity = clamp((atmosphereOuterRadius - cameraHeight) / (atmosphereOuterRadius - atmosphereInnerRadius), 0.0, 1.0);

    // Alter the opacity based on time of day.
    // (0.0 = Night, 1.0 = Day)
    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;
    float nightAlpha = (lightEnum != 0.0) ? clamp(dot(normalize(positionWC), lightDirection), 0.0, 1.0) : 1.0;
    opacity *= pow(nightAlpha, 0.5);
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

    vec3 color = (rayleigh + mie) * INTENSITY;
    opacity = mix(clamp(color.b, 0.0, 1.0), 1.0, opacity) * smoothstep(0.0, 1.0, czm_morphTime);
    
    return vec4((rayleigh + mie) * INTENSITY, opacity);
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