//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "void clipLineSegmentToNearPlane(\n\
vec3 p0,\n\
vec3 p1,\n\
out vec4 positionWC,\n\
out bool clipped,\n\
out bool culledByNearPlane)\n\
{\n\
culledByNearPlane = false;\n\
clipped = false;\n\
vec3 p1ToP0 = p1 - p0;\n\
float magnitude = length(p1ToP0);\n\
vec3 direction = normalize(p1ToP0);\n\
float endPoint0Distance =  -(czm_currentFrustum.x + p0.z);\n\
float denominator = -direction.z;\n\
if (endPoint0Distance < 0.0 && abs(denominator) < czm_epsilon7)\n\
{\n\
culledByNearPlane = true;\n\
}\n\
else if (endPoint0Distance < 0.0 && abs(denominator) > czm_epsilon7)\n\
{\n\
float t = (czm_currentFrustum.x + p0.z) / denominator;\n\
if (t < 0.0 || t > magnitude)\n\
{\n\
culledByNearPlane = true;\n\
}\n\
else\n\
{\n\
p0 = p0 + t * direction;\n\
clipped = true;\n\
}\n\
}\n\
positionWC = czm_eyeToWindowCoordinates(vec4(p0, 1.0));\n\
}\n\
vec4 getPolylineWindowCoordinatesEC(vec4 positionEC, vec4 prevEC, vec4 nextEC, float expandDirection, float width, bool usePrevious, out float angle)\n\
{\n\
vec4 endPointWC, p0, p1;\n\
bool culledByNearPlane, clipped;\n\
#ifdef POLYLINE_DASH\n\
vec4 positionWindow = czm_eyeToWindowCoordinates(positionEC);\n\
vec4 previousWindow = czm_eyeToWindowCoordinates(prevEC);\n\
vec4 nextWindow = czm_eyeToWindowCoordinates(nextEC);\n\
vec2 lineDir;\n\
if (usePrevious) {\n\
lineDir = normalize(positionWindow.xy - previousWindow.xy);\n\
}\n\
else {\n\
lineDir = normalize(nextWindow.xy - positionWindow.xy);\n\
}\n\
angle = atan(lineDir.x, lineDir.y) - 1.570796327;\n\
angle = floor(angle / czm_piOverFour + 0.5) * czm_piOverFour;\n\
#endif\n\
clipLineSegmentToNearPlane(prevEC.xyz, positionEC.xyz, p0, clipped, culledByNearPlane);\n\
clipLineSegmentToNearPlane(nextEC.xyz, positionEC.xyz, p1, clipped, culledByNearPlane);\n\
clipLineSegmentToNearPlane(positionEC.xyz, usePrevious ? prevEC.xyz : nextEC.xyz, endPointWC, clipped, culledByNearPlane);\n\
if (culledByNearPlane)\n\
{\n\
return vec4(0.0, 0.0, 0.0, 1.0);\n\
}\n\
vec2 prevWC = normalize(p0.xy - endPointWC.xy);\n\
vec2 nextWC = normalize(p1.xy - endPointWC.xy);\n\
float expandWidth = width * 0.5;\n\
vec2 direction;\n\
if (czm_equalsEpsilon(prevEC.xyz - positionEC.xyz, vec3(0.0), czm_epsilon1) || czm_equalsEpsilon(prevWC, -nextWC, czm_epsilon1))\n\
{\n\
direction = vec2(-nextWC.y, nextWC.x);\n\
}\n\
else if (czm_equalsEpsilon(nextEC.xyz - positionEC.xyz, vec3(0.0), czm_epsilon1) || clipped)\n\
{\n\
direction = vec2(prevWC.y, -prevWC.x);\n\
}\n\
else\n\
{\n\
vec2 normal = vec2(-nextWC.y, nextWC.x);\n\
direction = normalize((nextWC + prevWC) * 0.5);\n\
if (dot(direction, normal) < 0.0)\n\
{\n\
direction = -direction;\n\
}\n\
float sinAngle = abs(direction.x * nextWC.y - direction.y * nextWC.x);\n\
expandWidth = clamp(expandWidth / sinAngle, 0.0, width * 2.0);\n\
}\n\
vec2 offset = direction * expandDirection * expandWidth * czm_resolutionScale;\n\
return vec4(endPointWC.xy + offset, -endPointWC.z, 1.0);\n\
}\n\
vec4 getPolylineWindowCoordinates(vec4 position, vec4 previous, vec4 next, float expandDirection, float width, bool usePrevious, out float angle)\n\
{\n\
vec4 positionEC = czm_modelViewRelativeToEye * position;\n\
vec4 prevEC = czm_modelViewRelativeToEye * previous;\n\
vec4 nextEC = czm_modelViewRelativeToEye * next;\n\
return getPolylineWindowCoordinatesEC(positionEC, prevEC, nextEC, expandDirection, width, usePrevious, angle);\n\
}\n\
";
});