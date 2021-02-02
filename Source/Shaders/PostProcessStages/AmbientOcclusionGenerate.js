//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D randomTexture;\n\
uniform sampler2D depthTexture;\n\
uniform float intensity;\n\
uniform float bias;\n\
uniform float lengthCap;\n\
uniform float stepSize;\n\
uniform float frustumLength;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
vec4 clipToEye(vec2 uv, float depth)\n\
{\n\
    vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));\n\
    vec4 posEC = czm_inverseProjection * vec4(xy, depth, 1.0);\n\
    posEC = posEC / posEC.w;\n\
    return posEC;\n\
}\n\
\n\
//Reconstruct Normal Without Edge Removation\n\
vec3 getNormalXEdge(vec3 posInCamera, float depthU, float depthD, float depthL, float depthR, vec2 pixelSize)\n\
{\n\
    vec4 posInCameraUp = clipToEye(v_textureCoordinates - vec2(0.0, pixelSize.y), depthU);\n\
    vec4 posInCameraDown = clipToEye(v_textureCoordinates + vec2(0.0, pixelSize.y), depthD);\n\
    vec4 posInCameraLeft = clipToEye(v_textureCoordinates - vec2(pixelSize.x, 0.0), depthL);\n\
    vec4 posInCameraRight = clipToEye(v_textureCoordinates + vec2(pixelSize.x, 0.0), depthR);\n\
\n\
    vec3 up = posInCamera.xyz - posInCameraUp.xyz;\n\
    vec3 down = posInCameraDown.xyz - posInCamera.xyz;\n\
    vec3 left = posInCamera.xyz - posInCameraLeft.xyz;\n\
    vec3 right = posInCameraRight.xyz - posInCamera.xyz;\n\
\n\
    vec3 DX = length(left) < length(right) ? left : right;\n\
    vec3 DY = length(up) < length(down) ? up : down;\n\
\n\
    return normalize(cross(DY, DX));\n\
}\n\
\n\
void main(void)\n\
{\n\
    float depth = czm_readDepth(depthTexture, v_textureCoordinates);\n\
    vec4 posInCamera = clipToEye(v_textureCoordinates, depth);\n\
\n\
    if (posInCamera.z > frustumLength)\n\
    {\n\
        gl_FragColor = vec4(1.0);\n\
        return;\n\
    }\n\
\n\
    vec2 pixelSize = czm_pixelRatio / czm_viewport.zw;\n\
    float depthU = czm_readDepth(depthTexture, v_textureCoordinates - vec2(0.0, pixelSize.y));\n\
    float depthD = czm_readDepth(depthTexture, v_textureCoordinates + vec2(0.0, pixelSize.y));\n\
    float depthL = czm_readDepth(depthTexture, v_textureCoordinates - vec2(pixelSize.x, 0.0));\n\
    float depthR = czm_readDepth(depthTexture, v_textureCoordinates + vec2(pixelSize.x, 0.0));\n\
    vec3 normalInCamera = getNormalXEdge(posInCamera.xyz, depthU, depthD, depthL, depthR, pixelSize);\n\
\n\
    float ao = 0.0;\n\
    vec2 sampleDirection = vec2(1.0, 0.0);\n\
    float gapAngle = 90.0 * czm_radiansPerDegree;\n\
\n\
    // RandomNoise\n\
    float randomVal = texture2D(randomTexture, v_textureCoordinates).x;\n\
\n\
    //Loop for each direction\n\
    for (int i = 0; i < 4; i++)\n\
    {\n\
        float newGapAngle = gapAngle * (float(i) + randomVal);\n\
        float cosVal = cos(newGapAngle);\n\
        float sinVal = sin(newGapAngle);\n\
\n\
        //Rotate Sampling Direction\n\
        vec2 rotatedSampleDirection = vec2(cosVal * sampleDirection.x - sinVal * sampleDirection.y, sinVal * sampleDirection.x + cosVal * sampleDirection.y);\n\
        float localAO = 0.0;\n\
        float localStepSize = stepSize;\n\
\n\
        //Loop for each step\n\
        for (int j = 0; j < 6; j++)\n\
        {\n\
            vec2 newCoords = v_textureCoordinates + rotatedSampleDirection * localStepSize * pixelSize;\n\
\n\
            //Exception Handling\n\
            if(newCoords.x > 1.0 || newCoords.y > 1.0 || newCoords.x < 0.0 || newCoords.y < 0.0)\n\
            {\n\
                break;\n\
            }\n\
\n\
            float stepDepthInfo = czm_readDepth(depthTexture, newCoords);\n\
            vec4 stepPosInCamera = clipToEye(newCoords, stepDepthInfo);\n\
            vec3 diffVec = stepPosInCamera.xyz - posInCamera.xyz;\n\
            float len = length(diffVec);\n\
\n\
            if (len > lengthCap)\n\
            {\n\
                break;\n\
            }\n\
\n\
            float dotVal = clamp(dot(normalInCamera, normalize(diffVec)), 0.0, 1.0 );\n\
            float weight = len / lengthCap;\n\
            weight = 1.0 - weight * weight;\n\
\n\
            if (dotVal < bias)\n\
            {\n\
                dotVal = 0.0;\n\
            }\n\
\n\
            localAO = max(localAO, dotVal * weight);\n\
            localStepSize += stepSize;\n\
        }\n\
        ao += localAO;\n\
    }\n\
\n\
    ao /= 4.0;\n\
    ao = 1.0 - clamp(ao, 0.0, 1.0);\n\
    ao = pow(ao, intensity);\n\
    gl_FragColor = vec4(vec3(ao), 1.0);\n\
}\n\
";
