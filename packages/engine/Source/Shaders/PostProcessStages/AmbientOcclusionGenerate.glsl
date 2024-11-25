precision highp float;

uniform sampler2D randomTexture;
uniform sampler2D depthTexture;
uniform float intensity;
uniform float bias;
uniform float lengthCap;
uniform int stepCount;
uniform int directionCount;

vec4 pixelToEye(vec2 screenCoordinate)
{
    vec2 uv = screenCoordinate / czm_viewport.zw;
    float depth = czm_readDepth(depthTexture, uv);
    vec2 xy = 2.0 * uv - vec2(1.0);
    vec4 posEC = czm_inverseProjection * vec4(xy, depth, 1.0);
    posEC = posEC / posEC.w;
    // Avoid numerical error at far plane
    if (depth >= 1.0) {
        posEC.z = czm_currentFrustum.y;
    }
    return posEC;
}

// Reconstruct surface normal in eye coordinates, avoiding edges
vec3 getNormalXEdge(vec3 positionEC)
{
    // Find the 3D surface positions at adjacent screen pixels
    vec2 centerCoord = gl_FragCoord.xy;
    vec3 positionLeft = pixelToEye(centerCoord + vec2(-1.0, 0.0)).xyz;
    vec3 positionRight = pixelToEye(centerCoord + vec2(1.0, 0.0)).xyz;
    vec3 positionUp = pixelToEye(centerCoord + vec2(0.0, 1.0)).xyz;
    vec3 positionDown = pixelToEye(centerCoord + vec2(0.0, -1.0)).xyz;

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
    vec4 positionEC = pixelToEye(gl_FragCoord.xy);

    // Exit if we are too close to the back of the frustum, where the depth value is invalid.
    float maxValidDepth = czm_currentFrustum.y - lengthCap;
    if (-positionEC.z > maxValidDepth)
    {
        out_FragColor = vec4(1.0);
        return;
    }

    vec3 normalEC = getNormalXEdge(positionEC.xyz);
    float gaussianVariance = lengthCap * sqrt(-positionEC.z);
    // Choose a step length such that the marching stops just before 3 * variance.
    float stepLength = 3.0 * gaussianVariance / (float(stepCount) + 1.0);
    float metersPerPixel = czm_metersPerPixel(positionEC, 1.0);
    // Minimum step is 1 pixel to avoid double sampling
    float pixelsPerStep = max(stepLength / metersPerPixel, 1.0);
    stepLength = pixelsPerStep * metersPerPixel;

    float angleStepScale = 1.0 / float(directionCount);
    float angleStep = angleStepScale * czm_twoPi;
    float cosStep = cos(angleStep);
    float sinStep = sin(angleStep);
    mat2 rotateStep = mat2(cosStep, sinStep, -sinStep, cosStep);

    // Initial sampling direction (different for each pixel)
    const float randomTextureSize = 255.0;
    vec2 randomTexCoord = fract(gl_FragCoord.xy / randomTextureSize);
    float randomVal = texture(randomTexture, randomTexCoord).x;
    vec2 sampleDirection = vec2(cos(angleStep * randomVal), sin(angleStep * randomVal));

    float ao = 0.0;
    // Loop over sampling directions
#if __VERSION__ == 300
    for (int i = 0; i < directionCount; i++)
    {
#else
    for (int i = 0; i < 16; i++)
    {
        if (i >= directionCount) {
            break;
        }
#endif
        sampleDirection = rotateStep * sampleDirection;

        float localAO = 0.0;
        vec2 radialStep = pixelsPerStep * sampleDirection;

#if __VERSION__ == 300
        for (int j = 0; j < stepCount; j++)
        {
#else
        for (int j = 0; j < 64; j++)
        {
            if (j >= stepCount) {
                break;
            }
#endif
            // Step along sampling direction, away from output pixel
            vec2 samplePixel = floor(gl_FragCoord.xy + float(j + 1) * radialStep) + vec2(0.5);

            // Exit if we stepped off the screen
            if (clamp(samplePixel, vec2(0.0), czm_viewport.zw) != samplePixel) {
                break;
            }

            // Compute step vector from output point to sampled point
            vec4 samplePositionEC = pixelToEye(samplePixel);
            vec3 stepVector = samplePositionEC.xyz - positionEC.xyz;

            // Estimate the angle from the surface normal.
            float dotVal = clamp(dot(normalEC, normalize(stepVector)), 0.0, 1.0);
            dotVal = czm_branchFreeTernary(dotVal > bias, dotVal, 0.0);
            dotVal = czm_branchFreeTernary(-samplePositionEC.z <= maxValidDepth, dotVal, 0.0);

            // Weight contribution based on the distance from the output point
            float sampleDistance = length(stepVector);
            float weight = gaussian(sampleDistance, gaussianVariance);
            localAO += weight * dotVal;
        }
        ao += localAO;
    }

    ao *= angleStepScale * stepLength;
    ao = 1.0 - clamp(ao, 0.0, 1.0);
    ao = pow(ao, intensity);
    out_FragColor = vec4(vec3(ao), 1.0);
}
