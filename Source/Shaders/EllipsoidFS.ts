//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef WRITE_DEPTH\n\
#ifdef GL_EXT_frag_depth\n\
#extension GL_EXT_frag_depth : enable\n\
#endif\n\
#endif\n\
uniform vec3 u_radii;\n\
uniform vec3 u_oneOverEllipsoidRadiiSquared;\n\
varying vec3 v_positionEC;\n\
vec4 computeEllipsoidColor(czm_ray ray, float intersection, float side)\n\
{\n\
vec3 positionEC = czm_pointAlongRay(ray, intersection);\n\
vec3 positionMC = (czm_inverseModelView * vec4(positionEC, 1.0)).xyz;\n\
vec3 geodeticNormal = normalize(czm_geodeticSurfaceNormal(positionMC, vec3(0.0), u_oneOverEllipsoidRadiiSquared));\n\
vec3 sphericalNormal = normalize(positionMC / u_radii);\n\
vec3 normalMC = geodeticNormal * side;\n\
vec3 normalEC = normalize(czm_normal * normalMC);\n\
vec2 st = czm_ellipsoidWgs84TextureCoordinates(sphericalNormal);\n\
vec3 positionToEyeEC = -positionEC;\n\
czm_materialInput materialInput;\n\
materialInput.s = st.s;\n\
materialInput.st = st;\n\
materialInput.str = (positionMC + u_radii) / u_radii;\n\
materialInput.normalEC = normalEC;\n\
materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(positionMC, normalEC);\n\
materialInput.positionToEyeEC = positionToEyeEC;\n\
czm_material material = czm_getMaterial(materialInput);\n\
#ifdef ONLY_SUN_LIGHTING\n\
return czm_private_phong(normalize(positionToEyeEC), material);\n\
#else\n\
return czm_phong(normalize(positionToEyeEC), material);\n\
#endif\n\
}\n\
void main()\n\
{\n\
float maxRadius = max(u_radii.x, max(u_radii.y, u_radii.z)) * 1.5;\n\
vec3 direction = normalize(v_positionEC);\n\
vec3 ellipsoidCenter = czm_modelView[3].xyz;\n\
float t1 = -1.0;\n\
float t2 = -1.0;\n\
float b = -2.0 * dot(direction, ellipsoidCenter);\n\
float c = dot(ellipsoidCenter, ellipsoidCenter) - maxRadius * maxRadius;\n\
float discriminant = b * b - 4.0 * c;\n\
if (discriminant >= 0.0) {\n\
t1 = (-b - sqrt(discriminant)) * 0.5;\n\
t2 = (-b + sqrt(discriminant)) * 0.5;\n\
}\n\
if (t1 < 0.0 && t2 < 0.0) {\n\
discard;\n\
}\n\
float t = min(t1, t2);\n\
if (t < 0.0) {\n\
t = 0.0;\n\
}\n\
czm_ellipsoid ellipsoid = czm_ellipsoidNew(ellipsoidCenter, u_radii);\n\
czm_ray ray = czm_ray(t * direction, direction);\n\
czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);\n\
if (czm_isEmpty(intersection))\n\
{\n\
discard;\n\
}\n\
vec4 outsideFaceColor = (intersection.start != 0.0) ? computeEllipsoidColor(ray, intersection.start, 1.0) : vec4(0.0);\n\
vec4 insideFaceColor = (outsideFaceColor.a < 1.0) ? computeEllipsoidColor(ray, intersection.stop, -1.0) : vec4(0.0);\n\
gl_FragColor = mix(insideFaceColor, outsideFaceColor, outsideFaceColor.a);\n\
gl_FragColor.a = 1.0 - (1.0 - insideFaceColor.a) * (1.0 - outsideFaceColor.a);\n\
#ifdef WRITE_DEPTH\n\
#ifdef GL_EXT_frag_depth\n\
t = (intersection.start != 0.0) ? intersection.start : intersection.stop;\n\
vec3 positionEC = czm_pointAlongRay(ray, t);\n\
vec4 positionCC = czm_projection * vec4(positionEC, 1.0);\n\
#ifdef LOG_DEPTH\n\
czm_writeLogDepth(1.0 + positionCC.w);\n\
#else\n\
float z = positionCC.z / positionCC.w;\n\
float n = czm_depthRange.near;\n\
float f = czm_depthRange.far;\n\
gl_FragDepthEXT = (z * (f - n) + f + n) * 0.5;\n\
#endif\n\
#endif\n\
#endif\n\
}\n\
";
});