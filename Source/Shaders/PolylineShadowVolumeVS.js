//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "attribute vec3 position3DHigh;\n\
attribute vec3 position3DLow;\n\
\n\
// In 2D and in 3D, texture coordinate normalization component signs encodes:\n\
// * X sign - sidedness relative to right plane\n\
// * Y sign - is negative OR magnitude is greater than 1.0 if vertex is on bottom of volume\n\
#ifndef COLUMBUS_VIEW_2D\n\
attribute vec4 startHiAndForwardOffsetX;\n\
attribute vec4 startLoAndForwardOffsetY;\n\
attribute vec4 startNormalAndForwardOffsetZ;\n\
attribute vec4 endNormalAndTextureCoordinateNormalizationX;\n\
attribute vec4 rightNormalAndTextureCoordinateNormalizationY;\n\
#else\n\
attribute vec4 startHiLo2D;\n\
attribute vec4 offsetAndRight2D;\n\
attribute vec4 startEndNormals2D;\n\
attribute vec2 texcoordNormalization2D;\n\
#endif\n\
\n\
attribute float batchId;\n\
\n\
varying vec4 v_startPlaneNormalEcAndHalfWidth;\n\
varying vec4 v_endPlaneNormalEcAndBatchId;\n\
varying vec4 v_rightPlaneEC;\n\
varying vec4 v_endEcAndStartEcX;\n\
varying vec4 v_texcoordNormalizationAndStartEcYZ;\n\
\n\
// For materials\n\
#ifdef WIDTH_VARYING\n\
varying float v_width;\n\
#endif\n\
#ifdef ANGLE_VARYING\n\
varying float v_polylineAngle;\n\
#endif\n\
\n\
#ifdef PER_INSTANCE_COLOR\n\
varying vec4 v_color;\n\
#endif\n\
\n\
void main()\n\
{\n\
#ifdef COLUMBUS_VIEW_2D\n\
    vec3 ecStart = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(vec3(0.0, startHiLo2D.xy), vec3(0.0, startHiLo2D.zw))).xyz;\n\
\n\
    vec3 forwardDirectionEC = czm_normal * vec3(0.0, offsetAndRight2D.xy);\n\
    vec3 ecEnd = forwardDirectionEC + ecStart;\n\
    forwardDirectionEC = normalize(forwardDirectionEC);\n\
\n\
    // Right plane\n\
    v_rightPlaneEC.xyz = czm_normal * vec3(0.0, offsetAndRight2D.zw);\n\
    v_rightPlaneEC.w = -dot(v_rightPlaneEC.xyz, ecStart);\n\
\n\
    // start plane\n\
    vec4 startPlaneEC;\n\
    startPlaneEC.xyz =  czm_normal * vec3(0.0, startEndNormals2D.xy);\n\
    startPlaneEC.w = -dot(startPlaneEC.xyz, ecStart);\n\
\n\
    // end plane\n\
    vec4 endPlaneEC;\n\
    endPlaneEC.xyz =  czm_normal * vec3(0.0, startEndNormals2D.zw);\n\
    endPlaneEC.w = -dot(endPlaneEC.xyz, ecEnd);\n\
\n\
    v_texcoordNormalizationAndStartEcYZ.x = abs(texcoordNormalization2D.x);\n\
    v_texcoordNormalizationAndStartEcYZ.y = texcoordNormalization2D.y;\n\
\n\
#else // COLUMBUS_VIEW_2D\n\
    vec3 ecStart = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(startHiAndForwardOffsetX.xyz, startLoAndForwardOffsetY.xyz)).xyz;\n\
    vec3 offset = czm_normal * vec3(startHiAndForwardOffsetX.w, startLoAndForwardOffsetY.w, startNormalAndForwardOffsetZ.w);\n\
    vec3 ecEnd = ecStart + offset;\n\
\n\
    vec3 forwardDirectionEC = normalize(offset);\n\
\n\
    // start plane\n\
    vec4 startPlaneEC;\n\
    startPlaneEC.xyz = czm_normal * startNormalAndForwardOffsetZ.xyz;\n\
    startPlaneEC.w = -dot(startPlaneEC.xyz, ecStart);\n\
\n\
    // end plane\n\
    vec4 endPlaneEC;\n\
    endPlaneEC.xyz = czm_normal * endNormalAndTextureCoordinateNormalizationX.xyz;\n\
    endPlaneEC.w = -dot(endPlaneEC.xyz, ecEnd);\n\
\n\
    // Right plane\n\
    v_rightPlaneEC.xyz = czm_normal * rightNormalAndTextureCoordinateNormalizationY.xyz;\n\
    v_rightPlaneEC.w = -dot(v_rightPlaneEC.xyz, ecStart);\n\
\n\
    v_texcoordNormalizationAndStartEcYZ.x = abs(endNormalAndTextureCoordinateNormalizationX.w);\n\
    v_texcoordNormalizationAndStartEcYZ.y = rightNormalAndTextureCoordinateNormalizationY.w;\n\
\n\
#endif // COLUMBUS_VIEW_2D\n\
\n\
    v_endEcAndStartEcX.xyz = ecEnd;\n\
    v_endEcAndStartEcX.w = ecStart.x;\n\
    v_texcoordNormalizationAndStartEcYZ.zw = ecStart.yz;\n\
\n\
#ifdef PER_INSTANCE_COLOR\n\
    v_color = czm_batchTable_color(batchId);\n\
#endif // PER_INSTANCE_COLOR\n\
\n\
    // Compute a normal along which to \"push\" the position out, extending the miter depending on view distance.\n\
    // Position has already been \"pushed\" by unit length along miter normal, and miter normals are encoded in the planes.\n\
    // Decode the normal to use at this specific vertex, push the position back, and then push to where it needs to be.\n\
    vec4 positionRelativeToEye = czm_computePosition();\n\
\n\
    // Check distance to the end plane and start plane, pick the plane that is closer\n\
    vec4 positionEC = czm_modelViewRelativeToEye * positionRelativeToEye; // w = 1.0, see czm_computePosition\n\
    float absStartPlaneDistance = abs(czm_planeDistance(startPlaneEC, positionEC.xyz));\n\
    float absEndPlaneDistance = abs(czm_planeDistance(endPlaneEC, positionEC.xyz));\n\
    vec3 planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, startPlaneEC.xyz, endPlaneEC.xyz);\n\
    vec3 upOrDown = normalize(cross(v_rightPlaneEC.xyz, planeDirection)); // Points \"up\" for start plane, \"down\" at end plane.\n\
    vec3 normalEC = normalize(cross(planeDirection, upOrDown));           // In practice, the opposite seems to work too.\n\
\n\
    // Extrude bottom vertices downward for far view distances, like for GroundPrimitives\n\
    upOrDown = cross(forwardDirectionEC, normalEC);\n\
    upOrDown = float(czm_sceneMode == czm_sceneMode3D) * upOrDown;\n\
    upOrDown = float(v_texcoordNormalizationAndStartEcYZ.y > 1.0 || v_texcoordNormalizationAndStartEcYZ.y < 0.0) * upOrDown;\n\
    upOrDown = min(GLOBE_MINIMUM_ALTITUDE, czm_geometricToleranceOverMeter * length(positionRelativeToEye.xyz)) * upOrDown;\n\
    positionEC.xyz += upOrDown;\n\
\n\
    v_texcoordNormalizationAndStartEcYZ.y = czm_branchFreeTernary(v_texcoordNormalizationAndStartEcYZ.y > 1.0, 0.0, abs(v_texcoordNormalizationAndStartEcYZ.y));\n\
\n\
    // Determine distance along normalEC to push for a volume of appropriate width.\n\
    // Make volumes about double pixel width for a conservative fit - in practice the\n\
    // extra cost here is minimal compared to the loose volume heights.\n\
    //\n\
    // N = normalEC (guaranteed \"right-facing\")\n\
    // R = rightEC\n\
    // p = angle between N and R\n\
    // w = distance to push along R if R == N\n\
    // d = distance to push along N\n\
    //\n\
    //   N   R\n\
    //  { \ p| }      * cos(p) = dot(N, R) = w / d\n\
    //  d\ \ |  |w    * d = w / dot(N, R)\n\
    //    { \| }\n\
    //       o---------- polyline segment ---->\n\
    //\n\
    float width = czm_batchTable_width(batchId);\n\
#ifdef WIDTH_VARYING\n\
    v_width = width;\n\
#endif\n\
\n\
    v_startPlaneNormalEcAndHalfWidth.xyz = startPlaneEC.xyz;\n\
    v_startPlaneNormalEcAndHalfWidth.w = width * 0.5;\n\
\n\
    v_endPlaneNormalEcAndBatchId.xyz = endPlaneEC.xyz;\n\
    v_endPlaneNormalEcAndBatchId.w = batchId;\n\
\n\
    width = width * max(0.0, czm_metersPerPixel(positionEC)); // width = distance to push along R\n\
    width = width / dot(normalEC, v_rightPlaneEC.xyz); // width = distance to push along N\n\
\n\
    // Determine if this vertex is on the \"left\" or \"right\"\n\
#ifdef COLUMBUS_VIEW_2D\n\
        normalEC *= sign(texcoordNormalization2D.x);\n\
#else\n\
        normalEC *= sign(endNormalAndTextureCoordinateNormalizationX.w);\n\
#endif\n\
\n\
    positionEC.xyz += width * normalEC;\n\
    gl_Position = czm_depthClampFarPlane(czm_projection * positionEC);\n\
\n\
#ifdef ANGLE_VARYING\n\
    // Approximate relative screen space direction of the line.\n\
    vec2 approxLineDirection = normalize(vec2(forwardDirectionEC.x, -forwardDirectionEC.y));\n\
    approxLineDirection.y = czm_branchFreeTernary(approxLineDirection.x == 0.0 && approxLineDirection.y == 0.0, -1.0, approxLineDirection.y);\n\
    v_polylineAngle = czm_fastApproximateAtan(approxLineDirection.x, approxLineDirection.y);\n\
#endif\n\
}\n\
";
});