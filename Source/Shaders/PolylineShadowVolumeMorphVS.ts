//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "attribute vec3 position3DHigh;\n\
attribute vec3 position3DLow;\n\
attribute vec4 startHiAndForwardOffsetX;\n\
attribute vec4 startLoAndForwardOffsetY;\n\
attribute vec4 startNormalAndForwardOffsetZ;\n\
attribute vec4 endNormalAndTextureCoordinateNormalizationX;\n\
attribute vec4 rightNormalAndTextureCoordinateNormalizationY;\n\
attribute vec4 startHiLo2D;\n\
attribute vec4 offsetAndRight2D;\n\
attribute vec4 startEndNormals2D;\n\
attribute vec2 texcoordNormalization2D;\n\
attribute float batchId;\n\
varying vec3 v_forwardDirectionEC;\n\
varying vec3 v_texcoordNormalizationAndHalfWidth;\n\
varying float v_batchId;\n\
#ifdef WIDTH_VARYING\n\
varying float v_width;\n\
#endif\n\
#ifdef ANGLE_VARYING\n\
varying float v_polylineAngle;\n\
#endif\n\
#ifdef PER_INSTANCE_COLOR\n\
varying vec4 v_color;\n\
#else\n\
varying vec2 v_alignedPlaneDistances;\n\
varying float v_texcoordT;\n\
#endif\n\
void main()\n\
{\n\
v_batchId = batchId;\n\
vec4 posRelativeToEye2D = czm_translateRelativeToEye(vec3(0.0, startHiLo2D.xy), vec3(0.0, startHiLo2D.zw));\n\
vec4 posRelativeToEye3D = czm_translateRelativeToEye(startHiAndForwardOffsetX.xyz, startLoAndForwardOffsetY.xyz);\n\
vec4 posRelativeToEye = czm_columbusViewMorph(posRelativeToEye2D, posRelativeToEye3D, czm_morphTime);\n\
vec3 posEc2D = (czm_modelViewRelativeToEye * posRelativeToEye2D).xyz;\n\
vec3 posEc3D = (czm_modelViewRelativeToEye * posRelativeToEye3D).xyz;\n\
vec3 startEC = (czm_modelViewRelativeToEye * posRelativeToEye).xyz;\n\
vec4 startPlane2D;\n\
vec4 startPlane3D;\n\
startPlane2D.xyz = czm_normal * vec3(0.0, startEndNormals2D.xy);\n\
startPlane3D.xyz = czm_normal * startNormalAndForwardOffsetZ.xyz;\n\
startPlane2D.w = -dot(startPlane2D.xyz, posEc2D);\n\
startPlane3D.w = -dot(startPlane3D.xyz, posEc3D);\n\
vec4 rightPlane2D;\n\
vec4 rightPlane3D;\n\
rightPlane2D.xyz = czm_normal * vec3(0.0, offsetAndRight2D.zw);\n\
rightPlane3D.xyz = czm_normal * rightNormalAndTextureCoordinateNormalizationY.xyz;\n\
rightPlane2D.w = -dot(rightPlane2D.xyz, posEc2D);\n\
rightPlane3D.w = -dot(rightPlane3D.xyz, posEc3D);\n\
posRelativeToEye2D = posRelativeToEye2D + vec4(0.0, offsetAndRight2D.xy, 0.0);\n\
posRelativeToEye3D = posRelativeToEye3D + vec4(startHiAndForwardOffsetX.w, startLoAndForwardOffsetY.w, startNormalAndForwardOffsetZ.w, 0.0);\n\
posRelativeToEye = czm_columbusViewMorph(posRelativeToEye2D, posRelativeToEye3D, czm_morphTime);\n\
posEc2D = (czm_modelViewRelativeToEye * posRelativeToEye2D).xyz;\n\
posEc3D = (czm_modelViewRelativeToEye * posRelativeToEye3D).xyz;\n\
vec3 endEC = (czm_modelViewRelativeToEye * posRelativeToEye).xyz;\n\
vec3 forwardEc3D = czm_normal * normalize(vec3(startHiAndForwardOffsetX.w, startLoAndForwardOffsetY.w, startNormalAndForwardOffsetZ.w));\n\
vec3 forwardEc2D = czm_normal * normalize(vec3(0.0, offsetAndRight2D.xy));\n\
vec4 endPlane2D;\n\
vec4 endPlane3D;\n\
endPlane2D.xyz = czm_normal * vec3(0.0, startEndNormals2D.zw);\n\
endPlane3D.xyz = czm_normal * endNormalAndTextureCoordinateNormalizationX.xyz;\n\
endPlane2D.w = -dot(endPlane2D.xyz, posEc2D);\n\
endPlane3D.w = -dot(endPlane3D.xyz, posEc3D);\n\
v_forwardDirectionEC = normalize(endEC - startEC);\n\
vec2 cleanTexcoordNormalization2D;\n\
cleanTexcoordNormalization2D.x = abs(texcoordNormalization2D.x);\n\
cleanTexcoordNormalization2D.y = czm_branchFreeTernary(texcoordNormalization2D.y > 1.0, 0.0, abs(texcoordNormalization2D.y));\n\
vec2 cleanTexcoordNormalization3D;\n\
cleanTexcoordNormalization3D.x = abs(endNormalAndTextureCoordinateNormalizationX.w);\n\
cleanTexcoordNormalization3D.y = rightNormalAndTextureCoordinateNormalizationY.w;\n\
cleanTexcoordNormalization3D.y = czm_branchFreeTernary(cleanTexcoordNormalization3D.y > 1.0, 0.0, abs(cleanTexcoordNormalization3D.y));\n\
v_texcoordNormalizationAndHalfWidth.xy = mix(cleanTexcoordNormalization2D, cleanTexcoordNormalization3D, czm_morphTime);\n\
#ifdef PER_INSTANCE_COLOR\n\
v_color = czm_batchTable_color(batchId);\n\
#else // PER_INSTANCE_COLOR\n\
v_alignedPlaneDistances.x = -dot(v_forwardDirectionEC, startEC);\n\
v_alignedPlaneDistances.y = -dot(-v_forwardDirectionEC, endEC);\n\
#endif // PER_INSTANCE_COLOR\n\
#ifdef WIDTH_VARYING\n\
float width = czm_batchTable_width(batchId);\n\
float halfWidth = width * 0.5;\n\
v_width = width;\n\
v_texcoordNormalizationAndHalfWidth.z = halfWidth;\n\
#else\n\
float halfWidth = 0.5 * czm_batchTable_width(batchId);\n\
v_texcoordNormalizationAndHalfWidth.z = halfWidth;\n\
#endif\n\
vec4 positionEc3D = czm_modelViewRelativeToEye * czm_translateRelativeToEye(position3DHigh, position3DLow);\n\
float absStartPlaneDistance = abs(czm_planeDistance(startPlane3D, positionEc3D.xyz));\n\
float absEndPlaneDistance = abs(czm_planeDistance(endPlane3D, positionEc3D.xyz));\n\
vec3 planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, startPlane3D.xyz, endPlane3D.xyz);\n\
vec3 upOrDown = normalize(cross(rightPlane3D.xyz, planeDirection));\n\
vec3 normalEC = normalize(cross(planeDirection, upOrDown));\n\
vec3 geodeticSurfaceNormal = normalize(cross(normalEC, forwardEc3D));\n\
geodeticSurfaceNormal *= float(0.0 <= rightNormalAndTextureCoordinateNormalizationY.w && rightNormalAndTextureCoordinateNormalizationY.w <= 1.0);\n\
geodeticSurfaceNormal *= MAX_TERRAIN_HEIGHT;\n\
positionEc3D.xyz += geodeticSurfaceNormal;\n\
normalEC *= sign(endNormalAndTextureCoordinateNormalizationX.w);\n\
positionEc3D.xyz += halfWidth * max(0.0, czm_metersPerPixel(positionEc3D)) * normalEC;\n\
vec4 positionEc2D = czm_modelViewRelativeToEye * czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy);\n\
absStartPlaneDistance = abs(czm_planeDistance(startPlane2D, positionEc2D.xyz));\n\
absEndPlaneDistance = abs(czm_planeDistance(endPlane2D, positionEc2D.xyz));\n\
planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, startPlane2D.xyz, endPlane2D.xyz);\n\
upOrDown = normalize(cross(rightPlane2D.xyz, planeDirection));\n\
normalEC = normalize(cross(planeDirection, upOrDown));\n\
geodeticSurfaceNormal = normalize(cross(normalEC, forwardEc2D));\n\
geodeticSurfaceNormal *= float(0.0 <= texcoordNormalization2D.y && texcoordNormalization2D.y <= 1.0);\n\
geodeticSurfaceNormal *= MAX_TERRAIN_HEIGHT;\n\
positionEc2D.xyz += geodeticSurfaceNormal;\n\
normalEC *= sign(texcoordNormalization2D.x);\n\
#ifndef PER_INSTANCE_COLOR\n\
v_texcoordT = clamp(sign(texcoordNormalization2D.x), 0.0, 1.0);\n\
#endif\n\
positionEc2D.xyz += halfWidth * max(0.0, czm_metersPerPixel(positionEc2D)) * normalEC;\n\
gl_Position = czm_projection * mix(positionEc2D, positionEc3D, czm_morphTime);\n\
#ifdef ANGLE_VARYING\n\
vec2 approxLineDirection = normalize(vec2(v_forwardDirectionEC.x, -v_forwardDirectionEC.y));\n\
approxLineDirection.y = czm_branchFreeTernary(approxLineDirection.x == 0.0 && approxLineDirection.y == 0.0, -1.0, approxLineDirection.y);\n\
v_polylineAngle = czm_fastApproximateAtan(approxLineDirection.x, approxLineDirection.y);\n\
#endif\n\
}\n\
";
});