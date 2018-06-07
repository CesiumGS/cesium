attribute vec3 position3DHigh;
attribute vec3 position3DLow;

attribute vec4 startHi_and_forwardOffsetX;
attribute vec4 startLo_and_forwardOffsetY;
attribute vec4 startNormal_and_forwardOffsetZ;
attribute vec4 endNormal_and_textureCoordinateNormalizationX;
attribute vec4 rightNormal_and_textureCoordinateNormalizationY;
attribute vec4 startHiLo2D;
attribute vec4 offsetAndRight2D;
attribute vec4 startEndNormals2D;
attribute vec2 texcoordNormalization2D;

attribute float batchId;

varying vec3 v_forwardDirectionEC;
varying vec3 v_texcoordNormalization_and_halfWidth;

// For materials
#ifdef WIDTH_VARYING
varying float v_width;
#endif
#ifdef ANGLE_VARYING
varying float v_polylineAngle;
#endif

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#else
varying vec2 v_alignedPlaneDistances;
varying float v_texcoordT;
#endif

// Morphing planes using SLERP or NLERP doesn't seem to work, so instead draw the material directly on the shadow volume.
// Morph views are from very far away and aren't meant to be used precisely, so this should be sufficient.
void main()
{
    // Start position
    vec4 posRelativeToEye2D = czm_translateRelativeToEye(vec3(0.0, startHiLo2D.xy), vec3(0.0, startHiLo2D.zw));
    vec4 posRelativeToEye3D = czm_translateRelativeToEye(startHi_and_forwardOffsetX.xyz, startLo_and_forwardOffsetY.xyz);
    vec4 posRelativeToEye = czm_columbusViewMorph(posRelativeToEye2D, posRelativeToEye3D, czm_morphTime);
    vec3 ecPos2D = (czm_modelViewRelativeToEye * posRelativeToEye2D).xyz;
    vec3 ecPos3D = (czm_modelViewRelativeToEye * posRelativeToEye3D).xyz;
    vec3 ecStart = (czm_modelViewRelativeToEye * posRelativeToEye).xyz;

    // Start plane
    vec4 startPlane2D;
    vec4 startPlane3D;
    startPlane2D.xyz = czm_normal * vec3(0.0, startEndNormals2D.xy);
    startPlane3D.xyz = czm_normal * startNormal_and_forwardOffsetZ.xyz;
    startPlane2D.w = -dot(startPlane2D.xyz, ecPos2D);
    startPlane3D.w = -dot(startPlane3D.xyz, ecPos3D);

    // Right plane
    vec4 rightPlane2D;
    vec4 rightPlane3D;
    rightPlane2D.xyz = czm_normal * vec3(0.0, offsetAndRight2D.zw);
    rightPlane3D.xyz = czm_normal * rightNormal_and_textureCoordinateNormalizationY.xyz;
    rightPlane2D.w = -dot(rightPlane2D.xyz, ecPos2D);
    rightPlane3D.w = -dot(rightPlane3D.xyz, ecPos3D);

    // End position
    posRelativeToEye2D = posRelativeToEye2D + vec4(0.0, offsetAndRight2D.xy, 0.0);
    posRelativeToEye3D = posRelativeToEye3D + vec4(startHi_and_forwardOffsetX.w, startLo_and_forwardOffsetY.w, startNormal_and_forwardOffsetZ.w, 0.0);
    posRelativeToEye = czm_columbusViewMorph(posRelativeToEye2D, posRelativeToEye3D, czm_morphTime);
    ecPos2D = (czm_modelViewRelativeToEye * posRelativeToEye2D).xyz;
    ecPos3D = (czm_modelViewRelativeToEye * posRelativeToEye3D).xyz;
    vec3 ecEnd = (czm_modelViewRelativeToEye * posRelativeToEye).xyz;

    // End plane
    vec4 endPlane2D;
    vec4 endPlane3D;
    endPlane2D.xyz = czm_normal * vec3(0.0, startEndNormals2D.zw);
    endPlane3D.xyz = czm_normal * endNormal_and_textureCoordinateNormalizationX.xyz;
    endPlane2D.w = -dot(endPlane2D.xyz, ecPos2D);
    endPlane3D.w = -dot(endPlane3D.xyz, ecPos3D);

    // Forward direction
    v_forwardDirectionEC = normalize(ecEnd - ecStart);

    v_texcoordNormalization_and_halfWidth.xy = mix(
        vec2(abs(texcoordNormalization2D.x), texcoordNormalization2D.y),
        vec2(abs(endNormal_and_textureCoordinateNormalizationX.w), rightNormal_and_textureCoordinateNormalizationY.w), czm_morphTime);

#ifdef PER_INSTANCE_COLOR
    v_color = czm_batchTable_color(batchId);
#else // PER_INSTANCE_COLOR
    // For computing texture coordinates

    v_alignedPlaneDistances.x = -dot(v_forwardDirectionEC, ecStart);
    v_alignedPlaneDistances.y = -dot(-v_forwardDirectionEC, ecEnd);
#endif // PER_INSTANCE_COLOR

#ifdef WIDTH_VARYING
    float width = czm_batchTable_width(batchId);
    float halfWidth = width * 0.5;
    v_width = width;
    v_texcoordNormalization_and_halfWidth.z = halfWidth;
#else
    float halfWidth = 0.5 * czm_batchTable_width(batchId);
    v_texcoordNormalization_and_halfWidth.z = halfWidth;
#endif

    // Compute a normal along which to "push" the position out, extending the miter depending on view distance.
    // Position has already been "pushed" by unit length along miter normal, and miter normals are encoded in the planes.
    // Decode the normal to use at this specific vertex, push the position back, and then push to where it needs to be.
    // Since this is morphing, compute both 3D and 2D positions and then blend.

    // ****** 3D ******
    // Check distance to the end plane and start plane, pick the plane that is closer
    vec4 positionEC3D = czm_modelViewRelativeToEye * czm_translateRelativeToEye(position3DHigh, position3DLow); // w = 1.0, see czm_computePosition
    float absStartPlaneDistance = abs(czm_planeDistance(startPlane3D, positionEC3D.xyz));
    float absEndPlaneDistance = abs(czm_planeDistance(endPlane3D, positionEC3D.xyz));
    vec3 planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, startPlane3D.xyz, endPlane3D.xyz);
    vec3 upOrDown = normalize(cross(rightPlane3D.xyz, planeDirection)); // Points "up" for start plane, "down" at end plane.
    vec3 normalEC = normalize(cross(planeDirection, upOrDown));         // In practice, the opposite seems to work too.

    // Determine if this vertex is on the "left" or "right"
    normalEC *= sign(endNormal_and_textureCoordinateNormalizationX.w);

    // A "perfect" implementation would push along normals according to the angle against forward.
    // In practice, just pushing the normal out by halfWidth is sufficient for morph views.
    positionEC3D.xyz += halfWidth * max(0.0, czm_metersPerPixel(positionEC3D)) * normalEC; // prevent artifacts when czm_metersPerPixel is negative (behind camera)

    // ****** 2D ******
    // Check distance to the end plane and start plane, pick the plane that is closer
    vec4 positionEC2D = czm_modelViewRelativeToEye * czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy); // w = 1.0, see czm_computePosition
    absStartPlaneDistance = abs(czm_planeDistance(startPlane2D, positionEC2D.xyz));
    absEndPlaneDistance = abs(czm_planeDistance(endPlane2D, positionEC2D.xyz));
    planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, startPlane2D.xyz, endPlane2D.xyz);
    upOrDown = normalize(cross(rightPlane2D.xyz, planeDirection)); // Points "up" for start plane, "down" at end plane.
    normalEC = normalize(cross(planeDirection, upOrDown));         // In practice, the opposite seems to work too.

    // Determine if this vertex is on the "left" or "right"
    normalEC *= sign(texcoordNormalization2D.x);
#ifndef PER_INSTANCE_COLOR
    // Use vertex's sidedness to compute its texture coordinate.
    v_texcoordT = clamp(sign(texcoordNormalization2D.x), 0.0, 1.0);
#endif

    // A "perfect" implementation would push along normals according to the angle against forward.
    // In practice, just pushing the normal out by halfWidth is sufficient for morph views.
    positionEC2D.xyz -= normalEC; // undo the unit length push
    positionEC2D.xyz += halfWidth * max(0.0, czm_metersPerPixel(positionEC2D)) * normalEC; // prevent artifacts when czm_metersPerPixel is negative (behind camera)

    // Blend for actual position
    gl_Position = czm_projection * mix(positionEC2D, positionEC3D, czm_morphTime);

#ifdef ANGLE_VARYING
    // Approximate relative screen space direction of the line.
    vec2 approxLineDirection = normalize(vec2(v_forwardDirectionEC.x, -v_forwardDirectionEC.y));
    approxLineDirection.y = czm_branchFreeTernary(approxLineDirection.x == 0.0 && approxLineDirection.y == 0.0, -1.0, approxLineDirection.y);
    v_polylineAngle = czm_fastApproximateAtan(approxLineDirection.x, approxLineDirection.y);
#endif
}
