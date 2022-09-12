uniform sampler2D randomTexture;
uniform sampler2D depthTexture;
uniform float intensity;
uniform float bias;
uniform float lengthCap;
uniform float stepSize;
uniform float frustumLength;

varying vec2 v_textureCoordinates;

vec4 clipToEye(vec2 uv, float depth)
{
    vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));
    vec4 posEC = czm_inverseProjection * vec4(xy, depth, 1.0);
    posEC = posEC / posEC.w;
    return posEC;
}

//Reconstruct Normal Without Edge Removation
vec3 getNormalXEdge(vec3 posInCamera, float depthU, float depthD, float depthL, float depthR, vec2 pixelSize)
{
    vec4 posInCameraUp = clipToEye(v_textureCoordinates - vec2(0.0, pixelSize.y), depthU);
    vec4 posInCameraDown = clipToEye(v_textureCoordinates + vec2(0.0, pixelSize.y), depthD);
    vec4 posInCameraLeft = clipToEye(v_textureCoordinates - vec2(pixelSize.x, 0.0), depthL);
    vec4 posInCameraRight = clipToEye(v_textureCoordinates + vec2(pixelSize.x, 0.0), depthR);

    vec3 up = posInCamera.xyz - posInCameraUp.xyz;
    vec3 down = posInCameraDown.xyz - posInCamera.xyz;
    vec3 left = posInCamera.xyz - posInCameraLeft.xyz;
    vec3 right = posInCameraRight.xyz - posInCamera.xyz;

    vec3 DX = length(left) < length(right) ? left : right;
    vec3 DY = length(up) < length(down) ? up : down;

    return normalize(cross(DY, DX));
}

void main(void)
{
    float depth = czm_readDepth(depthTexture, v_textureCoordinates);
    vec4 posInCamera = clipToEye(v_textureCoordinates, depth);

    if (posInCamera.z > frustumLength)
    {
        gl_FragColor = vec4(1.0);
        return;
    }

    vec2 pixelSize = czm_pixelRatio / czm_viewport.zw;
    float depthU = czm_readDepth(depthTexture, v_textureCoordinates - vec2(0.0, pixelSize.y));
    float depthD = czm_readDepth(depthTexture, v_textureCoordinates + vec2(0.0, pixelSize.y));
    float depthL = czm_readDepth(depthTexture, v_textureCoordinates - vec2(pixelSize.x, 0.0));
    float depthR = czm_readDepth(depthTexture, v_textureCoordinates + vec2(pixelSize.x, 0.0));
    vec3 normalInCamera = getNormalXEdge(posInCamera.xyz, depthU, depthD, depthL, depthR, pixelSize);

    float ao = 0.0;
    vec2 sampleDirection = vec2(1.0, 0.0);
    float gapAngle = 90.0 * czm_radiansPerDegree;

    // RandomNoise
    float randomVal = texture2D(randomTexture, v_textureCoordinates).x;

    //Loop for each direction
    for (int i = 0; i < 4; i++)
    {
        float newGapAngle = gapAngle * (float(i) + randomVal);
        float cosVal = cos(newGapAngle);
        float sinVal = sin(newGapAngle);

        //Rotate Sampling Direction
        vec2 rotatedSampleDirection = vec2(cosVal * sampleDirection.x - sinVal * sampleDirection.y, sinVal * sampleDirection.x + cosVal * sampleDirection.y);
        float localAO = 0.0;
        float localStepSize = stepSize;

        //Loop for each step
        for (int j = 0; j < 6; j++)
        {
            vec2 newCoords = v_textureCoordinates + rotatedSampleDirection * localStepSize * pixelSize;

            //Exception Handling
            if(newCoords.x > 1.0 || newCoords.y > 1.0 || newCoords.x < 0.0 || newCoords.y < 0.0)
            {
                break;
            }

            float stepDepthInfo = czm_readDepth(depthTexture, newCoords);
            vec4 stepPosInCamera = clipToEye(newCoords, stepDepthInfo);
            vec3 diffVec = stepPosInCamera.xyz - posInCamera.xyz;
            float len = length(diffVec);

            if (len > lengthCap)
            {
                break;
            }

            float dotVal = clamp(dot(normalInCamera, normalize(diffVec)), 0.0, 1.0 );
            float weight = len / lengthCap;
            weight = 1.0 - weight * weight;

            if (dotVal < bias)
            {
                dotVal = 0.0;
            }

            localAO = max(localAO, dotVal * weight);
            localStepSize += stepSize;
        }
        ao += localAO;
    }

    ao /= 4.0;
    ao = 1.0 - clamp(ao, 0.0, 1.0);
    ao = pow(ao, intensity);
    gl_FragColor = vec4(vec3(ao), 1.0);
}
