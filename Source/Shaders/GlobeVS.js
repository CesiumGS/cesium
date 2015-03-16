    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "attribute vec4 position3DAndHeight;\n\
attribute vec3 textureCoordAndEncodedNormals;\n\
\n\
uniform vec3 u_center3D;\n\
uniform mat4 u_modifiedModelView;\n\
uniform vec4 u_tileRectangle;\n\
\n\
// Uniforms for 2D Mercator projection\n\
uniform vec2 u_southAndNorthLatitude;\n\
uniform vec3 u_southMercatorYLowAndHighAndOneOverHeight;\n\
\n\
varying vec3 v_positionMC;\n\
varying vec3 v_positionEC;\n\
\n\
varying vec2 v_textureCoordinates;\n\
varying vec3 v_normalMC;\n\
varying vec3 v_normalEC;\n\
\n\
// These functions are generated at runtime.\n\
vec4 getPosition(vec3 position3DWC);\n\
float get2DYPositionFraction();\n\
\n\
vec4 getPosition3DMode(vec3 position3DWC)\n\
{\n\
    return czm_projection * (u_modifiedModelView * vec4(position3DAndHeight.xyz, 1.0));\n\
}\n\
\n\
float get2DMercatorYPositionFraction()\n\
{\n\
    // The width of a tile at level 11, in radians and assuming a single root tile, is\n\
    //   2.0 * czm_pi / pow(2.0, 11.0)\n\
    // We want to just linearly interpolate the 2D position from the texture coordinates\n\
    // when we're at this level or higher.  The constant below is the expression\n\
    // above evaluated and then rounded up at the 4th significant digit.\n\
    const float maxTileWidth = 0.003068;\n\
    float positionFraction = textureCoordAndEncodedNormals.y;\n\
    float southLatitude = u_southAndNorthLatitude.x;\n\
    float northLatitude = u_southAndNorthLatitude.y;\n\
    if (northLatitude - southLatitude > maxTileWidth)\n\
    {\n\
        float southMercatorYLow = u_southMercatorYLowAndHighAndOneOverHeight.x;\n\
        float southMercatorYHigh = u_southMercatorYLowAndHighAndOneOverHeight.y;\n\
        float oneOverMercatorHeight = u_southMercatorYLowAndHighAndOneOverHeight.z;\n\
\n\
        float currentLatitude = mix(southLatitude, northLatitude, textureCoordAndEncodedNormals.y);\n\
        currentLatitude = clamp(currentLatitude, -czm_webMercatorMaxLatitude, czm_webMercatorMaxLatitude);\n\
        positionFraction = czm_latitudeToWebMercatorFraction(currentLatitude, southMercatorYLow, southMercatorYHigh, oneOverMercatorHeight);\n\
    }    \n\
    return positionFraction;\n\
}\n\
\n\
float get2DGeographicYPositionFraction()\n\
{\n\
    return textureCoordAndEncodedNormals.y;\n\
}\n\
\n\
vec4 getPositionPlanarEarth(vec3 position3DWC, float height2D)\n\
{\n\
    float yPositionFraction = get2DYPositionFraction();\n\
    vec4 rtcPosition2D = vec4(height2D, mix(u_tileRectangle.st, u_tileRectangle.pq, vec2(textureCoordAndEncodedNormals.x, yPositionFraction)), 1.0);  \n\
    return czm_projection * (u_modifiedModelView * rtcPosition2D);\n\
}\n\
\n\
vec4 getPosition2DMode(vec3 position3DWC)\n\
{\n\
    return getPositionPlanarEarth(position3DWC, 0.0);\n\
}\n\
\n\
vec4 getPositionColumbusViewMode(vec3 position3DWC)\n\
{\n\
    return getPositionPlanarEarth(position3DWC, position3DAndHeight.w);\n\
}\n\
\n\
vec4 getPositionMorphingMode(vec3 position3DWC)\n\
{\n\
    // We do not do RTC while morphing, so there is potential for jitter.\n\
    // This is unlikely to be noticeable, though.\n\
    float yPositionFraction = get2DYPositionFraction();\n\
    vec4 position2DWC = vec4(0.0, mix(u_tileRectangle.st, u_tileRectangle.pq, vec2(textureCoordAndEncodedNormals.x, yPositionFraction)), 1.0);\n\
    vec4 morphPosition = czm_columbusViewMorph(position2DWC, vec4(position3DWC, 1.0), czm_morphTime);\n\
    return czm_modelViewProjection * morphPosition;\n\
}\n\
\n\
void main() \n\
{\n\
    vec3 position3DWC = position3DAndHeight.xyz + u_center3D;\n\
\n\
    gl_Position = getPosition(position3DWC);\n\
\n\
#if defined(ENABLE_VERTEX_LIGHTING)\n\
    v_positionEC = (czm_modelView3D * vec4(position3DWC, 1.0)).xyz;\n\
    v_positionMC = position3DWC;                                 // position in model coordinates\n\
    float encodedNormal = textureCoordAndEncodedNormals.z;\n\
    v_normalMC = czm_octDecode(encodedNormal);\n\
    v_normalEC = czm_normal3D * v_normalMC;\n\
#elif defined(SHOW_REFLECTIVE_OCEAN) || defined(ENABLE_DAYNIGHT_SHADING)\n\
    v_positionEC = (czm_modelView3D * vec4(position3DWC, 1.0)).xyz;\n\
    v_positionMC = position3DWC;                                 // position in model coordinates\n\
#endif\n\
\n\
    v_textureCoordinates = textureCoordAndEncodedNormals.xy;\n\
}\n\
";
});