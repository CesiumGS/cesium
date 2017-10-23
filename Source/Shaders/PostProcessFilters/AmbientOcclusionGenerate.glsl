uniform sampler2D u_colorTexture;
uniform sampler2D u_randomTexture;
uniform sampler2D u_depthTexture;
uniform float u_intensity;
uniform float u_bias;
uniform float u_lenCap;
uniform float u_stepSize;
uniform float u_frustumLength;

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
    float depth = texture2D(u_depthTexture, v_textureCoordinates).r;
    vec4 posInCamera = clipToEye(v_textureCoordinates, depth);

    if (posInCamera.z > u_frustumLength) {
        gl_FragColor = vec4(1.0);
        return;
    }

    vec2 pixelSize = 1.0 / czm_viewport.zw;
    float depthU = texture2D(u_depthTexture, v_textureCoordinates- vec2(0.0, pixelSize.y)).r;
    float depthD = texture2D(u_depthTexture, v_textureCoordinates+ vec2(0.0, pixelSize.y)).r;
    float depthL = texture2D(u_depthTexture, v_textureCoordinates- vec2(pixelSize.x, 0.0)).r;
    float depthR = texture2D(u_depthTexture, v_textureCoordinates+ vec2(pixelSize.x, 0.0)).r;
    vec3 normalInCamera = getNormalXEdge(posInCamera.xyz, depthU, depthD, depthL, depthR, pixelSize);

    float AO = 0.0;
    vec2 sampleDirection = vec2(1.0, 0.0);
    float gapAngle = 90.0 * czm_radiansPerDegree;

    // RandomNoise
    vec2 noiseMapSize = vec2(256.0, 256.0);
    vec2 noiseScale = vec2(czm_viewport.z /  noiseMapSize.x, czm_viewport.w / noiseMapSize.y);
    float randomVal = texture2D(u_randomTexture, v_textureCoordinates * noiseScale).x;

    float inverseViewportWidth = 1.0 / czm_viewport.z;
    float inverseViewportHeight = 1.0 / czm_viewport.w;

    //Loop for each direction
    for (int i = 0; i < 4; i++)
    {
        float newGapAngle = gapAngle * (float(i) + randomVal);
        float cosVal = cos(newGapAngle);
        float sinVal = sin(newGapAngle);

        //Rotate Sampling Direction
        vec2 rotatedSampleDirection = vec2(cosVal * sampleDirection.x - sinVal * sampleDirection.y, sinVal * sampleDirection.x + cosVal * sampleDirection.y);
        float localAO = 0.0;
        float localStepSize = u_stepSize;

        //Loop for each step
        for (int j = 0; j < 6; j++)
        {
            vec2 directionWithStep = vec2(rotatedSampleDirection.x * localStepSize * inverseViewportWidth, rotatedSampleDirection.y * localStepSize * inverseViewportHeight);
            vec2 newCoords = directionWithStep + v_textureCoordinates;

            //Exception Handling
            if(newCoords.x > 1.0 || newCoords.y > 1.0 || newCoords.x < 0.0 || newCoords.y < 0.0)
            {
                break;
            }

            float stepDepthInfo = texture2D(u_depthTexture, newCoords).r;
            vec4 stepPosInCamera = clipToEye(newCoords, stepDepthInfo);
            vec3 diffVec = stepPosInCamera.xyz - posInCamera.xyz;
            float len = length(diffVec);

            if (len > u_lenCap)
            {
                break;
            }

            float dotVal = clamp(dot(normalInCamera, normalize(diffVec)), 0.0, 1.0 );
            float weight = len / u_lenCap;
            weight = 1.0 - weight * weight;

            if(dotVal < u_bias)
            {
                dotVal = 0.0;
            }

            localAO = max(localAO, dotVal * weight);
            localStepSize += u_stepSize;
        }
        AO += localAO;
    }

    AO /= float(4);
    AO = 1.0 - clamp(AO, 0.0, 1.0);
    AO = pow(AO, u_intensity);
    gl_FragColor = vec4(vec3(AO), 1.0);
}
