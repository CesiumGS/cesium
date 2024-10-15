precision highp float;

uniform sampler2D randomTexture;
uniform sampler2D depthTexture;
uniform float intensity;
uniform float bias;
uniform float lengthCap;
uniform float stepSize;
uniform float frustumLength;

vec3 pixelToEye(vec2 screenCoordinate)
{
    vec2 uv = screenCoordinate / czm_viewport.zw;
    float depth = czm_readDepth(depthTexture, uv);
    vec2 xy = 2.0 * uv - vec2(1.0);
    vec4 posEC = czm_inverseProjection * vec4(xy, depth, 1.0);
    return posEC.xyz / posEC.w;
}

// Reconstruct surface normal in eye coordinates, avoiding edges
vec3 getNormalXEdge(vec3 positionEC)
{
    // Find the 3D surface positions at adjacent screen pixels
    vec2 centerCoord = gl_FragCoord.xy;
    vec3 positionLeft = pixelToEye(centerCoord + vec2(-1.0, 0.0));
    vec3 positionRight = pixelToEye(centerCoord + vec2(1.0, 0.0));
    vec3 positionUp = pixelToEye(centerCoord + vec2(0.0, 1.0));
    vec3 positionDown = pixelToEye(centerCoord + vec2(0.0, -1.0));

    // Compute potential tangent vectors
    vec3 dx0 = positionEC - positionLeft;
    vec3 dx1 = positionRight - positionEC;
    vec3 dy0 = positionEC - positionDown;
    vec3 dy1 = positionUp - positionEC;

    // The shorter tangent is more likely to be on the same surface
    vec3 dx = length(dx0) < length(dx1) ? dx0 : dx1;
    vec3 dy = length(dy0) < length(dy1) ? dy0 : dy1;

    return normalize(cross(dx, dy));
}

const float sqrtTwoPi = sqrt(czm_twoPi);

float gaussian(float x, float standardDeviation) {
    float argument = x / standardDeviation;
    return exp(-0.5 * argument * argument) / (sqrtTwoPi * standardDeviation);
}

void main(void)
{
    vec3 positionEC = pixelToEye(gl_FragCoord.xy);

    if (positionEC.z > frustumLength)
    {
        out_FragColor = vec4(1.0);
        return;
    }

    vec3 normalEC = getNormalXEdge(positionEC);
    float samplingRadius = lengthCap * sqrt(-positionEC.z);

    const int ANGLE_STEPS = 16;
    float angleStepScale = 1.0 / float(ANGLE_STEPS);
    float angleStep = angleStepScale * czm_twoPi;
    float cosStep = cos(angleStep);
    float sinStep = sin(angleStep);
    mat2 rotateStep = mat2(cosStep, sinStep, -sinStep, cosStep);

    const int RADIAL_STEPS = 64;
    float radialStepScale = 1.0 / float(RADIAL_STEPS);

    // Initial sampling direction (different for each pixel)
    const float randomTextureSize = 255.0;
    vec2 randomTexCoord = fract(gl_FragCoord.xy / randomTextureSize);
    float randomVal = texture(randomTexture, randomTexCoord).x;
    vec2 sampleDirection = vec2(cos(angleStep * randomVal), sin(angleStep * randomVal));

    float ao = 0.0;
    // Loop over sampling directions
    for (int i = 0; i < ANGLE_STEPS; i++)
    {
        sampleDirection = rotateStep * sampleDirection;

        float localAO = 0.0;
        float accumulatedWindowWeights = 0.0;
        vec2 radialStep = stepSize * sampleDirection;

        for (int j = 0; j < RADIAL_STEPS; j++)
        {
            // Step along sampling direction, away from output pixel
            vec2 newCoords = floor(gl_FragCoord.xy + float(j + 1) * radialStep) + vec2(0.5);

            // Exit if we stepped off the screen
            if (clamp(newCoords, vec2(0.0), czm_viewport.zw) != newCoords)
            {
                break;
            }

            // Compute distance along geometry, for weighting AO contribution
            vec3 stepPositionEC = pixelToEye(newCoords);
            vec3 stepVector = stepPositionEC - positionEC;
            float stepLength = length(stepVector);

            // Compute lateral distance from output point, for weight normalization
            vec3 inPlaneStepEC = vec3(stepPositionEC.x, stepPositionEC.y, positionEC.z);
            vec3 windowVector = inPlaneStepEC - positionEC;
            float windowLength = length(windowVector);

            float dotVal = clamp(dot(normalEC, normalize(stepVector)), 0.0, 1.0);
            if (dotVal < bias)
            {
                dotVal = 0.0;
            }

            float weight = gaussian(stepLength, samplingRadius);
            localAO += weight * dotVal;
            // TODO: This is slow! Better to analytically compute window scales
            accumulatedWindowWeights += gaussian(windowLength, samplingRadius);
        }
        ao += 24.0 * localAO / accumulatedWindowWeights;
    }

    ao *= angleStepScale * radialStepScale;
    ao = 1.0 - clamp(ao, 0.0, 1.0);
    ao = pow(ao, intensity);
    out_FragColor = vec4(vec3(ao), 1.0);
}
