//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef INSTANCED\n\
attribute vec2 direction;\n\
#endif\n\
attribute vec4 positionHighAndScale;\n\
attribute vec4 positionLowAndRotation;\n\
attribute vec4 compressedAttribute0;                       // pixel offset, translate, horizontal origin, vertical origin, show, direction, texture coordinates (texture offset)\n\
attribute vec4 compressedAttribute1;                       // aligned axis, translucency by distance, image width\n\
attribute vec4 compressedAttribute2;                       // image height, color, pick color, size in meters, valid aligned axis, 13 bits free\n\
attribute vec4 eyeOffset;                                  // eye offset in meters, 4 bytes free (texture range)\n\
attribute vec4 scaleByDistance;                            // near, nearScale, far, farScale\n\
attribute vec4 pixelOffsetScaleByDistance;                 // near, nearScale, far, farScale\n\
attribute vec3 distanceDisplayConditionAndDisableDepth;    // near, far, disableDepthTestDistance\n\
#ifdef VECTOR_TILE\n\
attribute float a_batchId;\n\
#endif\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
#ifdef RENDER_FOR_PICK\n\
varying vec4 v_pickColor;\n\
#else\n\
varying vec4 v_color;\n\
#endif\n\
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
vec4 addScreenSpaceOffset(vec4 positionEC, vec2 imageSize, float scale, vec2 direction, vec2 origin, vec2 translate, vec2 pixelOffset, vec3 alignedAxis, bool validAlignedAxis, float rotation, bool sizeInMeters)\n\
{\n\
    // Note the halfSize cannot be computed in JavaScript because it is sent via\n\
    // compressed vertex attributes that coerce it to an integer.\n\
    vec2 halfSize = imageSize * scale * czm_resolutionScale * 0.5;\n\
    halfSize *= ((direction * 2.0) - 1.0);\n\
\n\
    vec2 originTranslate = origin * abs(halfSize);\n\
\n\
#if defined(ROTATION) || defined(ALIGNED_AXIS)\n\
    if (validAlignedAxis || rotation != 0.0)\n\
    {\n\
        float angle = rotation;\n\
        if (validAlignedAxis)\n\
        {\n\
            vec4 projectedAlignedAxis = czm_modelViewProjection * vec4(alignedAxis, 0.0);\n\
            angle += sign(-projectedAlignedAxis.x) * acos( sign(projectedAlignedAxis.y) * (projectedAlignedAxis.y * projectedAlignedAxis.y) /\n\
                    (projectedAlignedAxis.x * projectedAlignedAxis.x + projectedAlignedAxis.y * projectedAlignedAxis.y) );\n\
        }\n\
\n\
        float cosTheta = cos(angle);\n\
        float sinTheta = sin(angle);\n\
        mat2 rotationMatrix = mat2(cosTheta, sinTheta, -sinTheta, cosTheta);\n\
        halfSize = rotationMatrix * halfSize;\n\
    }\n\
#endif\n\
\n\
    if (sizeInMeters)\n\
    {\n\
        positionEC.xy += halfSize;\n\
    }\n\
\n\
    float mpp = czm_metersPerPixel(positionEC);\n\
\n\
    if (!sizeInMeters)\n\
    {\n\
        originTranslate *= mpp;\n\
    }\n\
\n\
    positionEC.xy += originTranslate;\n\
    if (!sizeInMeters)\n\
    {\n\
        positionEC.xy += halfSize * mpp;\n\
    }\n\
\n\
    positionEC.xy += translate * mpp;\n\
    positionEC.xy += (pixelOffset * czm_resolutionScale) * mpp;\n\
\n\
    return positionEC;\n\
}\n\
\n\
void main()\n\
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
#else\n\
    float rotation = 0.0;\n\
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
#ifdef INSTANCED\n\
    vec2 textureCoordinatesBottomLeft = czm_decompressTextureCoordinates(compressedAttribute0.w);\n\
    vec2 textureCoordinatesRange = czm_decompressTextureCoordinates(eyeOffset.w);\n\
    vec2 textureCoordinates = textureCoordinatesBottomLeft + direction * textureCoordinatesRange;\n\
#else\n\
    vec2 direction;\n\
    direction.x = floor(compressed * SHIFT_RIGHT1);\n\
    direction.y = compressed - direction.x * SHIFT_LEFT1;\n\
\n\
    vec2 textureCoordinates = czm_decompressTextureCoordinates(compressedAttribute0.w);\n\
#endif\n\
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
    temp = compressedAttribute2.z * SHIFT_RIGHT5;\n\
    bool validAlignedAxis = (temp - floor(temp)) * SHIFT_LEFT1 > 0.0;\n\
#else\n\
    vec3 alignedAxis = vec3(0.0);\n\
    bool validAlignedAxis = false;\n\
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
    bool sizeInMeters = floor((temp - floor(temp)) * SHIFT_LEFT7) > 0.0;\n\
    temp = floor(temp) * SHIFT_RIGHT8;\n\
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
    positionEC = czm_eyeOffset(positionEC, eyeOffset.xyz);\n\
    positionEC.xyz *= show;\n\
\n\
    ///////////////////////////////////////////////////////////////////////////\n\
\n\
#if defined(EYE_DISTANCE_SCALING) || defined(EYE_DISTANCE_TRANSLUCENCY) || defined(EYE_DISTANCE_PIXEL_OFFSET) || defined(DISTANCE_DISPLAY_CONDITION) || defined(DISABLE_DEPTH_DISTANCE)\n\
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
    float distanceScale = czm_nearFarScalar(scaleByDistance, lengthSq);\n\
    scale *= distanceScale;\n\
    translate *= distanceScale;\n\
    // push vertex behind near plane for clipping\n\
    if (scale == 0.0)\n\
    {\n\
        positionEC.xyz = vec3(0.0);\n\
    }\n\
#endif\n\
\n\
    float translucency = 1.0;\n\
#ifdef EYE_DISTANCE_TRANSLUCENCY\n\
    translucency = czm_nearFarScalar(translucencyByDistance, lengthSq);\n\
    // push vertex behind near plane for clipping\n\
    if (translucency == 0.0)\n\
    {\n\
        positionEC.xyz = vec3(0.0);\n\
    }\n\
#endif\n\
\n\
#ifdef EYE_DISTANCE_PIXEL_OFFSET\n\
    float pixelOffsetScale = czm_nearFarScalar(pixelOffsetScaleByDistance, lengthSq);\n\
    pixelOffset *= pixelOffsetScale;\n\
#endif\n\
\n\
#ifdef DISTANCE_DISPLAY_CONDITION\n\
    float nearSq = distanceDisplayConditionAndDisableDepth.x;\n\
    float farSq = distanceDisplayConditionAndDisableDepth.y;\n\
    if (lengthSq < nearSq || lengthSq > farSq)\n\
    {\n\
        positionEC.xyz = vec3(0.0);\n\
    }\n\
#endif\n\
\n\
    positionEC = addScreenSpaceOffset(positionEC, imageSize, scale, direction, origin, translate, pixelOffset, alignedAxis, validAlignedAxis, rotation, sizeInMeters);\n\
    gl_Position = czm_projection * positionEC;\n\
    v_textureCoordinates = textureCoordinates;\n\
\n\
#ifdef LOG_DEPTH\n\
    czm_vertexLogDepth();\n\
#endif\n\
\n\
#ifdef DISABLE_DEPTH_DISTANCE\n\
    float disableDepthTestDistance = distanceDisplayConditionAndDisableDepth.z;\n\
    if (disableDepthTestDistance == 0.0 && czm_minimumDisableDepthTestDistance != 0.0)\n\
    {\n\
        disableDepthTestDistance = czm_minimumDisableDepthTestDistance;\n\
    }\n\
\n\
    if (disableDepthTestDistance != 0.0)\n\
    {\n\
        // Don't try to \"multiply both sides\" by w.  Greater/less-than comparisons won't work for negative values of w.\n\
        float zclip = gl_Position.z / gl_Position.w;\n\
        bool clipped = (zclip < -1.0 || zclip > 1.0);\n\
        if (!clipped && (disableDepthTestDistance < 0.0 || (lengthSq > 0.0 && lengthSq < disableDepthTestDistance)))\n\
        {\n\
            // Position z on the near plane.\n\
            gl_Position.z = -gl_Position.w;\n\
#ifdef LOG_DEPTH\n\
            czm_vertexLogDepth(vec4(czm_currentFrustum.x));\n\
#endif\n\
        }\n\
    }\n\
#endif\n\
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