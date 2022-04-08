uniform vec3 u_radiiAndDynamicAtmosphereColor;

const float ATMOSPHERE_THICKNESS = 111e3; // The thickness of the atmosphere in meters.
const float G = 0.9; // The anisotropy of the medium. Only used in the phase function for Mie scattering.
const float RAYLEIGH_HEIGHT_LIMIT = 10e3; // The height at which Rayleigh scattering stops.
const float MIE_HEIGHT_LIMIT = 3.2e3; // The height at which Mie scattering stops.
const vec2 HEIGHT_SCALE = vec2(RAYLEIGH_HEIGHT_LIMIT, MIE_HEIGHT_LIMIT);
const vec3 BETA_RAYLEIGH = vec3(5.8e-6, 13.5e-6, 33.1e-6); // Better constants from Precomputed Atmospheric Scattering (https://hal.inria.fr/inria-00288758/document)
const vec3 BETA_MIE = vec3(21e-6);
const vec3 LIGHT_INTENSITY = vec3(100.0);
const int PRIMARY_STEPS = 16; // Number of times the ray from the camera to the world position (primary ray) is sampled.
const int LIGHT_STEPS = 4; // Number of times the light is sampled from the light source's intersection with the atmosphere to a sample position on the primary ray.

float interpolateByDistance(vec4 nearFarScalar, float distance)
{
    float startDistance = nearFarScalar.x;
    float startValue = nearFarScalar.y;
    float endDistance = nearFarScalar.z;
    float endValue = nearFarScalar.w;
    float t = clamp((distance - startDistance) / (endDistance - startDistance), 0.0, 1.0);
    return mix(startValue, endValue, t);
}

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
    out float opacity,
    out float translucent
) {

    // Initialize the default scattering amounts to 0.
    rayleighColor = vec3(0.0);
    mieColor = vec3(0.0);
    opacity = 0.0;
    translucent = 0.0;

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

    // Brighten the sky atmosphere under the Earth's atmosphere when translucency is enabled.
    #if defined(GLOBE_TRANSLUCENT)

        // Check for intersection with the inner radius of the atmopshere.
        czm_raySegment primaryRayEarthIntersect = czm_raySphereIntersectionInterval(primaryRay, origin, atmosphereInnerRadius + ellipsoidRadiiDifference);
        if (primaryRayEarthIntersect.start > 0.0 && primaryRayEarthIntersect.stop > 0.0) {
            
            // Compute accuration position on globe.
            vec3 direction = normalize(positionWC);
            czm_ray ellipsoidRay = czm_ray(positionWC, -direction);
            czm_raySegment ellipsoidIntersection = czm_rayEllipsoidIntersectionInterval(ellipsoidRay, origin, czm_ellipsoidInverseRadii);
            vec3 onEarth = positionWC - (direction * ellipsoidIntersection.start);

            // Control the color using the camera angle.
            float angle = dot(normalize(czm_viewerPositionWC), normalize(onEarth));

            // Control the opacity using the distance from Earth.
            opacity = interpolateByDistance(vec4(0.0, 1.0, czm_ellipsoidRadii.x, 0.0), length(czm_viewerPositionWC - onEarth));
            vec3 horizonColor = vec3(0.1, 0.2, 0.3);
            vec3 nearColor = vec3(0.0);

            rayleighColor = mix(nearColor, horizonColor, exp(-angle) * opacity);
            
            // Set the traslucent flag to avoid alpha adjustment in computeFinalColor funciton.
            translucent = 1.0;

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
    float rayStepLength = (primaryRayAtmosphereIntersect.stop - primaryRayAtmosphereIntersect.start) / float(PRIMARY_STEPS);
    float rayPositionLength = primaryRayAtmosphereIntersect.start;

    vec3 rayleighAccumulation = vec3(0.0);
    vec3 mieAccumulation = vec3(0.0);
    vec2 opticalDepth = vec2(0.0);

    // Sample positions on the primary ray.
    for (int i = 0; i < PRIMARY_STEPS; i++) {
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
        
        float lightStepLength = lightRayAtmosphereIntersect.stop / float(LIGHT_STEPS);
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

    // Compute final color and opacity.
    rayleighColor = BETA_RAYLEIGH * rayleighAccumulation;
    mieColor = allowMie ? BETA_MIE * mieAccumulation : vec3(0.0);
    
    // Alter the opacity based on how close the viewer is to the ground.
    // (0.0 = At edge of atmosphere, 1.0 = On ground)
    float cameraHeight = czm_eyeHeight + atmosphereInnerRadius;
    opacity = clamp((atmosphereOuterRadius - cameraHeight) / (atmosphereOuterRadius - atmosphereInnerRadius), 0.0, 1.0);

    // Alter alpha based on time of day (0.0 = night , 1.0 = day)
    float nightAlpha = (u_radiiAndDynamicAtmosphereColor.z != 0.0) ? clamp(dot(normalize(positionWC), lightDirection), 0.0, 1.0) : 1.0;
    opacity *= pow(nightAlpha, 0.5);
}


vec4 computeAtmosphereColor(
    vec3 positionWC,
    vec3 lightDirection,
    vec3 rayleighColor,
    vec3 mieColor,
    float opacity,
    float translucent
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

    vec3 color = (rayleigh + mie) * LIGHT_INTENSITY;

    if (translucent == 0.0) {
        opacity = mix(clamp(color.b, 0.0, 1.0), 1.0, opacity) * smoothstep(0.0, 1.0, czm_morphTime);
    }
    
    return vec4(color, opacity);
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