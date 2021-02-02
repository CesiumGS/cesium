//This file is automatically rebuilt by the Cesium build process.
export default "uniform sampler2D colorTexture;\n\
uniform sampler2D dirtTexture;\n\
uniform sampler2D starTexture;\n\
uniform vec2 dirtTextureDimensions;\n\
uniform float distortion;\n\
uniform float ghostDispersal;\n\
uniform float haloWidth;\n\
uniform float dirtAmount;\n\
uniform float earthRadius;\n\
uniform float intensity;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
// whether it is in space or not\n\
// 6500000.0 is empirical value\n\
#define DISTANCE_TO_SPACE 6500000.0\n\
\n\
// return ndc from world coordinate biased earthRadius\n\
vec4 getNDCFromWC(vec3 WC, float earthRadius)\n\
{\n\
    vec4 positionEC = czm_view * vec4(WC, 1.0);\n\
    positionEC = vec4(positionEC.x + earthRadius, positionEC.y, positionEC.z, 1.0);\n\
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);\n\
    return czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);\n\
}\n\
\n\
// Check if current pixel is included Earth\n\
// if then mask it gradually\n\
float isInEarth(vec2 texcoord, vec2 sceneSize)\n\
{\n\
    vec2 NDC = texcoord * 2.0 - 1.0;\n\
    vec4 earthPosSC = getNDCFromWC(vec3(0.0), 0.0);\n\
    vec4 earthPosSCEdge = getNDCFromWC(vec3(0.0), earthRadius * 1.5);\n\
    NDC.xy -= earthPosSC.xy;\n\
\n\
    float X = abs(NDC.x) * sceneSize.x;\n\
    float Y = abs(NDC.y) * sceneSize.y;\n\
\n\
    return clamp(0.0, 1.0, max(sqrt(X * X + Y * Y) / max(abs(earthPosSCEdge.x * sceneSize.x), 1.0) - 0.8 , 0.0));\n\
}\n\
\n\
// For Chromatic effect\n\
vec4 textureDistorted(sampler2D tex, vec2 texcoord, vec2 direction, vec3 distortion, bool isSpace)\n\
{\n\
    vec2 sceneSize = czm_viewport.zw;\n\
    vec3 color;\n\
    if(isSpace)\n\
    {\n\
        color.r = isInEarth(texcoord + direction * distortion.r, sceneSize) * texture2D(tex, texcoord + direction * distortion.r).r;\n\
        color.g = isInEarth(texcoord + direction * distortion.g, sceneSize) * texture2D(tex, texcoord + direction * distortion.g).g;\n\
        color.b = isInEarth(texcoord + direction * distortion.b, sceneSize) * texture2D(tex, texcoord + direction * distortion.b).b;\n\
    }\n\
    else\n\
    {\n\
        color.r = texture2D(tex, texcoord + direction * distortion.r).r;\n\
        color.g = texture2D(tex, texcoord + direction * distortion.g).g;\n\
        color.b = texture2D(tex, texcoord + direction * distortion.b).b;\n\
    }\n\
    return vec4(clamp(color, 0.0, 1.0), 0.0);\n\
}\n\
\n\
void main(void)\n\
{\n\
    vec4 originalColor = texture2D(colorTexture, v_textureCoordinates);\n\
    vec3 rgb = originalColor.rgb;\n\
    bool isSpace = length(czm_viewerPositionWC.xyz) > DISTANCE_TO_SPACE;\n\
\n\
    // Sun position\n\
    vec4 sunPos = czm_morphTime == 1.0 ? vec4(czm_sunPositionWC, 1.0) : vec4(czm_sunPositionColumbusView.zxy, 1.0);\n\
    vec4 sunPositionEC = czm_view * sunPos;\n\
    vec4 sunPositionWC = czm_eyeToWindowCoordinates(sunPositionEC);\n\
    sunPos = czm_viewportOrthographic * vec4(sunPositionWC.xy, -sunPositionWC.z, 1.0);\n\
\n\
    // If sun is not in the screen space, use original color.\n\
    if(!isSpace || !((sunPos.x >= -1.1 && sunPos.x <= 1.1) && (sunPos.y >= -1.1 && sunPos.y <= 1.1)))\n\
    {\n\
        // Lens flare is disabled when not in space until #5932 is fixed.\n\
        //    https://github.com/CesiumGS/cesium/issues/5932\n\
        gl_FragColor = originalColor;\n\
        return;\n\
    }\n\
\n\
    vec2 texcoord = vec2(1.0) - v_textureCoordinates;\n\
    vec2 pixelSize = czm_pixelRatio / czm_viewport.zw;\n\
    vec2 invPixelSize = 1.0 / pixelSize;\n\
    vec3 distortionVec = pixelSize.x * vec3(-distortion, 0.0, distortion);\n\
\n\
    // ghost vector to image centre:\n\
    vec2 ghostVec = (vec2(0.5) - texcoord) * ghostDispersal;\n\
    vec3 direction = normalize(vec3(ghostVec, 0.0));\n\
\n\
    // sample ghosts:\n\
    vec4 result = vec4(0.0);\n\
    vec4 ghost = vec4(0.0);\n\
    for (int i = 0; i < 4; ++i)\n\
    {\n\
        vec2 offset = fract(texcoord + ghostVec * float(i));\n\
        // Only bright spots from the centre of the source image\n\
        ghost += textureDistorted(colorTexture, offset, direction.xy, distortionVec, isSpace);\n\
    }\n\
    result += ghost;\n\
\n\
    // sample halo\n\
    vec2 haloVec = normalize(ghostVec) * haloWidth;\n\
    float weightForHalo = length(vec2(0.5) - fract(texcoord + haloVec)) / length(vec2(0.5));\n\
    weightForHalo = pow(1.0 - weightForHalo, 5.0);\n\
\n\
    result += textureDistorted(colorTexture, texcoord + haloVec, direction.xy, distortionVec, isSpace) * weightForHalo * 1.5;\n\
\n\
    // dirt on lens\n\
    vec2 dirtTexCoords = (v_textureCoordinates * invPixelSize) / dirtTextureDimensions;\n\
    if (dirtTexCoords.x > 1.0)\n\
    {\n\
        dirtTexCoords.x = mod(floor(dirtTexCoords.x), 2.0) == 1.0 ? 1.0 - fract(dirtTexCoords.x) :  fract(dirtTexCoords.x);\n\
    }\n\
    if (dirtTexCoords.y > 1.0)\n\
    {\n\
        dirtTexCoords.y = mod(floor(dirtTexCoords.y), 2.0) == 1.0 ? 1.0 - fract(dirtTexCoords.y) :  fract(dirtTexCoords.y);\n\
    }\n\
    result += dirtAmount * texture2D(dirtTexture, dirtTexCoords);\n\
\n\
    // Rotating starburst texture's coordinate\n\
    // dot(czm_view[0].xyz, vec3(0.0, 0.0, 1.0)) + dot(czm_view[1].xyz, vec3(0.0, 1.0, 0.0))\n\
    float camrot = czm_view[0].z + czm_view[1].y;\n\
    float cosValue = cos(camrot);\n\
    float sinValue = sin(camrot);\n\
    mat3 rotation = mat3(\n\
        cosValue, -sinValue, 0.0,\n\
        sinValue, cosValue, 0.0,\n\
        0.0, 0.0, 1.0\n\
    );\n\
\n\
    vec3 st1 = vec3(v_textureCoordinates * 2.0 - vec2(1.0), 1.0);\n\
    vec3 st2 = vec3((rotation * st1).xy, 1.0);\n\
    vec3 st3 = st2 * 0.5 + vec3(0.5);\n\
    vec2 lensStarTexcoord = st3.xy;\n\
    float weightForLensFlare = length(vec3(sunPos.xy, 0.0));\n\
    float oneMinusWeightForLensFlare = max(1.0 - weightForLensFlare, 0.0);\n\
\n\
    if (!isSpace)\n\
    {\n\
        result *= oneMinusWeightForLensFlare * intensity * 0.2;\n\
    }\n\
    else\n\
    {\n\
        result *= oneMinusWeightForLensFlare * intensity;\n\
        result *= texture2D(starTexture, lensStarTexcoord) * pow(weightForLensFlare, 1.0) * max((1.0 - length(vec3(st1.xy, 0.0))), 0.0) * 2.0;\n\
    }\n\
\n\
    result += texture2D(colorTexture, v_textureCoordinates);\n\
\n\
    gl_FragColor = result;\n\
}\n\
";
