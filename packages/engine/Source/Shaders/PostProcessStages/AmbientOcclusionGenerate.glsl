uniform sampler2D randomTexture;
uniform sampler2D depthTexture;
uniform float intensity;
uniform float bias;
uniform float lengthCap;
uniform float stepSize;
uniform float frustumLength;

in vec2 v_textureCoordinates;

vec4 clipToEye(vec2 uv, float depth)
{
    vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));
    vec4 posEC = czm_inverseProjection * vec4(xy, depth, 1.0);
    posEC = posEC / posEC.w;
    return posEC;
}

vec3 screenToEye(vec2 screenCoordinate)
{
    float depth = czm_readDepth(depthTexture, screenCoordinate);
    return clipToEye(screenCoordinate, depth).xyz;
}

// Reconstruct surface normal, avoiding edges
vec3 getNormalXEdge(vec3 positionEC, vec2 pixelSize)
{
    vec3 positionUp = screenToEye(v_textureCoordinates - vec2(0.0, pixelSize.y));
    vec3 positionDown = screenToEye(v_textureCoordinates + vec2(0.0, pixelSize.y));
    vec3 positionLeft = screenToEye(v_textureCoordinates - vec2(pixelSize.x, 0.0));
    vec3 positionRight = screenToEye(v_textureCoordinates + vec2(pixelSize.x, 0.0));

    vec3 up = positionEC - positionUp;
    vec3 down = positionDown - positionEC;
    vec3 left = positionEC - positionLeft;
    vec3 right = positionRight - positionEC;

    vec3 DX = length(left) < length(right) ? left : right;
    vec3 DY = length(up) < length(down) ? up : down;

    return normalize(cross(DY, DX));
}

void main(void)
{
    vec3 positionEC = screenToEye(v_textureCoordinates);

    if (positionEC.z > frustumLength)
    {
        out_FragColor = vec4(1.0);
        return;
    }

    vec2 pixelSize = czm_pixelRatio / czm_viewport.zw;
    vec3 normalEC = getNormalXEdge(positionEC, pixelSize);

    float ao = 0.0;

    const int ANGLE_STEPS = 4;
    float angleStepScale = 1.0 / float(ANGLE_STEPS);
    float angleStep = angleStepScale * czm_twoPi;
    float cosStep = cos(angleStep);
    float sinStep = sin(angleStep);
    mat2 rotateStep = mat2(cosStep, sinStep, -sinStep, cosStep);

    // Initial sampling direction (different for each pixel)
    float randomVal = texture(randomTexture, v_textureCoordinates / pixelSize / 255.0).x;
    vec2 sampleDirection = vec2(cos(angleStep * randomVal), sin(angleStep * randomVal));

    vec2 radialStepSize = stepSize * pixelSize;

    // Loop over sampling directions
    for (int i = 0; i < ANGLE_STEPS; i++)
    {
        sampleDirection = rotateStep * sampleDirection;

        float localAO = 0.0;
        vec2 radialStep = radialStepSize;

        for (int j = 0; j < 6; j++)
        {
            // Step along sampling direction, away from output pixel
            vec2 newCoords = v_textureCoordinates + sampleDirection * radialStep;

            // Exit if we stepped off the screen
            if (newCoords.x > 1.0 || newCoords.y > 1.0 || newCoords.x < 0.0 || newCoords.y < 0.0)
            {
                break;
            }

            vec3 stepPositionEC = screenToEye(newCoords);
            vec3 stepVector = stepPositionEC - positionEC;
            float stepLength = length(stepVector);

            if (stepLength > lengthCap)
            {
                break;
            }

            float dotVal = clamp(dot(normalEC, normalize(stepVector)), 0.0, 1.0);
            if (dotVal < bias)
            {
                dotVal = 0.0;
            }

            float weight = stepLength / lengthCap;
            weight = 1.0 - weight * weight;
            localAO = max(localAO, dotVal * weight);
            radialStep += radialStepSize;
        }
        ao += localAO;
    }

    ao *= angleStepScale;
    ao = 1.0 - clamp(ao, 0.0, 1.0);
    ao = pow(ao, intensity);
    out_FragColor = vec4(vec3(ao), 1.0);
}
