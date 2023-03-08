//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef QUANTIZATION_BITS12\n\
attribute vec4 compressed0;\n\
attribute float compressed1;\n\
#else\n\
attribute vec4 position3DAndHeight;\n\
attribute vec4 textureCoordAndEncodedNormals;\n\
#endif\n\
\n\
#ifdef GEODETIC_SURFACE_NORMALS\n\
attribute vec3 geodeticSurfaceNormal;\n\
#endif\n\
\n\
#ifdef EXAGGERATION\n\
uniform vec2 u_terrainExaggerationAndRelativeHeight;\n\
#endif\n\
\n\
uniform vec3 u_center3D;\n\
uniform mat4 u_modifiedModelView;\n\
uniform mat4 u_modifiedModelViewProjection;\n\
uniform vec4 u_tileRectangle;\n\
\n\
// Uniforms for 2D Mercator projection\n\
uniform vec2 u_southAndNorthLatitude;\n\
uniform vec2 u_southMercatorYAndOneOverHeight;\n\
\n\
varying vec3 v_positionMC;\n\
varying vec3 v_positionEC;\n\
\n\
varying vec3 v_textureCoordinates;\n\
varying vec3 v_normalMC;\n\
varying vec3 v_normalEC;\n\
\n\
#ifdef APPLY_MATERIAL\n\
varying float v_slope;\n\
varying float v_aspect;\n\
varying float v_height;\n\
#endif\n\
\n\
#if defined(FOG) || defined(GROUND_ATMOSPHERE) || defined(UNDERGROUND_COLOR) || defined(TRANSLUCENT)\n\
varying float v_distance;\n\
#endif\n\
\n\
#if defined(FOG) || defined(GROUND_ATMOSPHERE)\n\
varying vec3 v_atmosphereRayleighColor;\n\
varying vec3 v_atmosphereMieColor;\n\
varying float v_atmosphereOpacity;\n\
#endif\n\
\n\
// These functions are generated at runtime.\n\
vec4 getPosition(vec3 position, float height, vec2 textureCoordinates);\n\
float get2DYPositionFraction(vec2 textureCoordinates);\n\
\n\
vec4 getPosition3DMode(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
    return u_modifiedModelViewProjection * vec4(position, 1.0);\n\
}\n\
\n\
float get2DMercatorYPositionFraction(vec2 textureCoordinates)\n\
{\n\
    // The width of a tile at level 11, in radians and assuming a single root tile, is\n\
    //   2.0 * czm_pi / pow(2.0, 11.0)\n\
    // We want to just linearly interpolate the 2D position from the texture coordinates\n\
    // when we're at this level or higher.  The constant below is the expression\n\
    // above evaluated and then rounded up at the 4th significant digit.\n\
    const float maxTileWidth = 0.003068;\n\
    float positionFraction = textureCoordinates.y;\n\
    float southLatitude = u_southAndNorthLatitude.x;\n\
    float northLatitude = u_southAndNorthLatitude.y;\n\
    if (northLatitude - southLatitude > maxTileWidth)\n\
    {\n\
        float southMercatorY = u_southMercatorYAndOneOverHeight.x;\n\
        float oneOverMercatorHeight = u_southMercatorYAndOneOverHeight.y;\n\
\n\
        float currentLatitude = mix(southLatitude, northLatitude, textureCoordinates.y);\n\
        currentLatitude = clamp(currentLatitude, -czm_webMercatorMaxLatitude, czm_webMercatorMaxLatitude);\n\
        positionFraction = czm_latitudeToWebMercatorFraction(currentLatitude, southMercatorY, oneOverMercatorHeight);\n\
    }\n\
    return positionFraction;\n\
}\n\
\n\
float get2DGeographicYPositionFraction(vec2 textureCoordinates)\n\
{\n\
    return textureCoordinates.y;\n\
}\n\
\n\
vec4 getPositionPlanarEarth(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
    float yPositionFraction = get2DYPositionFraction(textureCoordinates);\n\
    vec4 rtcPosition2D = vec4(height, mix(u_tileRectangle.st, u_tileRectangle.pq, vec2(textureCoordinates.x, yPositionFraction)), 1.0);\n\
    return u_modifiedModelViewProjection * rtcPosition2D;\n\
}\n\
\n\
vec4 getPosition2DMode(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
    return getPositionPlanarEarth(position, 0.0, textureCoordinates);\n\
}\n\
\n\
vec4 getPositionColumbusViewMode(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
    return getPositionPlanarEarth(position, height, textureCoordinates);\n\
}\n\
\n\
vec4 getPositionMorphingMode(vec3 position, float height, vec2 textureCoordinates)\n\
{\n\
    // We do not do RTC while morphing, so there is potential for jitter.\n\
    // This is unlikely to be noticeable, though.\n\
    vec3 position3DWC = position + u_center3D;\n\
    float yPositionFraction = get2DYPositionFraction(textureCoordinates);\n\
    vec4 position2DWC = vec4(height, mix(u_tileRectangle.st, u_tileRectangle.pq, vec2(textureCoordinates.x, yPositionFraction)), 1.0);\n\
    vec4 morphPosition = czm_columbusViewMorph(position2DWC, vec4(position3DWC, 1.0), czm_morphTime);\n\
    return czm_modelViewProjection * morphPosition;\n\
}\n\
\n\
#ifdef QUANTIZATION_BITS12\n\
uniform vec2 u_minMaxHeight;\n\
uniform mat4 u_scaleAndBias;\n\
#endif\n\
\n\
void main()\n\
{\n\
#ifdef QUANTIZATION_BITS12\n\
    vec2 xy = czm_decompressTextureCoordinates(compressed0.x);\n\
    vec2 zh = czm_decompressTextureCoordinates(compressed0.y);\n\
    vec3 position = vec3(xy, zh.x);\n\
    float height = zh.y;\n\
    vec2 textureCoordinates = czm_decompressTextureCoordinates(compressed0.z);\n\
\n\
    height = height * (u_minMaxHeight.y - u_minMaxHeight.x) + u_minMaxHeight.x;\n\
    position = (u_scaleAndBias * vec4(position, 1.0)).xyz;\n\
\n\
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
\n\
#else\n\
    // A single float per element\n\
    vec3 position = position3DAndHeight.xyz;\n\
    float height = position3DAndHeight.w;\n\
    vec2 textureCoordinates = textureCoordAndEncodedNormals.xy;\n\
\n\
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
\n\
#endif\n\
\n\
    vec3 position3DWC = position + u_center3D;\n\
\n\
#ifdef GEODETIC_SURFACE_NORMALS\n\
    vec3 ellipsoidNormal = geodeticSurfaceNormal;\n\
#else\n\
    vec3 ellipsoidNormal = normalize(position3DWC);\n\
#endif\n\
\n\
#if defined(EXAGGERATION) && defined(GEODETIC_SURFACE_NORMALS)\n\
    float exaggeration = u_terrainExaggerationAndRelativeHeight.x;\n\
    float relativeHeight = u_terrainExaggerationAndRelativeHeight.y;\n\
    float newHeight = (height - relativeHeight) * exaggeration + relativeHeight;\n\
\n\
    // stop from going through center of earth\n\
    float minRadius = min(min(czm_ellipsoidRadii.x, czm_ellipsoidRadii.y), czm_ellipsoidRadii.z);\n\
    newHeight = max(newHeight, -minRadius);\n\
\n\
    vec3 offset = ellipsoidNormal * (newHeight - height);\n\
    position += offset;\n\
    position3DWC += offset;\n\
    height = newHeight;\n\
#endif\n\
\n\
    gl_Position = getPosition(position, height, textureCoordinates);\n\
\n\
    v_positionEC = (u_modifiedModelView * vec4(position, 1.0)).xyz;\n\
    v_positionMC = position3DWC;  // position in model coordinates\n\
\n\
    v_textureCoordinates = vec3(textureCoordinates, webMercatorT);\n\
\n\
#if defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL) || defined(APPLY_MATERIAL)\n\
    vec3 normalMC = czm_octDecode(encodedNormal);\n\
\n\
#if defined(EXAGGERATION) && defined(GEODETIC_SURFACE_NORMALS)\n\
    vec3 projection = dot(normalMC, ellipsoidNormal) * ellipsoidNormal;\n\
    vec3 rejection = normalMC - projection;\n\
    normalMC = normalize(projection + rejection * exaggeration);\n\
#endif\n\
\n\
    v_normalMC = normalMC;\n\
    v_normalEC = czm_normal3D * v_normalMC;\n\
#endif\n\
\n\
#if defined(FOG) || (defined(GROUND_ATMOSPHERE) && !defined(PER_FRAGMENT_GROUND_ATMOSPHERE))\n\
\n\
    bool dynamicLighting = false;\n\
\n\
    #if defined(DYNAMIC_ATMOSPHERE_LIGHTING) && (defined(ENABLE_DAYNIGHT_SHADING) || defined(ENABLE_VERTEX_LIGHTING))\n\
        dynamicLighting = true;\n\
    #endif\n\
\n\
#if defined(DYNAMIC_ATMOSPHERE_LIGHTING_FROM_SUN)\n\
    vec3 atmosphereLightDirection = czm_sunDirectionWC;\n\
#else\n\
    vec3 atmosphereLightDirection = czm_lightDirectionWC;\n\
#endif\n\
\n\
    vec3 lightDirection = czm_branchFreeTernary(dynamicLighting, atmosphereLightDirection, normalize(position3DWC));\n\
\n\
    computeAtmosphereScattering(\n\
        position3DWC,\n\
        lightDirection,\n\
        v_atmosphereRayleighColor,\n\
        v_atmosphereMieColor,\n\
        v_atmosphereOpacity\n\
    );\n\
#endif\n\
\n\
#if defined(FOG) || defined(GROUND_ATMOSPHERE) || defined(UNDERGROUND_COLOR) || defined(TRANSLUCENT)\n\
    v_distance = length((czm_modelView3D * vec4(position3DWC, 1.0)).xyz);\n\
#endif\n\
\n\
#ifdef APPLY_MATERIAL\n\
    float northPoleZ = czm_ellipsoidRadii.z;\n\
    vec3 northPolePositionMC = vec3(0.0, 0.0, northPoleZ);\n\
    vec3 vectorEastMC = normalize(cross(northPolePositionMC - v_positionMC, ellipsoidNormal));\n\
    float dotProd = abs(dot(ellipsoidNormal, v_normalMC));\n\
    v_slope = acos(dotProd);\n\
    vec3 normalRejected = ellipsoidNormal * dotProd;\n\
    vec3 normalProjected = v_normalMC - normalRejected;\n\
    vec3 aspectVector = normalize(normalProjected);\n\
    v_aspect = acos(dot(aspectVector, vectorEastMC));\n\
    float determ = dot(cross(vectorEastMC, aspectVector), ellipsoidNormal);\n\
    v_aspect = czm_branchFreeTernary(determ < 0.0, 2.0 * czm_pi - v_aspect, v_aspect);\n\
    v_height = height;\n\
#endif\n\
}\n\
";
