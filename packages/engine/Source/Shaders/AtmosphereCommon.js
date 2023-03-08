//This file is automatically rebuilt by the Cesium build process.
export default "uniform vec3 u_radiiAndDynamicAtmosphereColor;\n\
\n\
uniform float u_atmosphereLightIntensity;\n\
uniform float u_atmosphereRayleighScaleHeight;\n\
uniform float u_atmosphereMieScaleHeight;\n\
uniform float u_atmosphereMieAnisotropy;\n\
uniform vec3 u_atmosphereRayleighCoefficient;\n\
uniform vec3 u_atmosphereMieCoefficient;\n\
\n\
const float ATMOSPHERE_THICKNESS = 111e3; // The thickness of the atmosphere in meters.\n\
const int PRIMARY_STEPS = 16; // Number of times the ray from the camera to the world position (primary ray) is sampled.\n\
const int LIGHT_STEPS = 4; // Number of times the light is sampled from the light source's intersection with the atmosphere to a sample position on the primary ray.\n\
\n\
/**\n\
 * This function computes the colors contributed by Rayliegh and Mie scattering on a given ray, as well as\n\
 * the transmittance value for the ray.\n\
 *\n\
 * @param {czm_ray} primaryRay The ray from the camera to the position.\n\
 * @param {float} primaryRayLength The length of the primary ray.\n\
 * @param {vec3} lightDirection The direction of the light to calculate the scattering from.\n\
 * @param {vec3} rayleighColor The variable the Rayleigh scattering will be written to.\n\
 * @param {vec3} mieColor The variable the Mie scattering will be written to.\n\
 * @param {float} opacity The variable the transmittance will be written to.\n\
 * @glslFunction\n\
 */\n\
void computeScattering(\n\
    czm_ray primaryRay,\n\
    float primaryRayLength,\n\
    vec3 lightDirection,\n\
    float atmosphereInnerRadius,\n\
    out vec3 rayleighColor,\n\
    out vec3 mieColor,\n\
    out float opacity\n\
) {\n\
\n\
    // Initialize the default scattering amounts to 0.\n\
    rayleighColor = vec3(0.0);\n\
    mieColor = vec3(0.0);\n\
    opacity = 0.0;\n\
\n\
    float atmosphereOuterRadius = atmosphereInnerRadius + ATMOSPHERE_THICKNESS;\n\
\n\
    vec3 origin = vec3(0.0);\n\
\n\
    // Calculate intersection from the camera to the outer ring of the atmosphere.\n\
    czm_raySegment primaryRayAtmosphereIntersect = czm_raySphereIntersectionInterval(primaryRay, origin, atmosphereOuterRadius);\n\
\n\
    // Return empty colors if no intersection with the atmosphere geometry.\n\
    if (primaryRayAtmosphereIntersect == czm_emptyRaySegment) {\n\
        return;\n\
    }\n\
\n\
    // The ray should start from the first intersection with the outer atmopshere, or from the camera position, if it is inside the atmosphere.\n\
    primaryRayAtmosphereIntersect.start = max(primaryRayAtmosphereIntersect.start, 0.0);\n\
    // The ray should end at the exit from the atmosphere or at the distance to the vertex, whichever is smaller.\n\
    primaryRayAtmosphereIntersect.stop = min(primaryRayAtmosphereIntersect.stop, length(primaryRayLength));\n\
\n\
    // Setup for sampling positions along the ray - starting from the intersection with the outer ring of the atmosphere.\n\
    float rayStepLength = (primaryRayAtmosphereIntersect.stop - primaryRayAtmosphereIntersect.start) / float(PRIMARY_STEPS);\n\
    float rayPositionLength = primaryRayAtmosphereIntersect.start;\n\
\n\
    vec3 rayleighAccumulation = vec3(0.0);\n\
    vec3 mieAccumulation = vec3(0.0);\n\
    vec2 opticalDepth = vec2(0.0);\n\
    vec2 heightScale = vec2(u_atmosphereRayleighScaleHeight, u_atmosphereMieScaleHeight);\n\
\n\
    // Sample positions on the primary ray.\n\
    for (int i = 0; i < PRIMARY_STEPS; i++) {\n\
        // Calculate sample position along viewpoint ray.\n\
        vec3 samplePosition = primaryRay.origin + primaryRay.direction * (rayPositionLength + rayStepLength);\n\
        \n\
        // Calculate height of sample position above ellipsoid.\n\
        float sampleHeight = length(samplePosition) - atmosphereInnerRadius;\n\
\n\
        // Calculate and accumulate density of particles at the sample position.\n\
        vec2 sampleDensity = exp(-sampleHeight / heightScale) * rayStepLength;\n\
        opticalDepth += sampleDensity;\n\
\n\
        // Generate ray from the sample position segment to the light source, up to the outer ring of the atmosphere.\n\
        czm_ray lightRay = czm_ray(samplePosition, lightDirection);\n\
        czm_raySegment lightRayAtmosphereIntersect = czm_raySphereIntersectionInterval(lightRay, origin, atmosphereOuterRadius);\n\
        \n\
        float lightStepLength = lightRayAtmosphereIntersect.stop / float(LIGHT_STEPS);\n\
        float lightPositionLength = 0.0;\n\
\n\
        vec2 lightOpticalDepth = vec2(0.0);\n\
\n\
        // Sample positions along the light ray, to accumulate incidence of light on the latest sample segment.\n\
        for (int j = 0; j < LIGHT_STEPS; j++) {\n\
\n\
            // Calculate sample position along light ray.\n\
            vec3 lightPosition = samplePosition + lightDirection * (lightPositionLength + lightStepLength * 0.5);\n\
\n\
            // Calculate height of the light sample position above ellipsoid.\n\
            float lightHeight = length(lightPosition) - atmosphereInnerRadius;\n\
\n\
            // Calculate density of photons at the light sample position.\n\
            lightOpticalDepth += exp(-lightHeight / heightScale) * lightStepLength;\n\
\n\
            // Increment distance on light ray.\n\
            lightPositionLength += lightStepLength;\n\
        }\n\
\n\
        // Compute attenuation via the primary ray and the light ray.\n\
        vec3 attenuation = exp(-((u_atmosphereMieCoefficient * (opticalDepth.y + lightOpticalDepth.y)) + (u_atmosphereRayleighCoefficient * (opticalDepth.x + lightOpticalDepth.x))));\n\
\n\
        // Accumulate the scattering.\n\
        rayleighAccumulation += sampleDensity.x * attenuation;\n\
        mieAccumulation += sampleDensity.y * attenuation;\n\
\n\
        // Increment distance on primary ray.\n\
        rayPositionLength += rayStepLength;\n\
    }\n\
\n\
    // Compute the scattering amount.\n\
    rayleighColor = u_atmosphereRayleighCoefficient * rayleighAccumulation;\n\
    mieColor = u_atmosphereMieCoefficient * mieAccumulation;\n\
\n\
    // Compute the transmittance i.e. how much light is passing through the atmosphere.\n\
    opacity = length(exp(-((u_atmosphereMieCoefficient * opticalDepth.y) + (u_atmosphereRayleighCoefficient * opticalDepth.x))));\n\
}\n\
\n\
vec4 computeAtmosphereColor(\n\
    vec3 positionWC,\n\
    vec3 lightDirection,\n\
    vec3 rayleighColor,\n\
    vec3 mieColor,\n\
    float opacity\n\
) {\n\
    // Setup the primary ray: from the camera position to the vertex position.\n\
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;\n\
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);\n\
\n\
    float cosAngle = dot(cameraToPositionWCDirection, lightDirection);\n\
    float cosAngleSq = cosAngle * cosAngle;\n\
\n\
    float G = u_atmosphereMieAnisotropy;\n\
    float GSq = G * G;\n\
\n\
    // The Rayleigh phase function.\n\
    float rayleighPhase = 3.0 / (50.2654824574) * (1.0 + cosAngleSq);\n\
    // The Mie phase function.\n\
    float miePhase = 3.0 / (25.1327412287) * ((1.0 - GSq) * (cosAngleSq + 1.0)) / (pow(1.0 + GSq - 2.0 * cosAngle * G, 1.5) * (2.0 + GSq));\n\
\n\
    // The final color is generated by combining the effects of the Rayleigh and Mie scattering.\n\
    vec3 rayleigh = rayleighPhase * rayleighColor;\n\
    vec3 mie = miePhase * mieColor;\n\
\n\
    vec3 color = (rayleigh + mie) * u_atmosphereLightIntensity;\n\
\n\
    return vec4(color, opacity);\n\
}\n\
";
