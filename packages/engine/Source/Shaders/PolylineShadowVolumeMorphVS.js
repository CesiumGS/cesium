//This file is automatically rebuilt by the Cesium build process.
export default "in vec3 position3DHigh;\n\
in vec3 position3DLow;\n\
\n\
in vec4 startHiAndForwardOffsetX;\n\
in vec4 startLoAndForwardOffsetY;\n\
in vec4 startNormalAndForwardOffsetZ;\n\
in vec4 endNormalAndTextureCoordinateNormalizationX;\n\
in vec4 rightNormalAndTextureCoordinateNormalizationY;\n\
in vec4 startHiLo2D;\n\
in vec4 offsetAndRight2D;\n\
in vec4 startEndNormals2D;\n\
in vec2 texcoordNormalization2D;\n\
\n\
in float batchId;\n\
\n\
out vec3 v_forwardDirectionEC;\n\
out vec3 v_texcoordNormalizationAndHalfWidth;\n\
out float v_batchId;\n\
\n\
// For materials\n\
#ifdef WIDTH_VARYING\n\
out float v_width;\n\
#endif\n\
#ifdef ANGLE_VARYING\n\
out float v_polylineAngle;\n\
#endif\n\
\n\
#ifdef PER_INSTANCE_COLOR\n\
out vec4 v_color;\n\
#else\n\
out vec2 v_alignedPlaneDistances;\n\
out float v_texcoordT;\n\
#endif\n\
\n\
// Morphing planes using SLERP or NLERP doesn't seem to work, so instead draw the material directly on the shadow volume.\n\
// Morph views are from very far away and aren't meant to be used precisely, so this should be sufficient.\n\
void main()\n\
{\n\
    v_batchId = batchId;\n\
\n\
    // Start position\n\
    vec4 posRelativeToEye2D = czm_translateRelativeToEye(vec3(0.0, startHiLo2D.xy), vec3(0.0, startHiLo2D.zw));\n\
    vec4 posRelativeToEye3D = czm_translateRelativeToEye(startHiAndForwardOffsetX.xyz, startLoAndForwardOffsetY.xyz);\n\
    vec4 posRelativeToEye = czm_columbusViewMorph(posRelativeToEye2D, posRelativeToEye3D, czm_morphTime);\n\
    vec3 posEc2D = (czm_modelViewRelativeToEye * posRelativeToEye2D).xyz;\n\
    vec3 posEc3D = (czm_modelViewRelativeToEye * posRelativeToEye3D).xyz;\n\
    vec3 startEC = (czm_modelViewRelativeToEye * posRelativeToEye).xyz;\n\
\n\
    // Start plane\n\
    vec4 startPlane2D;\n\
    vec4 startPlane3D;\n\
    startPlane2D.xyz = czm_normal * vec3(0.0, startEndNormals2D.xy);\n\
    startPlane3D.xyz = czm_normal * startNormalAndForwardOffsetZ.xyz;\n\
    startPlane2D.w = -dot(startPlane2D.xyz, posEc2D);\n\
    startPlane3D.w = -dot(startPlane3D.xyz, posEc3D);\n\
\n\
    // Right plane\n\
    vec4 rightPlane2D;\n\
    vec4 rightPlane3D;\n\
    rightPlane2D.xyz = czm_normal * vec3(0.0, offsetAndRight2D.zw);\n\
    rightPlane3D.xyz = czm_normal * rightNormalAndTextureCoordinateNormalizationY.xyz;\n\
    rightPlane2D.w = -dot(rightPlane2D.xyz, posEc2D);\n\
    rightPlane3D.w = -dot(rightPlane3D.xyz, posEc3D);\n\
\n\
    // End position\n\
    posRelativeToEye2D = posRelativeToEye2D + vec4(0.0, offsetAndRight2D.xy, 0.0);\n\
    posRelativeToEye3D = posRelativeToEye3D + vec4(startHiAndForwardOffsetX.w, startLoAndForwardOffsetY.w, startNormalAndForwardOffsetZ.w, 0.0);\n\
    posRelativeToEye = czm_columbusViewMorph(posRelativeToEye2D, posRelativeToEye3D, czm_morphTime);\n\
    posEc2D = (czm_modelViewRelativeToEye * posRelativeToEye2D).xyz;\n\
    posEc3D = (czm_modelViewRelativeToEye * posRelativeToEye3D).xyz;\n\
    vec3 endEC = (czm_modelViewRelativeToEye * posRelativeToEye).xyz;\n\
    vec3 forwardEc3D = czm_normal * normalize(vec3(startHiAndForwardOffsetX.w, startLoAndForwardOffsetY.w, startNormalAndForwardOffsetZ.w));\n\
    vec3 forwardEc2D = czm_normal * normalize(vec3(0.0, offsetAndRight2D.xy));\n\
\n\
    // End plane\n\
    vec4 endPlane2D;\n\
    vec4 endPlane3D;\n\
    endPlane2D.xyz = czm_normal * vec3(0.0, startEndNormals2D.zw);\n\
    endPlane3D.xyz = czm_normal * endNormalAndTextureCoordinateNormalizationX.xyz;\n\
    endPlane2D.w = -dot(endPlane2D.xyz, posEc2D);\n\
    endPlane3D.w = -dot(endPlane3D.xyz, posEc3D);\n\
\n\
    // Forward direction\n\
    v_forwardDirectionEC = normalize(endEC - startEC);\n\
\n\
    vec2 cleanTexcoordNormalization2D;\n\
    cleanTexcoordNormalization2D.x = abs(texcoordNormalization2D.x);\n\
    cleanTexcoordNormalization2D.y = czm_branchFreeTernary(texcoordNormalization2D.y > 1.0, 0.0, abs(texcoordNormalization2D.y));\n\
    vec2 cleanTexcoordNormalization3D;\n\
    cleanTexcoordNormalization3D.x = abs(endNormalAndTextureCoordinateNormalizationX.w);\n\
    cleanTexcoordNormalization3D.y = rightNormalAndTextureCoordinateNormalizationY.w;\n\
    cleanTexcoordNormalization3D.y = czm_branchFreeTernary(cleanTexcoordNormalization3D.y > 1.0, 0.0, abs(cleanTexcoordNormalization3D.y));\n\
\n\
    v_texcoordNormalizationAndHalfWidth.xy = mix(cleanTexcoordNormalization2D, cleanTexcoordNormalization3D, czm_morphTime);\n\
\n\
#ifdef PER_INSTANCE_COLOR\n\
    v_color = czm_batchTable_color(batchId);\n\
#else // PER_INSTANCE_COLOR\n\
    // For computing texture coordinates\n\
\n\
    v_alignedPlaneDistances.x = -dot(v_forwardDirectionEC, startEC);\n\
    v_alignedPlaneDistances.y = -dot(-v_forwardDirectionEC, endEC);\n\
#endif // PER_INSTANCE_COLOR\n\
\n\
#ifdef WIDTH_VARYING\n\
    float width = czm_batchTable_width(batchId);\n\
    float halfWidth = width * 0.5;\n\
    v_width = width;\n\
    v_texcoordNormalizationAndHalfWidth.z = halfWidth;\n\
#else\n\
    float halfWidth = 0.5 * czm_batchTable_width(batchId);\n\
    v_texcoordNormalizationAndHalfWidth.z = halfWidth;\n\
#endif\n\
\n\
    // Compute a normal along which to \"push\" the position out, extending the miter depending on view distance.\n\
    // Position has already been \"pushed\" by unit length along miter normal, and miter normals are encoded in the planes.\n\
    // Decode the normal to use at this specific vertex, push the position back, and then push to where it needs to be.\n\
    // Since this is morphing, compute both 3D and 2D positions and then blend.\n\
\n\
    // ****** 3D ******\n\
    // Check distance to the end plane and start plane, pick the plane that is closer\n\
    vec4 positionEc3D = czm_modelViewRelativeToEye * czm_translateRelativeToEye(position3DHigh, position3DLow); // w = 1.0, see czm_computePosition\n\
    float absStartPlaneDistance = abs(czm_planeDistance(startPlane3D, positionEc3D.xyz));\n\
    float absEndPlaneDistance = abs(czm_planeDistance(endPlane3D, positionEc3D.xyz));\n\
    vec3 planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, startPlane3D.xyz, endPlane3D.xyz);\n\
    vec3 upOrDown = normalize(cross(rightPlane3D.xyz, planeDirection)); // Points \"up\" for start plane, \"down\" at end plane.\n\
    vec3 normalEC = normalize(cross(planeDirection, upOrDown));         // In practice, the opposite seems to work too.\n\
\n\
    // Nudge the top vertex upwards to prevent flickering\n\
    vec3 geodeticSurfaceNormal = normalize(cross(normalEC, forwardEc3D));\n\
    geodeticSurfaceNormal *= float(0.0 <= rightNormalAndTextureCoordinateNormalizationY.w && rightNormalAndTextureCoordinateNormalizationY.w <= 1.0);\n\
    geodeticSurfaceNormal *= MAX_TERRAIN_HEIGHT;\n\
    positionEc3D.xyz += geodeticSurfaceNormal;\n\
\n\
    // Determine if this vertex is on the \"left\" or \"right\"\n\
    normalEC *= sign(endNormalAndTextureCoordinateNormalizationX.w);\n\
\n\
    // A \"perfect\" implementation would push along normals according to the angle against forward.\n\
    // In practice, just pushing the normal out by halfWidth is sufficient for morph views.\n\
    positionEc3D.xyz += halfWidth * max(0.0, czm_metersPerPixel(positionEc3D)) * normalEC; // prevent artifacts when czm_metersPerPixel is negative (behind camera)\n\
\n\
    // ****** 2D ******\n\
    // Check distance to the end plane and start plane, pick the plane that is closer\n\
    vec4 positionEc2D = czm_modelViewRelativeToEye * czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy); // w = 1.0, see czm_computePosition\n\
    absStartPlaneDistance = abs(czm_planeDistance(startPlane2D, positionEc2D.xyz));\n\
    absEndPlaneDistance = abs(czm_planeDistance(endPlane2D, positionEc2D.xyz));\n\
    planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, startPlane2D.xyz, endPlane2D.xyz);\n\
    upOrDown = normalize(cross(rightPlane2D.xyz, planeDirection)); // Points \"up\" for start plane, \"down\" at end plane.\n\
    normalEC = normalize(cross(planeDirection, upOrDown));         // In practice, the opposite seems to work too.\n\
\n\
    // Nudge the top vertex upwards to prevent flickering\n\
    geodeticSurfaceNormal = normalize(cross(normalEC, forwardEc2D));\n\
    geodeticSurfaceNormal *= float(0.0 <= texcoordNormalization2D.y && texcoordNormalization2D.y <= 1.0);\n\
    geodeticSurfaceNormal *= MAX_TERRAIN_HEIGHT;\n\
    positionEc2D.xyz += geodeticSurfaceNormal;\n\
\n\
    // Determine if this vertex is on the \"left\" or \"right\"\n\
    normalEC *= sign(texcoordNormalization2D.x);\n\
#ifndef PER_INSTANCE_COLOR\n\
    // Use vertex's sidedness to compute its texture coordinate.\n\
    v_texcoordT = clamp(sign(texcoordNormalization2D.x), 0.0, 1.0);\n\
#endif\n\
\n\
    // A \"perfect\" implementation would push along normals according to the angle against forward.\n\
    // In practice, just pushing the normal out by halfWidth is sufficient for morph views.\n\
    positionEc2D.xyz += halfWidth * max(0.0, czm_metersPerPixel(positionEc2D)) * normalEC; // prevent artifacts when czm_metersPerPixel is negative (behind camera)\n\
\n\
    // Blend for actual position\n\
    gl_Position = czm_projection * mix(positionEc2D, positionEc3D, czm_morphTime);\n\
\n\
#ifdef ANGLE_VARYING\n\
    // Approximate relative screen space direction of the line.\n\
    vec2 approxLineDirection = normalize(vec2(v_forwardDirectionEC.x, -v_forwardDirectionEC.y));\n\
    approxLineDirection.y = czm_branchFreeTernary(approxLineDirection.x == 0.0 && approxLineDirection.y == 0.0, -1.0, approxLineDirection.y);\n\
    v_polylineAngle = czm_fastApproximateAtan(approxLineDirection.x, approxLineDirection.y);\n\
#endif\n\
}\n\
";
