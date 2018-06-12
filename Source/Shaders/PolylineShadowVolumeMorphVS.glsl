attribute vec3 position3DHigh;
attribute vec3 position3DLow;

attribute vec4 startHiAndForwardOffsetX;
attribute vec4 startLoAndForwardOffsetY;
attribute vec4 startNormalAndForwardOffsetZ;
attribute vec4 endNormalAndTextureCoordinateNormalizationX;
attribute vec4 rightNormalAndTextureCoordinateNormalizationY;
attribute vec4 startHiLo2D;
attribute vec4 offsetAndRight2D;
attribute vec4 startEndNormals2D;
attribute vec2 texcoordNormalization2D;

attribute float batchId;

varying vec3 v_forwardDirectionEC;
varying vec3 v_texcoordNormalizationAndHalfWidth;
varying float v_batchId;

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
    v_batchId = batchId;

    // Start position
    vec4 posRelativeToEye2D = czm_translateRelativeToEye(vec3(0.0, startHiLo2D.xy), vec3(0.0, startHiLo2D.zw));
    vec4 posRelativeToEye3D = czm_translateRelativeToEye(startHiAndForwardOffsetX.xyz, startLoAndForwardOffsetY.xyz);
    vec4 posRelativeToEye = czm_columbusViewMorph(posRelativeToEye2D, posRelativeToEye3D, czm_morphTime);
    vec3 posEc2D = (czm_modelViewRelativeToEye * posRelativeToEye2D).xyz;
    vec3 posEc3D = (czm_modelViewRelativeToEye * posRelativeToEye3D).xyz;
    vec3 startEC = (czm_modelViewRelativeToEye * posRelativeToEye).xyz;

    // Start plane
    vec4 startPlane2D;
    vec4 startPlane3D;
    startPlane2D.xyz = czm_normal * vec3(0.0, startEndNormals2D.xy);
    startPlane3D.xyz = czm_normal * startNormalAndForwardOffsetZ.xyz;
    startPlane2D.w = -dot(startPlane2D.xyz, posEc2D);
    startPlane3D.w = -dot(startPlane3D.xyz, posEc3D);

    // Right plane
    vec4 rightPlane2D;
    vec4 rightPlane3D;
    rightPlane2D.xyz = czm_normal * vec3(0.0, offsetAndRight2D.zw);
    rightPlane3D.xyz = czm_normal * rightNormalAndTextureCoordinateNormalizationY.xyz;
    rightPlane2D.w = -dot(rightPlane2D.xyz, posEc2D);
    rightPlane3D.w = -dot(rightPlane3D.xyz, posEc3D);

    // End position
    posRelativeToEye2D = posRelativeToEye2D + vec4(0.0, offsetAndRight2D.xy, 0.0);
    posRelativeToEye3D = posRelativeToEye3D + vec4(startHiAndForwardOffsetX.w, startLoAndForwardOffsetY.w, startNormalAndForwardOffsetZ.w, 0.0);
    posRelativeToEye = czm_columbusViewMorph(posRelativeToEye2D, posRelativeToEye3D, czm_morphTime);
    posEc2D = (czm_modelViewRelativeToEye * posRelativeToEye2D).xyz;
    posEc3D = (czm_modelViewRelativeToEye * posRelativeToEye3D).xyz;
    vec3 endEC = (czm_modelViewRelativeToEye * posRelativeToEye).xyz;
    vec3 forwardEc3D = czm_normal * normalize(vec3(startHiAndForwardOffsetX.w, startLoAndForwardOffsetY.w, startNormalAndForwardOffsetZ.w));
    vec3 forwardEc2D = czm_normal * normalize(vec3(0.0, offsetAndRight2D.xy));

    // End plane
    vec4 endPlane2D;
    vec4 endPlane3D;
    endPlane2D.xyz = czm_normal * vec3(0.0, startEndNormals2D.zw);
    endPlane3D.xyz = czm_normal * endNormalAndTextureCoordinateNormalizationX.xyz;
    endPlane2D.w = -dot(endPlane2D.xyz, posEc2D);
    endPlane3D.w = -dot(endPlane3D.xyz, posEc3D);

    // Forward direction
    v_forwardDirectionEC = normalize(endEC - startEC);

    vec2 cleanTexcoordNormalization2D;
    cleanTexcoordNormalization2D.x = abs(texcoordNormalization2D.x);
    cleanTexcoordNormalization2D.y = czm_branchFreeTernary(texcoordNormalization2D.y > 1.0, 0.0, abs(texcoordNormalization2D.y));
    vec2 cleanTexcoordNormalization3D;
    cleanTexcoordNormalization3D.x = abs(endNormalAndTextureCoordinateNormalizationX.w);
    cleanTexcoordNormalization3D.y = rightNormalAndTextureCoordinateNormalizationY.w;
    cleanTexcoordNormalization3D.y = czm_branchFreeTernary(cleanTexcoordNormalization3D.y > 1.0, 0.0, abs(cleanTexcoordNormalization3D.y));

    v_texcoordNormalizationAndHalfWidth.xy = mix(cleanTexcoordNormalization2D, cleanTexcoordNormalization3D, czm_morphTime);

#ifdef PER_INSTANCE_COLOR
    v_color = czm_batchTable_color(batchId);
#else // PER_INSTANCE_COLOR
    // For computing texture coordinates

    v_alignedPlaneDistances.x = -dot(v_forwardDirectionEC, startEC);
    v_alignedPlaneDistances.y = -dot(-v_forwardDirectionEC, endEC);
#endif // PER_INSTANCE_COLOR

#ifdef WIDTH_VARYING
    float width = czm_batchTable_width(batchId);
    float halfWidth = width * 0.5;
    v_width = width;
    v_texcoordNormalizationAndHalfWidth.z = halfWidth;
#else
    float halfWidth = 0.5 * czm_batchTable_width(batchId);
    v_texcoordNormalizationAndHalfWidth.z = halfWidth;
#endif

    // Compute a normal along which to "push" the position out, extending the miter depending on view distance.
    // Position has already been "pushed" by unit length along miter normal, and miter normals are encoded in the planes.
    // Decode the normal to use at this specific vertex, push the position back, and then push to where it needs to be.
    // Since this is morphing, compute both 3D and 2D positions and then blend.

    // ****** 3D ******
    // Check distance to the end plane and start plane, pick the plane that is closer
    vec4 positionEc3D = czm_modelViewRelativeToEye * czm_translateRelativeToEye(position3DHigh, position3DLow); // w = 1.0, see czm_computePosition
    float absStartPlaneDistance = abs(czm_planeDistance(startPlane3D, positionEc3D.xyz));
    float absEndPlaneDistance = abs(czm_planeDistance(endPlane3D, positionEc3D.xyz));
    vec3 planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, startPlane3D.xyz, endPlane3D.xyz);
    vec3 upOrDown = normalize(cross(rightPlane3D.xyz, planeDirection)); // Points "up" for start plane, "down" at end plane.
    vec3 normalEC = normalize(cross(planeDirection, upOrDown));         // In practice, the opposite seems to work too.

    // Nudge the top vertex upwards to prevent flickering
    vec3 geodeticSurfaceNormal = normalize(cross(normalEC, forwardEc3D));
    geodeticSurfaceNormal *= float(0.0 <= rightNormalAndTextureCoordinateNormalizationY.w && rightNormalAndTextureCoordinateNormalizationY.w <= 1.0);
    geodeticSurfaceNormal *= MAX_TERRAIN_HEIGHT;
    positionEc3D.xyz += geodeticSurfaceNormal;

    // Determine if this vertex is on the "left" or "right"
    normalEC *= sign(endNormalAndTextureCoordinateNormalizationX.w);

    // A "perfect" implementation would push along normals according to the angle against forward.
    // In practice, just pushing the normal out by halfWidth is sufficient for morph views.
    positionEc3D.xyz += halfWidth * max(0.0, czm_metersPerPixel(positionEc3D)) * normalEC; // prevent artifacts when czm_metersPerPixel is negative (behind camera)

    // ****** 2D ******
    // Check distance to the end plane and start plane, pick the plane that is closer
    vec4 positionEc2D = czm_modelViewRelativeToEye * czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy); // w = 1.0, see czm_computePosition
    absStartPlaneDistance = abs(czm_planeDistance(startPlane2D, positionEc2D.xyz));
    absEndPlaneDistance = abs(czm_planeDistance(endPlane2D, positionEc2D.xyz));
    planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, startPlane2D.xyz, endPlane2D.xyz);
    upOrDown = normalize(cross(rightPlane2D.xyz, planeDirection)); // Points "up" for start plane, "down" at end plane.
    normalEC = normalize(cross(planeDirection, upOrDown));         // In practice, the opposite seems to work too.

    // Nudge the top vertex upwards to prevent flickering
    geodeticSurfaceNormal = normalize(cross(normalEC, forwardEc2D));
    geodeticSurfaceNormal *= float(0.0 <= texcoordNormalization2D.y && texcoordNormalization2D.y <= 1.0);
    geodeticSurfaceNormal *= MAX_TERRAIN_HEIGHT;
    positionEc2D.xyz += geodeticSurfaceNormal;

    // Determine if this vertex is on the "left" or "right"
    normalEC *= sign(texcoordNormalization2D.x);
#ifndef PER_INSTANCE_COLOR
    // Use vertex's sidedness to compute its texture coordinate.
    v_texcoordT = clamp(sign(texcoordNormalization2D.x), 0.0, 1.0);
#endif

    // A "perfect" implementation would push along normals according to the angle against forward.
    // In practice, just pushing the normal out by halfWidth is sufficient for morph views.
    positionEc2D.xyz += halfWidth * max(0.0, czm_metersPerPixel(positionEc2D)) * normalEC; // prevent artifacts when czm_metersPerPixel is negative (behind camera)

    // Blend for actual position
    gl_Position = czm_projection * mix(positionEc2D, positionEc3D, czm_morphTime);

#ifdef ANGLE_VARYING
    // Approximate relative screen space direction of the line.
    vec2 approxLineDirection = normalize(vec2(v_forwardDirectionEC.x, -v_forwardDirectionEC.y));
    approxLineDirection.y = czm_branchFreeTernary(approxLineDirection.x == 0.0 && approxLineDirection.y == 0.0, -1.0, approxLineDirection.y);
    v_polylineAngle = czm_fastApproximateAtan(approxLineDirection.x, approxLineDirection.y);
#endif
}
