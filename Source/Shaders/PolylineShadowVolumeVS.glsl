attribute vec3 position3DHigh;
attribute vec3 position3DLow;

#ifndef COLUMBUS_VIEW_2D
attribute vec4 startHi_and_forwardOffsetX;
attribute vec4 startLo_and_forwardOffsetY;
attribute vec4 startNormal_and_forwardOffsetZ;
attribute vec4 endNormal_andTextureCoordinateNormalizationX;
attribute vec4 rightNormal_andTextureCoordinateNormalizationY;
#else
attribute vec4 startHiLo2D;
attribute vec4 offsetAndRight2D;
attribute vec4 startEndNormals2D;
attribute vec2 texcoordNormalization2D;
#endif

attribute float batchId;

varying vec4 v_startPlaneEC;
varying vec4 v_endPlaneEC;
varying vec4 v_rightPlaneEC;
varying vec3 v_forwardDirectionEC;
varying vec3 v_texcoordNormalization_and_halfWidth;

// For materials
varying float v_width;
varying float v_polylineAngle;

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#else
varying vec2 v_alignedPlaneDistances;
#endif

void main()
{
#ifdef COLUMBUS_VIEW_2D
    vec3 ecStart = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(vec3(0.0, startHiLo2D.xy), vec3(0.0, startHiLo2D.zw))).xyz;

    vec3 forwardDirectionEC = czm_normal * vec3(0.0, offsetAndRight2D.xy);
    vec3 ecEnd = forwardDirectionEC + ecStart;
    forwardDirectionEC = normalize(forwardDirectionEC);

    v_forwardDirectionEC = forwardDirectionEC;

    // Right plane
    v_rightPlaneEC.xyz = czm_normal * vec3(0.0, offsetAndRight2D.zw);
    v_rightPlaneEC.w = -dot(v_rightPlaneEC.xyz, ecStart);

    // start plane
    v_startPlaneEC.xyz =  czm_normal * vec3(0.0, startEndNormals2D.xy);
    v_startPlaneEC.w = -dot(v_startPlaneEC.xyz, ecStart);

    // end plane
    v_endPlaneEC.xyz =  czm_normal * vec3(0.0, startEndNormals2D.zw);
    v_endPlaneEC.w = -dot(v_endPlaneEC.xyz, ecEnd);

    v_texcoordNormalization_and_halfWidth.xy = texcoordNormalization2D;

#else // COLUMBUS_VIEW_2D
    vec3 ecStart = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(startHi_and_forwardOffsetX.xyz, startLo_and_forwardOffsetY.xyz)).xyz;
    vec3 offset = czm_normal * vec3(startHi_and_forwardOffsetX.w, startLo_and_forwardOffsetY.w, startNormal_and_forwardOffsetZ.w);
    vec3 ecEnd = ecStart + offset;

    vec3 forwardDirectionEC = normalize(offset);
    v_forwardDirectionEC = forwardDirectionEC;

    // start plane
    v_startPlaneEC.xyz = czm_normal * startNormal_and_forwardOffsetZ.xyz;
    v_startPlaneEC.w = -dot(v_startPlaneEC.xyz, ecStart);

    // end plane
    v_endPlaneEC.xyz = czm_normal * endNormal_andTextureCoordinateNormalizationX.xyz;
    v_endPlaneEC.w = -dot(v_endPlaneEC.xyz, ecEnd);

    // Right plane
    v_rightPlaneEC.xyz = czm_normal * rightNormal_andTextureCoordinateNormalizationY.xyz;
    v_rightPlaneEC.w = -dot(v_rightPlaneEC.xyz, ecStart);

    v_texcoordNormalization_and_halfWidth.xy = vec2(endNormal_andTextureCoordinateNormalizationX.w, rightNormal_andTextureCoordinateNormalizationY.w);

#endif // COLUMBUS_VIEW_2D

#ifdef PER_INSTANCE_COLOR
    v_color = czm_batchTable_color(batchId);
#else // PER_INSTANCE_COLOR
    // For computing texture coordinates
    v_alignedPlaneDistances.x = -dot(forwardDirectionEC, ecStart);
    v_alignedPlaneDistances.y = -dot(-forwardDirectionEC, ecEnd);
#endif // PER_INSTANCE_COLOR

    // Compute a normal along which to "push" the position out, extending the miter depending on view distance.
    // Position has already been "pushed" by unit length along miter normal, and miter normals are encoded in the planes.
    // Decode the normal to use at this specific vertex, push the position back, and then push to where it needs to be.
    vec4 positionRelativeToEye = czm_computePosition();

    // Check distance to the end plane and start plane, pick the plane that is closer
    vec4 positionEC = czm_modelViewRelativeToEye * positionRelativeToEye; // w = 1.0, see czm_computePosition
    float absStartPlaneDistance = abs(czm_planeDistance(v_startPlaneEC, positionEC.xyz));
    float absEndPlaneDistance = abs(czm_planeDistance(v_endPlaneEC, positionEC.xyz));
    vec3 planeDirection = czm_branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, v_startPlaneEC.xyz, v_endPlaneEC.xyz);
    vec3 upOrDown = normalize(cross(v_rightPlaneEC.xyz, planeDirection)); // Points "up" for start plane, "down" at end plane.
    vec3 normalEC = normalize(cross(planeDirection, upOrDown));           // In practice, the opposite seems to work too.

    // Check distance to the right plane to determine if the miter normal points "left" or "right"
    normalEC *= sign(czm_planeDistance(v_rightPlaneEC, positionEC.xyz));

    // A "perfect" implementation would push along normals according to the angle against forward.
    // In practice, just extending the shadow volume more than needed works for most cases,
    // and for very sharp turns we compute attributes to "break" the miter anyway.
    float width = czm_batchTable_width(batchId);
    v_width = width;
    v_texcoordNormalization_and_halfWidth.z = width * 0.5;
    positionEC.xyz -= normalEC; // undo the unit length push
    positionEC.xyz += width * max(0.0, czm_metersPerPixel(positionEC)) * normalEC; // prevent artifacts when czm_metersPerPixel is negative (behind camera)
    gl_Position = czm_projection * positionEC;

    // Approximate relative screen space direction of the line.
    vec2 approxLineDirection = normalize(vec2(forwardDirectionEC.x, -forwardDirectionEC.y));
    approxLineDirection.y = czm_branchFreeTernary(approxLineDirection.x == 0.0 && approxLineDirection.y == 0.0, -1.0, approxLineDirection.y);
    v_polylineAngle = czm_fastApproximateAtan(approxLineDirection.x, approxLineDirection.y);
}
