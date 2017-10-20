#extension GL_OES_standard_derivatives : enable

uniform sampler2D u_colorTexture;
uniform sampler2D u_randomTexture;
uniform sampler2D u_depthTexture;
uniform float u_intensity;
uniform float u_bias;
uniform float u_lenCap;
uniform float u_stepSize;
varying vec2 v_textureCoordinates;

vec2 ScreenToView(vec2 uv)
{
    return vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y)*2.0 - 1.0)) ;
}

//Reconstruct Normal from View position
vec3 GetNormal(vec3 posInCamera)
{
    vec3 d1 = dFdx(posInCamera);;
    vec3 d2 = dFdy(posInCamera);
    return normalize(cross(d2, d1));
}

//Reconstruct Normal Without Edge Removation
vec3 GetNormalXedge(vec3 posInCamera, float depthU, float depthD, float depthL, float depthR, vec2 pixelSize)
{
    vec4 posInCameraUp = czm_inverseProjection * vec4(ScreenToView(v_textureCoordinates - vec2(0.0, pixelSize.y)), depthU, 1.0);
    posInCameraUp = posInCameraUp / posInCameraUp.w;
    vec4 posInCameraDown = czm_inverseProjection * vec4(ScreenToView(v_textureCoordinates + vec2(0.0, pixelSize.y)), depthD, 1.0);
    posInCameraDown = posInCameraDown / posInCameraDown.w;
    vec4 posInCameraLeft = czm_inverseProjection * vec4(ScreenToView(v_textureCoordinates - vec2(pixelSize.x, 0.0)), depthL, 1.0);
    posInCameraLeft = posInCameraLeft / posInCameraLeft.w;
    vec4 posInCameraRight = czm_inverseProjection * vec4(ScreenToView(v_textureCoordinates + vec2(pixelSize.x, 0.0)), depthR, 1.0);
    posInCameraRight = posInCameraRight / posInCameraRight.w;
    vec3 UC = posInCamera.xyz - posInCameraUp.xyz;
    vec3 DC = posInCameraDown.xyz - posInCamera.xyz;
    vec3 LC = posInCamera.xyz - posInCameraLeft.xyz;
    vec3 RC = posInCameraRight.xyz - posInCamera.xyz;
    vec3 DX;
    vec3 DY;

    if (length(UC) < length(DC))
    {
        DY = UC;
    }
    else
    {
        DY = DC;
    }

    if (length(LC) < length(RC))
    {
        DX = LC;
    }
    else
    {
       DX = RC;
    }

    return normalize(cross(DY, DX));
}

void main(void)
{
    float depth = texture2D(u_depthTexture, v_textureCoordinates).r;

    vec4 posInCamera = czm_inverseProjection * vec4(ScreenToView(v_textureCoordinates), depth, 1.0);
    posInCamera = posInCamera / posInCamera.w;

    if(posInCamera.z < 1000.0)
    {
        vec2 pixelSize = 1.0 / czm_viewport.zw;
        float depthU = texture2D(u_depthTexture, v_textureCoordinates- vec2(0.0, pixelSize.y)).r;
        float depthD = texture2D(u_depthTexture, v_textureCoordinates+ vec2(0.0, pixelSize.y)).r;
        float depthL = texture2D(u_depthTexture, v_textureCoordinates- vec2(pixelSize.x, 0.0)).r;
        float depthR = texture2D(u_depthTexture, v_textureCoordinates+ vec2(pixelSize.x, 0.0)).r;
        vec3 normalInCamera = GetNormalXedge(posInCamera.xyz, depthU, depthD, depthL, depthR, pixelSize);

        float AO = 0.0;
        vec2 sampleDirection = vec2(1.0, 0.0);
        float gapAngle = 90.0;

        // DegreeToRadian
        gapAngle *= 0.01745329252;

        // RandomNoise
        vec2 noiseMapSize = vec2(256.0, 256.0);
        vec2 noiseScale = vec2(czm_viewport.z /  noiseMapSize.x, czm_viewport.w / noiseMapSize.y);
        float randomVal = clamp(texture2D(u_randomTexture, v_textureCoordinates*noiseScale).x, 0.0, 1.0);

        //Loop for each direction
        for (int i = 0; i < 4; i++)
        {
            float newgapAngle = gapAngle * (float(i) + randomVal);
            float cosVal = cos(newgapAngle);
            float sinVal = sin(newgapAngle);

            //Rotate Sampling Direction
            vec2 rotatedSampleDirection = vec2(cosVal * sampleDirection.x - sinVal * sampleDirection.y, sinVal * sampleDirection.x + cosVal * sampleDirection.y);
            float localAO = 0.0;
            float localStepSize = u_stepSize;

            //Loop for each step
            for (int j = 0; j < 6; j++)
            {
                vec2 directionWithStep = vec2(rotatedSampleDirection.x * localStepSize * (1.0 / czm_viewport.z), rotatedSampleDirection.y * localStepSize * (1.0 / czm_viewport.w));
                vec2 newCoords = directionWithStep + v_textureCoordinates;

                //Exception Handling
                if(newCoords.x > 1.0 || newCoords.y > 1.0 || newCoords.x < 0.0 || newCoords.y < 0.0)
                    break;

                float stepDepthInfo = texture2D(u_depthTexture, newCoords).r;
                vec4 stepPosInCamera = czm_inverseProjection * vec4(ScreenToView(newCoords), stepDepthInfo, 1.0);
                stepPosInCamera = stepPosInCamera / stepPosInCamera.w;
                vec3 diffVec = stepPosInCamera.xyz - posInCamera.xyz;
                float len = length(diffVec);

                if(len <= u_lenCap)
                {
                    float dotVal = clamp(dot(normalInCamera, normalize(diffVec)), 0.0, 1.0 );
                    float weight = len / u_lenCap;
                    weight = 1.0 - weight*weight;

                    if(dotVal < u_bias)
                        dotVal = 0.0;

                    localAO = max(localAO, dotVal * weight);
                    localStepSize += u_stepSize;
                }
                else
                {
                    break;
                }
            }
            AO += localAO;
        }

        AO /= float(4);
        AO = 1.0 - clamp(AO, 0.0, 1.0);
        AO = pow(AO, u_intensity);
        gl_FragColor = vec4(vec3(AO), 1.0);
    }
    else
    {
        gl_FragColor = vec4(1.0);
    }
}
