
#ifdef COLOR_CORRECT
uniform vec3 u_hsbShift; // Hue, saturation, brightness
#endif

uniform vec3 u_radiiAndDynamicAtmosphereColor; // outer radius, inner radius, dynamic atmosphere color flag

vec3 getLightDirection(vec3 positionWC)
{
    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;
    vec3 lightDirection =
        positionWC * float(lightEnum == 0.0) +
        czm_lightDirectionWC * float(lightEnum == 1.0) +
        czm_sunDirectionWC * float(lightEnum == 2.0);
    return normalize(lightDirection);
}

czm_raySegment rayEllipsoidIntersection(czm_ray ray, vec3 inverseRadii)
{
    vec3 o = inverseRadii * (czm_inverseView * vec4(ray.origin, 1.0)).xyz;
    vec3 d = inverseRadii * (czm_inverseView * vec4(ray.direction, 0.0)).xyz;

    float a = dot(d, d);
    float b = dot(d, o);
    float c = dot(o, o) - 1.0;
    float discriminant = b * b - a * c;
    if (discriminant < 0.0)
    {
        return czm_emptyRaySegment;
    }
    discriminant = sqrt(discriminant);
    float t1 = (-b - discriminant) / a;
    float t2 = (-b + discriminant) / a;

    if (t1 < 0.0 && t2 < 0.0)
    {
        return czm_emptyRaySegment;
    }

    if (t1 < 0.0 && t2 >= 0.0)
    {
        t1 = 0.0;
    }

    return czm_raySegment(t1, t2);
}

float maxDistance = 10000000.0;

czm_raySegment raySphereIntersection(czm_ray ray, float radius)
{
    vec3 o = ray.origin;
    vec3 d = ray.direction;

    float a = dot(d, d);
    float b = 2.0 * dot(o, d);
    float c = dot(o, o) - (radius * radius);

    float det = (b * b) - (4.0 * a * c);

    if (det < 0.0) {
        return czm_emptyRaySegment;
    }

    float sqrtDet = sqrt(det);


    float t0 = (-b - sqrtDet) / (2.0 * a);
    float t1 = (-b + sqrtDet) / (2.0 * a);

    return czm_raySegment(t0, t1);
}

float planetRadius = 6356752.3142;
float ATMOSPHERE_THICKNESS = 111e3;

float G = 0.9;

float RAYLEIGH_HEIGHT_LIMIT = 10e3;
float MIE_HEIGHT_LIMIT = 3.2e3;

vec3 BETA_RAYLEIGH = vec3(5.5e-6, 13.0e-6, 22.4e-6);
vec3 BETA_MIE = vec3(21e-6);
vec3 BETA_AMBIENT = vec3(0.0);

vec3 LIGHT_INTENSITY = vec3(100.0);


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

    float AtmosphereRadius = u_radiiAndDynamicAtmosphereColor.x + ATMOSPHERE_THICKNESS;

    // Initialize the default scattering amounts to 0.
    rayleighColor = vec3(0.0);
    mieColor = vec3(0.0);
    opacity = 0.0;

    // Find the intersection from the ray to the outer ring of the atmosphere.
    czm_ray viewpointRay = czm_ray(start, direction);
    czm_raySegment viewpointAtmosphereIntersect = raySphereIntersection(viewpointRay, AtmosphereRadius);

    if (viewpointAtmosphereIntersect == czm_emptyRaySegment) {
        return;
    }

    viewpointAtmosphereIntersect.start = max(viewpointAtmosphereIntersect.start, 0.0);
    viewpointAtmosphereIntersect.stop = min(viewpointAtmosphereIntersect.stop, maxDistance);

    if (viewpointAtmosphereIntersect.start > viewpointAtmosphereIntersect.stop) {
        return;
    }

    // Prevent Mie glow on objects right in front of the camera.
    bool allowMie = maxDistance > viewpointAtmosphereIntersect.stop;

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
        czm_raySegment lightAtmosphereIntersect = raySphereIntersection(lightRay, AtmosphereRadius);
        
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
    mieColor = allowMie ? BETA_MIE * mieAccumulation : vec3(0.0);
    opacity = length(exp(-((BETA_MIE * opticalDepth.y) + (BETA_RAYLEIGH * opticalDepth.x))));
}

vec4 computeFinalColor(vec3 positionWC, vec3 direction, vec3 lightDirection, vec3 rayleighColor, vec3 mieColor, float opacity)
{
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

    vec4 color = vec4((rayleigh + mie) * LIGHT_INTENSITY, 1.0 - opacity);


    return color;
}
