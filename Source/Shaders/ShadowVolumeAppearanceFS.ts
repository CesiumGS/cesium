//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef GL_EXT_frag_depth\n\
#extension GL_EXT_frag_depth : enable\n\
#endif\n\
#ifdef TEXTURE_COORDINATES\n\
#ifdef SPHERICAL\n\
varying vec4 v_sphericalExtents;\n\
#else // SPHERICAL\n\
varying vec2 v_inversePlaneExtents;\n\
varying vec4 v_westPlane;\n\
varying vec4 v_southPlane;\n\
#endif // SPHERICAL\n\
varying vec3 v_uvMinAndSphericalLongitudeRotation;\n\
varying vec3 v_uMaxAndInverseDistance;\n\
varying vec3 v_vMaxAndInverseDistance;\n\
#endif // TEXTURE_COORDINATES\n\
#ifdef PER_INSTANCE_COLOR\n\
varying vec4 v_color;\n\
#endif\n\
#ifdef NORMAL_EC\n\
vec3 getEyeCoordinate3FromWindowCoordinate(vec2 fragCoord, float logDepthOrDepth) {\n\
vec4 eyeCoordinate = czm_windowToEyeCoordinates(fragCoord, logDepthOrDepth);\n\
return eyeCoordinate.xyz / eyeCoordinate.w;\n\
}\n\
vec3 vectorFromOffset(vec4 eyeCoordinate, vec2 positiveOffset) {\n\
vec2 glFragCoordXY = gl_FragCoord.xy;\n\
float upOrRightLogDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY + positiveOffset) / czm_viewport.zw));\n\
float downOrLeftLogDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY - positiveOffset) / czm_viewport.zw));\n\
bvec2 upOrRightInBounds = lessThan(glFragCoordXY + positiveOffset, czm_viewport.zw);\n\
float useUpOrRight = float(upOrRightLogDepth > 0.0 && upOrRightInBounds.x && upOrRightInBounds.y);\n\
float useDownOrLeft = float(useUpOrRight == 0.0);\n\
vec3 upOrRightEC = getEyeCoordinate3FromWindowCoordinate(glFragCoordXY + positiveOffset, upOrRightLogDepth);\n\
vec3 downOrLeftEC = getEyeCoordinate3FromWindowCoordinate(glFragCoordXY - positiveOffset, downOrLeftLogDepth);\n\
return (upOrRightEC - (eyeCoordinate.xyz / eyeCoordinate.w)) * useUpOrRight + ((eyeCoordinate.xyz / eyeCoordinate.w) - downOrLeftEC) * useDownOrLeft;\n\
}\n\
#endif // NORMAL_EC\n\
void main(void)\n\
{\n\
#ifdef REQUIRES_EC\n\
float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, gl_FragCoord.xy / czm_viewport.zw));\n\
vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);\n\
#endif\n\
#ifdef REQUIRES_WC\n\
vec4 worldCoordinate4 = czm_inverseView * eyeCoordinate;\n\
vec3 worldCoordinate = worldCoordinate4.xyz / worldCoordinate4.w;\n\
#endif\n\
#ifdef TEXTURE_COORDINATES\n\
vec2 uv;\n\
#ifdef SPHERICAL\n\
vec2 sphericalLatLong = czm_approximateSphericalCoordinates(worldCoordinate);\n\
sphericalLatLong.y += v_uvMinAndSphericalLongitudeRotation.z;\n\
sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);\n\
uv.x = (sphericalLatLong.y - v_sphericalExtents.y) * v_sphericalExtents.w;\n\
uv.y = (sphericalLatLong.x - v_sphericalExtents.x) * v_sphericalExtents.z;\n\
#else // SPHERICAL\n\
uv.x = czm_planeDistance(v_westPlane, eyeCoordinate.xyz / eyeCoordinate.w) * v_inversePlaneExtents.x;\n\
uv.y = czm_planeDistance(v_southPlane, eyeCoordinate.xyz / eyeCoordinate.w) * v_inversePlaneExtents.y;\n\
#endif // SPHERICAL\n\
#endif // TEXTURE_COORDINATES\n\
#ifdef PICK\n\
#ifdef CULL_FRAGMENTS\n\
if (0.0 <= uv.x && uv.x <= 1.0 && 0.0 <= uv.y && uv.y <= 1.0) {\n\
gl_FragColor.a = 1.0;\n\
czm_writeDepthClampedToFarPlane();\n\
}\n\
#else // CULL_FRAGMENTS\n\
gl_FragColor.a = 1.0;\n\
#endif // CULL_FRAGMENTS\n\
#else // PICK\n\
#ifdef CULL_FRAGMENTS\n\
if (uv.x <= 0.0 || 1.0 <= uv.x || uv.y <= 0.0 || 1.0 <= uv.y) {\n\
discard;\n\
}\n\
#endif\n\
#ifdef NORMAL_EC\n\
vec3 downUp = vectorFromOffset(eyeCoordinate, vec2(0.0, 1.0));\n\
vec3 leftRight = vectorFromOffset(eyeCoordinate, vec2(1.0, 0.0));\n\
vec3 normalEC = normalize(cross(leftRight, downUp));\n\
#endif\n\
#ifdef PER_INSTANCE_COLOR\n\
#ifdef FLAT\n\
gl_FragColor = v_color;\n\
#else // FLAT\n\
czm_materialInput materialInput;\n\
materialInput.normalEC = normalEC;\n\
materialInput.positionToEyeEC = -eyeCoordinate.xyz;\n\
czm_material material = czm_getDefaultMaterial(materialInput);\n\
material.diffuse = v_color.rgb;\n\
material.alpha = v_color.a;\n\
gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material);\n\
#endif // FLAT\n\
#else // PER_INSTANCE_COLOR\n\
czm_materialInput materialInput;\n\
#ifdef USES_NORMAL_EC\n\
materialInput.normalEC = normalEC;\n\
#endif\n\
#ifdef USES_POSITION_TO_EYE_EC\n\
materialInput.positionToEyeEC = -eyeCoordinate.xyz;\n\
#endif\n\
#ifdef USES_TANGENT_TO_EYE\n\
materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(worldCoordinate, normalEC);\n\
#endif\n\
#ifdef USES_ST\n\
materialInput.st.x = czm_lineDistance(v_uvMinAndSphericalLongitudeRotation.xy, v_uMaxAndInverseDistance.xy, uv) * v_uMaxAndInverseDistance.z;\n\
materialInput.st.y = czm_lineDistance(v_uvMinAndSphericalLongitudeRotation.xy, v_vMaxAndInverseDistance.xy, uv) * v_vMaxAndInverseDistance.z;\n\
#endif\n\
czm_material material = czm_getMaterial(materialInput);\n\
#ifdef FLAT\n\
gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n\
#else // FLAT\n\
gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material);\n\
#endif // FLAT\n\
#endif // PER_INSTANCE_COLOR\n\
czm_writeDepthClampedToFarPlane();\n\
#endif // PICK\n\
}\n\
";
});