//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D u_atlas;\n\
#ifdef VECTOR_TILE\n\
uniform vec4 u_highlightColor;\n\
#endif\n\
varying vec2 v_textureCoordinates;\n\
varying vec4 v_pickColor;\n\
varying vec4 v_color;\n\
#ifdef FRAGMENT_DEPTH_CHECK\n\
varying vec4 v_textureCoordinateBounds;\n\
varying vec4 v_originTextureCoordinateAndTranslate;\n\
varying vec4 v_compressed;\n\
varying mat2 v_rotationMatrix;\n\
const float SHIFT_LEFT12 = 4096.0;\n\
const float SHIFT_LEFT1 = 2.0;\n\
const float SHIFT_RIGHT12 = 1.0 / 4096.0;\n\
const float SHIFT_RIGHT1 = 1.0 / 2.0;\n\
float getGlobeDepth(vec2 adjustedST, vec2 depthLookupST, bool applyTranslate, vec2 dimensions, vec2 imageSize)\n\
{\n\
vec2 lookupVector = imageSize * (depthLookupST - adjustedST);\n\
lookupVector = v_rotationMatrix * lookupVector;\n\
vec2 labelOffset = (dimensions - imageSize) * (depthLookupST - vec2(0.0, v_originTextureCoordinateAndTranslate.y));\n\
vec2 translation = v_originTextureCoordinateAndTranslate.zw;\n\
if (applyTranslate)\n\
{\n\
translation += (dimensions * v_originTextureCoordinateAndTranslate.xy * vec2(1.0, 0.0));\n\
}\n\
vec2 st = ((lookupVector - translation + labelOffset) + gl_FragCoord.xy) / czm_viewport.zw;\n\
float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, st));\n\
if (logDepthOrDepth == 0.0)\n\
{\n\
return 0.0;\n\
}\n\
vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);\n\
return eyeCoordinate.z / eyeCoordinate.w;\n\
}\n\
#endif\n\
void main()\n\
{\n\
vec4 color = texture2D(u_atlas, v_textureCoordinates) * v_color;\n\
#if !defined(OPAQUE) && !defined(TRANSLUCENT)\n\
if (color.a < 0.005)\n\
{\n\
discard;\n\
}\n\
#else\n\
#ifdef OPAQUE\n\
if (color.a < 0.995)\n\
{\n\
discard;\n\
}\n\
#else\n\
if (color.a >= 0.995)\n\
{\n\
discard;\n\
}\n\
#endif\n\
#endif\n\
#ifdef VECTOR_TILE\n\
color *= u_highlightColor;\n\
#endif\n\
gl_FragColor = color;\n\
czm_writeLogDepth();\n\
#ifdef FRAGMENT_DEPTH_CHECK\n\
float temp = v_compressed.y;\n\
temp = temp * SHIFT_RIGHT1;\n\
float temp2 = (temp - floor(temp)) * SHIFT_LEFT1;\n\
bool enableDepthTest = temp2 != 0.0;\n\
bool applyTranslate = floor(temp) != 0.0;\n\
if (enableDepthTest) {\n\
temp = v_compressed.z;\n\
temp = temp * SHIFT_RIGHT12;\n\
vec2 dimensions;\n\
dimensions.y = (temp - floor(temp)) * SHIFT_LEFT12;\n\
dimensions.x = floor(temp);\n\
temp = v_compressed.w;\n\
temp = temp * SHIFT_RIGHT12;\n\
vec2 imageSize;\n\
imageSize.y = (temp - floor(temp)) * SHIFT_LEFT12;\n\
imageSize.x = floor(temp);\n\
vec2 adjustedST = v_textureCoordinates - v_textureCoordinateBounds.xy;\n\
adjustedST = adjustedST / vec2(v_textureCoordinateBounds.z - v_textureCoordinateBounds.x, v_textureCoordinateBounds.w - v_textureCoordinateBounds.y);\n\
float epsilonEyeDepth = v_compressed.x + czm_epsilon1;\n\
float globeDepth1 = getGlobeDepth(adjustedST, v_originTextureCoordinateAndTranslate.xy, applyTranslate, dimensions, imageSize);\n\
if (globeDepth1 != 0.0 && globeDepth1 > epsilonEyeDepth)\n\
{\n\
float globeDepth2 = getGlobeDepth(adjustedST, vec2(0.0, 1.0), applyTranslate, dimensions, imageSize);\n\
if (globeDepth2 != 0.0 && globeDepth2 > epsilonEyeDepth)\n\
{\n\
float globeDepth3 = getGlobeDepth(adjustedST, vec2(1.0, 1.0), applyTranslate, dimensions, imageSize);\n\
if (globeDepth3 != 0.0 && globeDepth3 > epsilonEyeDepth)\n\
{\n\
discard;\n\
}\n\
}\n\
}\n\
}\n\
#endif\n\
}\n\
";
});