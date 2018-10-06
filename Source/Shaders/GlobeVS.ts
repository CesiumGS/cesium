//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef QUANTIZATION_BITS12\n\
attribute vec4 compressed0;\n\
attribute float compressed1;\n\
#else\n\
attribute vec4 position3DAndHeight;\n\
attribute vec4 textureCoordAndEncodedNormals;\n\
#endif\n\
uniform vec3 u_center3D;\n\
uniform mat4 u_modifiedModelView;\n\
uniform mat4 u_modifiedModelViewProjection;\n\
uniform vec4 u_tileRectangle;\n\
uniform vec2 u_southAndNorthLatitude;\n\
uniform vec2 u_southMercatorYAndOneOverHeight;\n\
varying vec3 v_positionMC;\n\
varying vec3 v_positionEC;\n\
varying vec3 v_textureCoordinates;\n\
varying vec3 v_normalMC;\n\
varying vec3 v_normalEC;\n\
#ifdef APPLY_MATERIAL\n\
varying float v_slope;\n\
varying float v_height;\n\
#endif\n\
#if defined(FOG) || defined(GROUND_ATMOSPHERE)\n\
varying float v_distance;\n\
varying vec3 v_fogMieColor;\n\
varying vec3 v_fogRayleighColor;\n\
#endif\n\
vec4 getPosition(vec3 position, float height, vec2 textureCoordinates);\n\
float get2DYPositionFraction(vec2 textureCoordinates);\n\
vec4 getPosition3DMode(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
return u_modifiedModelViewProjection * vec4(position, 1.0);\n\
}\n\
float get2DMercatorYPositionFraction(vec2 textureCoordinates)\n\
{\n\
const float maxTileWidth = 0.003068;\n\
float positionFraction = textureCoordinates.y;\n\
float southLatitude = u_southAndNorthLatitude.x;\n\
float northLatitude = u_southAndNorthLatitude.y;\n\
if (northLatitude - southLatitude > maxTileWidth)\n\
{\n\
float southMercatorY = u_southMercatorYAndOneOverHeight.x;\n\
float oneOverMercatorHeight = u_southMercatorYAndOneOverHeight.y;\n\
float currentLatitude = mix(southLatitude, northLatitude, textureCoordinates.y);\n\
currentLatitude = clamp(currentLatitude, -czm_webMercatorMaxLatitude, czm_webMercatorMaxLatitude);\n\
positionFraction = czm_latitudeToWebMercatorFraction(currentLatitude, southMercatorY, oneOverMercatorHeight);\n\
}\n\
return positionFraction;\n\
}\n\
float get2DGeographicYPositionFraction(vec2 textureCoordinates)\n\
{\n\
return textureCoordinates.y;\n\
}\n\
vec4 getPositionPlanarEarth(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
float yPositionFraction = get2DYPositionFraction(textureCoordinates);\n\
vec4 rtcPosition2D = vec4(height, mix(u_tileRectangle.st, u_tileRectangle.pq, vec2(textureCoordinates.x, yPositionFraction)), 1.0);\n\
return u_modifiedModelViewProjection * rtcPosition2D;\n\
}\n\
vec4 getPosition2DMode(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
return getPositionPlanarEarth(position, 0.0, textureCoordinates);\n\
}\n\
vec4 getPositionColumbusViewMode(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
return getPositionPlanarEarth(position, height, textureCoordinates);\n\
}\n\
vec4 getPositionMorphingMode(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
vec3 position3DWC = position + u_center3D;\n\
float yPositionFraction = get2DYPositionFraction(textureCoordinates);\n\
vec4 position2DWC = vec4(height, mix(u_tileRectangle.st, u_tileRectangle.pq, vec2(textureCoordinates.x, yPositionFraction)), 1.0);\n\
vec4 morphPosition = czm_columbusViewMorph(position2DWC, vec4(position3DWC, 1.0), czm_morphTime);\n\
return czm_modelViewProjection * morphPosition;\n\
}\n\
#ifdef QUANTIZATION_BITS12\n\
uniform vec2 u_minMaxHeight;\n\
uniform mat4 u_scaleAndBias;\n\
#endif\n\
void main()\n\
{\n\
#ifdef QUANTIZATION_BITS12\n\
vec2 xy = czm_decompressTextureCoordinates(compressed0.x);\n\
vec2 zh = czm_decompressTextureCoordinates(compressed0.y);\n\
vec3 position = vec3(xy, zh.x);\n\
float height = zh.y;\n\
vec2 textureCoordinates = czm_decompressTextureCoordinates(compressed0.z);\n\
height = height * (u_minMaxHeight.y - u_minMaxHeight.x) + u_minMaxHeight.x;\n\
position = (u_scaleAndBias * vec4(position, 1.0)).xyz;\n\
#if (defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL)) && defined(INCLUDE_WEB_MERCATOR_Y)\n\
float webMercatorT = czm_decompressTextureCoordinates(compressed0.w).x;\n\
float encodedNormal = compressed1;\n\
#elif defined(INCLUDE_WEB_MERCATOR_Y)\n\
float webMercatorT = czm_decompressTextureCoordinates(compressed0.w).x;\n\
float encodedNormal = 0.0;\n\
#elif defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL)\n\
float webMercatorT = textureCoordinates.y;\n\
float encodedNormal = compressed0.w;\n\
#else\n\
float webMercatorT = textureCoordinates.y;\n\
float encodedNormal = 0.0;\n\
#endif\n\
#else\n\
vec3 position = position3DAndHeight.xyz;\n\
float height = position3DAndHeight.w;\n\
vec2 textureCoordinates = textureCoordAndEncodedNormals.xy;\n\
#if (defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL) || defined(APPLY_MATERIAL)) && defined(INCLUDE_WEB_MERCATOR_Y)\n\
float webMercatorT = textureCoordAndEncodedNormals.z;\n\
float encodedNormal = textureCoordAndEncodedNormals.w;\n\
#elif defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL) || defined(APPLY_MATERIAL)\n\
float webMercatorT = textureCoordinates.y;\n\
float encodedNormal = textureCoordAndEncodedNormals.z;\n\
#elif defined(INCLUDE_WEB_MERCATOR_Y)\n\
float webMercatorT = textureCoordAndEncodedNormals.z;\n\
float encodedNormal = 0.0;\n\
#else\n\
float webMercatorT = textureCoordinates.y;\n\
float encodedNormal = 0.0;\n\
#endif\n\
#endif\n\
vec3 position3DWC = position + u_center3D;\n\
gl_Position = getPosition(position, height, textureCoordinates);\n\
v_textureCoordinates = vec3(textureCoordinates, webMercatorT);\n\
#if defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL) || defined(APPLY_MATERIAL)\n\
v_positionEC = (u_modifiedModelView * vec4(position, 1.0)).xyz;\n\
v_positionMC = position3DWC;\n\
vec3 normalMC = czm_octDecode(encodedNormal);\n\
v_normalMC = normalMC;\n\
v_normalEC = czm_normal3D * v_normalMC;\n\
#elif defined(SHOW_REFLECTIVE_OCEAN) || defined(ENABLE_DAYNIGHT_SHADING) || defined(GENERATE_POSITION)\n\
v_positionEC = (u_modifiedModelView * vec4(position, 1.0)).xyz;\n\
v_positionMC = position3DWC;\n\
#endif\n\
#if defined(FOG) || defined(GROUND_ATMOSPHERE)\n\
AtmosphereColor atmosFogColor = computeGroundAtmosphereFromSpace(position3DWC, false);\n\
v_fogMieColor = atmosFogColor.mie;\n\
v_fogRayleighColor = atmosFogColor.rayleigh;\n\
v_distance = length((czm_modelView3D * vec4(position3DWC, 1.0)).xyz);\n\
#endif\n\
#ifdef APPLY_MATERIAL\n\
vec3 finalNormal = normalMC;\n\
vec3 ellipsoidNormal = normalize(position3DWC.xyz);\n\
v_slope = abs(dot(ellipsoidNormal, finalNormal));\n\
v_height = height;\n\
#endif\n\
}\n\
";
});