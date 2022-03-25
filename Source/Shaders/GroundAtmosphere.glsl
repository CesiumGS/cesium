struct AtmosphereColor
{
    vec3 mie;
    vec3 rayleigh;
    float opacity;
};

float planetRadius = 6356752.3142;
float ATMOSPHERE_THICKNESS = 111e3;

float G = 0.9;

float RAYLEIGH_HEIGHT_LIMIT = 10e3;
float MIE_HEIGHT_LIMIT = 3.2e3;

vec3 BETA_RAYLEIGH = vec3(5.8e-6, 13.5e-6, 33.1e-6); // Better constants from Precomputed Atmospheric Scattering (https://hal.inria.fr/inria-00288758/document)
vec3 BETA_MIE = vec3(21e-6);

vec3 LIGHT_INTENSITY = vec3(14.0);

void computeScattering(
    vec3 start,
    vec3 direction,
    float maxDistance,
    vec3 lightDirection,
    out vec3 rayleighColor,
    out vec3 mieColor,
    out float opacity
) {
    const int PRIMARY_STEPS = 16;
    const int LIGHT_STEPS = 4;

    vec2 HEIGHT_SCALE = vec2(RAYLEIGH_HEIGHT_LIMIT, MIE_HEIGHT_LIMIT);

    float planetRadius = (length(czm_viewerPositionWC) - czm_eyeHeight) - (6378137.0 - 6356752.3142451);
    float AtmosphereRadius = planetRadius + ATMOSPHERE_THICKNESS;

    // Initialize the default scattering amounts to 0.
    rayleighColor = vec3(0.0);
    mieColor = vec3(0.0);
    opacity = 0.0;

    // Find the intersection from the ray to the outer ring of the atmosphere.
    czm_ray viewpointRay = czm_ray(start, direction);
    czm_raySegment viewpointAtmosphereIntersect = czm_raySphereIntersectionInterval(viewpointRay, vec3(0.0), AtmosphereRadius);

    if (viewpointAtmosphereIntersect == czm_emptyRaySegment) {
        return;
    }

    // The ray should start from the first intersection with the outer atmopshere, or from the camera position, if it is inside the atmosphere.
    viewpointAtmosphereIntersect.start = max(viewpointAtmosphereIntersect.start, 0.0);
    // The ray should end at the exit from the atmosphere or at the distance to the vertex, whichever is smaller.
    viewpointAtmosphereIntersect.stop = min(viewpointAtmosphereIntersect.stop, maxDistance);

    // Set up for sampling positions along the ray - starting from the intersection with the outer ring of the atmosphere.
    float rayStepLength = (viewpointAtmosphereIntersect.stop - viewpointAtmosphereIntersect.start) / float(PRIMARY_STEPS);
    float rayPositionLength = viewpointAtmosphereIntersect.start;

    vec3 rayleighAccumulation = vec3(0.0);
    vec3 mieAccumulation = vec3(0.0);
    vec2 opticalDepth = vec2(0.0);

    // Sample positions along the primary ray.
    for (int i = 0; i < PRIMARY_STEPS; ++i) {

        // Calculate sample position along viewpoint ray.
        vec3 samplePosition = start + direction * (rayPositionLength + rayStepLength);

        // Calculate height of sample position above ellipsoid.
        float sampleHeight = length(samplePosition) - planetRadius;

        // Calculate density of particles at the sample position.
        vec2 density = exp(-sampleHeight / HEIGHT_SCALE) * rayStepLength;

        // Add these densities to the optical depth, so that we know how many particles are on this ray.
        opticalDepth += density;

        // Generate ray from the sample position segment to the light source, up to the outer ring of the atmosphere.
        czm_ray lightRay = czm_ray(samplePosition, lightDirection);
        czm_raySegment lightAtmosphereIntersect = czm_raySphereIntersectionInterval(lightRay, vec3(0.0), AtmosphereRadius);
        
        float lightStepLength = lightAtmosphereIntersect.stop / float(LIGHT_STEPS);
        float lightPositionLength = 0.0;

        vec2 lightOpticalDepth = vec2(0.0);


        // Sample positions along the light ray, to accumulate incidence of light on the latest sample segment.
        for (int j = 0; j < LIGHT_STEPS; ++j) {

            // Calculate sample position along light ray.
            vec3 lightPosition = samplePosition + lightDirection * (lightPositionLength + lightStepLength * 0.5);

            // Calculate height of the light sample position above ellipsoid.
            float lightHeight = length(lightPosition) - planetRadius;

            // Calculate density of photons at the light sample position.
            lightOpticalDepth += exp(-lightHeight / HEIGHT_SCALE) * lightStepLength;

            // Increment distance on light ray.
            lightPositionLength += lightStepLength;
        }

        // Compute attenuation via the primary ray and the light ray.
        vec3 attenuation = exp(-((BETA_MIE * (opticalDepth.y + lightOpticalDepth.y)) + (BETA_RAYLEIGH * (opticalDepth.x + lightOpticalDepth.x))));

        // Accumulate the scattering.
        rayleighAccumulation += density.x * attenuation;
        mieAccumulation += density.y * attenuation;

        // Increment distance on primary ray.
        rayPositionLength += rayStepLength;
    }

    // Compute final color and opacity.
    rayleighColor = BETA_RAYLEIGH * rayleighAccumulation;
    mieColor = BETA_MIE * mieAccumulation;
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

AtmosphereColor computeGroundAtmosphereFromSpace(vec3 v3Pos, bool dynamicLighting, vec3 lightDirectionWC)
{
    vec3 cameraToPositionRay = v3Pos - czm_viewerPositionWC;
    vec3 direction = normalize(cameraToPositionRay);
    vec3 lightDirection = czm_branchFreeTernary(dynamicLighting, lightDirectionWC, normalize(v3Pos));

    float dist = length(cameraToPositionRay);

    vec3 mieColor;
    vec3 rayleighColor;
    float opacity;

    computeScattering(
        czm_viewerPositionWC,
        direction,
        dist,
        lightDirection,
        rayleighColor,
        mieColor,
        opacity
    );


    AtmosphereColor color;
    color.rayleigh = rayleighColor;
    color.mie = mieColor;
    color.opacity = opacity;

    return color;
}