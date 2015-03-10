    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "attribute vec4 positionHighAndScale;\n\
attribute vec4 positionLowAndRotation;   \n\
attribute vec4 compressedAttribute0;        // pixel offset, translate, horizontal origin, vertical origin, show, texture coordinates, direction\n\
attribute vec4 compressedAttribute1;        // aligned axis, translucency by distance, image width\n\
attribute vec4 compressedAttribute2;        // image height, color, pick color, 2 bytes free\n\
attribute vec3 eyeOffset;                   // eye offset in meters\n\
attribute vec4 scaleByDistance;             // near, nearScale, far, farScale\n\
attribute vec4 pixelOffsetScaleByDistance;  // near, nearScale, far, farScale\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
#ifdef RENDER_FOR_PICK\n\
varying vec4 v_pickColor;\n\
#else\n\
varying vec4 v_color;\n\
#endif\n\
\n\
float getNearFarScalar(vec4 nearFarScalar, float cameraDistSq)\n\
{\n\
    float valueAtMin = nearFarScalar.y;\n\
    float valueAtMax = nearFarScalar.w;\n\
    float nearDistanceSq = nearFarScalar.x * nearFarScalar.x;\n\
    float farDistanceSq = nearFarScalar.z * nearFarScalar.z;\n\
\n\
    float t = (cameraDistSq - nearDistanceSq) / (farDistanceSq - nearDistanceSq);\n\
\n\
    t = pow(clamp(t, 0.0, 1.0), 0.2);\n\
\n\
    return mix(valueAtMin, valueAtMax, t);\n\
}\n\
\n\
const float UPPER_BOUND = 32768.0;\n\
\n\
const float SHIFT_LEFT16 = 65536.0;\n\
const float SHIFT_LEFT8 = 256.0;\n\
const float SHIFT_LEFT7 = 128.0;\n\
const float SHIFT_LEFT5 = 32.0;\n\
const float SHIFT_LEFT3 = 8.0;\n\
const float SHIFT_LEFT2 = 4.0;\n\
const float SHIFT_LEFT1 = 2.0;\n\
\n\
const float SHIFT_RIGHT8 = 1.0 / 256.0;\n\
const float SHIFT_RIGHT7 = 1.0 / 128.0;\n\
const float SHIFT_RIGHT5 = 1.0 / 32.0;\n\
const float SHIFT_RIGHT3 = 1.0 / 8.0;\n\
const float SHIFT_RIGHT2 = 1.0 / 4.0;\n\
const float SHIFT_RIGHT1 = 1.0 / 2.0;\n\
\n\
void main() \n\
{\n\
    // Modifying this shader may also require modifications to Billboard._computeScreenSpacePosition\n\
    \n\
    // unpack attributes\n\
    vec3 positionHigh = positionHighAndScale.xyz;\n\
    vec3 positionLow = positionLowAndRotation.xyz;\n\
    float scale = positionHighAndScale.w;\n\
    \n\
#if defined(ROTATION) || defined(ALIGNED_AXIS)\n\
    float rotation = positionLowAndRotation.w;\n\
#endif\n\
\n\
    float compressed = compressedAttribute0.x;\n\
    \n\
    vec2 pixelOffset;\n\
    pixelOffset.x = floor(compressed * SHIFT_RIGHT7);\n\
    compressed -= pixelOffset.x * SHIFT_LEFT7;\n\
    pixelOffset.x -= UPPER_BOUND;\n\
    \n\
    vec2 origin;\n\
    origin.x = floor(compressed * SHIFT_RIGHT5);\n\
    compressed -= origin.x * SHIFT_LEFT5;\n\
    \n\
    origin.y = floor(compressed * SHIFT_RIGHT3);\n\
    compressed -= origin.y * SHIFT_LEFT3;\n\
    \n\
    origin -= vec2(1.0);\n\
    \n\
    float show = floor(compressed * SHIFT_RIGHT2);\n\
    compressed -= show * SHIFT_LEFT2;\n\
    \n\
    vec2 direction;\n\
    direction.x = floor(compressed * SHIFT_RIGHT1);\n\
    direction.y = compressed - direction.x * SHIFT_LEFT1;\n\
    \n\
    float temp = compressedAttribute0.y  * SHIFT_RIGHT8;\n\
    pixelOffset.y = -(floor(temp) - UPPER_BOUND);\n\
    \n\
    vec2 translate;\n\
    translate.y = (temp - floor(temp)) * SHIFT_LEFT16;\n\
    \n\
    temp = compressedAttribute0.z * SHIFT_RIGHT8;\n\
    translate.x = floor(temp) - UPPER_BOUND;\n\
    \n\
    translate.y += (temp - floor(temp)) * SHIFT_LEFT8;\n\
    translate.y -= UPPER_BOUND;\n\
    \n\
    vec2 textureCoordinates = czm_decompressTextureCoordinates(compressedAttribute0.w);\n\
    \n\
    temp = compressedAttribute1.x * SHIFT_RIGHT8;\n\
    \n\
    vec2 imageSize = vec2(floor(temp), compressedAttribute2.w);\n\
    \n\
#ifdef EYE_DISTANCE_TRANSLUCENCY\n\
    vec4 translucencyByDistance;\n\
    translucencyByDistance.x = compressedAttribute1.z;\n\
    translucencyByDistance.z = compressedAttribute1.w;\n\
    \n\
    translucencyByDistance.y = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;\n\
    \n\
    temp = compressedAttribute1.y * SHIFT_RIGHT8;\n\
    translucencyByDistance.w = ((temp - floor(temp)) * SHIFT_LEFT8) / 255.0;\n\
#endif\n\
\n\
#ifdef ALIGNED_AXIS\n\
    vec3 alignedAxis = czm_octDecode(floor(compressedAttribute1.y * SHIFT_RIGHT8));\n\
#else\n\
    vec3 alignedAxis = vec3(0.0);\n\
#endif\n\
    \n\
#ifdef RENDER_FOR_PICK\n\
    temp = compressedAttribute2.y;\n\
#else\n\
    temp = compressedAttribute2.x;\n\
#endif\n\
\n\
    vec4 color;\n\
    temp = temp * SHIFT_RIGHT8;\n\
    color.b = (temp - floor(temp)) * SHIFT_LEFT8;\n\
    temp = floor(temp) * SHIFT_RIGHT8;\n\
    color.g = (temp - floor(temp)) * SHIFT_LEFT8;\n\
    color.r = floor(temp);\n\
    \n\
    temp = compressedAttribute2.z * SHIFT_RIGHT8;\n\
    \n\
#ifdef RENDER_FOR_PICK\n\
    color.a = (temp - floor(temp)) * SHIFT_LEFT8;\n\
    vec4 pickColor = color / 255.0;\n\
#else\n\
    color.a = floor(temp);\n\
    color /= 255.0;\n\
#endif\n\
    \n\
    ///////////////////////////////////////////////////////////////////////////\n\
    \n\
    vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);\n\
    vec4 positionEC = czm_modelViewRelativeToEye * p;\n\
    positionEC = czm_eyeOffset(positionEC, eyeOffset);\n\
    positionEC.xyz *= show;\n\
    \n\
    ///////////////////////////////////////////////////////////////////////////     \n\
\n\
#if defined(EYE_DISTANCE_SCALING) || defined(EYE_DISTANCE_TRANSLUCENCY) || defined(EYE_DISTANCE_PIXEL_OFFSET)\n\
    float lengthSq;\n\
    if (czm_sceneMode == czm_sceneMode2D)\n\
    {\n\
        // 2D camera distance is a special case\n\
        // treat all billboards as flattened to the z=0.0 plane\n\
        lengthSq = czm_eyeHeight2D.y;\n\
    }\n\
    else\n\
    {\n\
        lengthSq = dot(positionEC.xyz, positionEC.xyz);\n\
    }\n\
#endif\n\
\n\
#ifdef EYE_DISTANCE_SCALING\n\
    scale *= getNearFarScalar(scaleByDistance, lengthSq);\n\
    // push vertex behind near plane for clipping\n\
    if (scale == 0.0)\n\
    {\n\
        positionEC.xyz = vec3(0.0);\n\
    }\n\
#endif\n\
\n\
    float translucency = 1.0;\n\
#ifdef EYE_DISTANCE_TRANSLUCENCY\n\
    translucency = getNearFarScalar(translucencyByDistance, lengthSq);\n\
    // push vertex behind near plane for clipping\n\
    if (translucency == 0.0)\n\
    {\n\
        positionEC.xyz = vec3(0.0);\n\
    }\n\
#endif\n\
\n\
#ifdef EYE_DISTANCE_PIXEL_OFFSET\n\
    float pixelOffsetScale = getNearFarScalar(pixelOffsetScaleByDistance, lengthSq);\n\
    pixelOffset *= pixelOffsetScale;\n\
#endif\n\
\n\
    vec4 positionWC = czm_eyeToWindowCoordinates(positionEC);\n\
    \n\
    vec2 halfSize = imageSize * scale * czm_resolutionScale;\n\
    halfSize *= ((direction * 2.0) - 1.0);\n\
    \n\
    positionWC.xy += (origin * abs(halfSize));\n\
    \n\
#if defined(ROTATION) || defined(ALIGNED_AXIS)\n\
    if (!all(equal(alignedAxis, vec3(0.0))) || rotation != 0.0)\n\
    {\n\
        float angle = rotation;\n\
        if (!all(equal(alignedAxis, vec3(0.0))))\n\
        {\n\
            vec3 pos = positionEC.xyz + czm_encodedCameraPositionMCHigh + czm_encodedCameraPositionMCLow;\n\
            vec3 normal = normalize(cross(alignedAxis, pos));\n\
            vec4 tangent = vec4(normalize(cross(pos, normal)), 0.0);\n\
            tangent = czm_modelViewProjection * tangent;\n\
            angle += sign(-tangent.x) * acos(tangent.y / length(tangent.xy));\n\
        }\n\
        \n\
        float cosTheta = cos(angle);\n\
        float sinTheta = sin(angle);\n\
        mat2 rotationMatrix = mat2(cosTheta, sinTheta, -sinTheta, cosTheta);\n\
        halfSize = rotationMatrix * halfSize;\n\
    }\n\
#endif\n\
    \n\
    positionWC.xy += halfSize;\n\
    positionWC.xy += translate;\n\
    positionWC.xy += (pixelOffset * czm_resolutionScale);\n\
\n\
    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);\n\
    v_textureCoordinates = textureCoordinates;\n\
\n\
#ifdef RENDER_FOR_PICK\n\
    v_pickColor = pickColor;\n\
#else\n\
    v_color = color;\n\
    v_color.a *= translucency;\n\
#endif\n\
}\n\
";
});