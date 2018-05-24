attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute float batchId;

varying vec4 v_startPlaneEC;
varying vec4 v_endPlaneEC;
varying vec4 v_rightPlaneEC;
varying vec3 v_forwardDirectionEC;
varying vec3 v_texcoordNormalization;
varying float v_halfWidth;
varying float v_width; // for materials
varying float v_polylineAngle;

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#else
varying vec2 v_alignedPlaneDistances;
#endif

float rayPlaneDistance(vec3 origin, vec3 direction, vec3 planeNormal, float planeDistance) { // TODO: move into its own function?
    // We don't expect the ray to ever be parallel to the plane
    return (-planeDistance - dot(planeNormal, origin)) / dot(planeNormal, direction);
}

vec3 branchFreeTernary(bool comparison, vec3 a, vec3 b) { // TODO: make branchFreeTernary generic for floats and vec3s
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}

void main()
{
#ifdef COLUMBUS_VIEW_2D
    vec4 entry = czm_batchTable_startHighLow2D(batchId);

    vec3 ecStart = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(vec3(0.0, entry.xy), vec3(0.0, entry.zw))).xyz;

    entry = czm_batchTable_offsetAndRight2D(batchId);
    vec3 forwardDirectionEC = czm_normal * vec3(0.0, entry.xy);
    vec3 ecEnd = forwardDirectionEC + ecStart;
    forwardDirectionEC = normalize(forwardDirectionEC);

    v_forwardDirectionEC = forwardDirectionEC;

    // Right plane
    v_rightPlaneEC.xyz = czm_normal * vec3(0.0, entry.zw);
    v_rightPlaneEC.w = -dot(v_rightPlaneEC.xyz, ecStart);

    entry = czm_batchTable_startEndNormals2D(batchId);

    // start plane
    v_startPlaneEC.xyz =  czm_normal * vec3(0.0, entry.xy);
    v_startPlaneEC.w = -dot(v_startPlaneEC.xyz, ecStart);

    // end plane
    v_endPlaneEC.xyz =  czm_normal * vec3(0.0, entry.zw);
    v_endPlaneEC.w = -dot(v_endPlaneEC.xyz, ecEnd);

    v_texcoordNormalization = czm_batchTable_texcoordNormalization2D(batchId);

#else // COLUMBUS_VIEW_2D

    vec4 entry1 = czm_batchTable_startHi_and_forwardOffsetX(batchId);
    vec4 entry2 = czm_batchTable_startLo_and_forwardOffsetY(batchId);

    vec3 ecStart = (czm_modelViewRelativeToEye * czm_translateRelativeToEye(entry1.xyz, entry2.xyz)).xyz;
    vec3 offset = vec3(entry1.w, entry2.w, 0.0);

    entry1 = czm_batchTable_startNormal_and_forwardOffsetZ(batchId);

    offset.z = entry1.w;
    offset = czm_normal * offset;
    vec3 ecEnd = ecStart + offset;

    vec3 forwardDirectionEC = normalize(offset);
    v_forwardDirectionEC = forwardDirectionEC;

    // end plane
    vec3 ecEndNormal = czm_normal * czm_batchTable_endNormal(batchId);
    v_endPlaneEC.xyz = ecEndNormal;
    v_endPlaneEC.w = -dot(ecEndNormal, ecEnd);

    // Right plane
    vec3 ecRight = czm_normal * czm_batchTable_rightNormal(batchId);
    v_rightPlaneEC.xyz = ecRight;
    v_rightPlaneEC.w = -dot(ecRight, ecStart);

    // start plane
    vec3 ecStartNormal = czm_normal * entry1.xyz;
    v_startPlaneEC.xyz = ecStartNormal;
    v_startPlaneEC.w = -dot(ecStartNormal, ecStart);

    v_texcoordNormalization = czm_batchTable_texcoordNormalization(batchId);

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
    vec3 planeDirection = branchFreeTernary(absStartPlaneDistance < absEndPlaneDistance, v_startPlaneEC.xyz, v_endPlaneEC.xyz);
    vec3 upOrDown = normalize(cross(v_rightPlaneEC.xyz, planeDirection)); // Points "up" for start plane, "down" at end plane.
    vec3 normalEC = normalize(cross(planeDirection, upOrDown));           // In practice, the opposite seems to work too.

    // Check distance to the right plane to determine if the miter normal points "left" or "right"
    normalEC *= sign(czm_planeDistance(v_rightPlaneEC, positionEC.xyz));

    // A "perfect" implementation would push along normals according to the angle against forward.
    // In practice, just extending the shadow volume more than needed works for most cases,
    // and for very sharp turns we compute attributes to "break" the miter anyway.
    float width = czm_batchTable_width(batchId);
    v_width = width;
    v_halfWidth = width * 0.5;
    positionEC.xyz -= normalEC; // undo the unit length push
    positionEC.xyz += width * max(0.0, czm_metersPerPixel(positionEC)) * normalEC; // prevent artifacts when czm_metersPerPixel is negative (behind camera)
    gl_Position = czm_projection * positionEC;

    // Approximate relative screen space direction of the line.
    vec2 approxLineDirection = normalize(vec2(forwardDirectionEC.x, -forwardDirectionEC.y));
    approxLineDirection.y = czm_branchFreeTernaryFloat(approxLineDirection.x == 0.0 && approxLineDirection.y == 0.0, -1.0, approxLineDirection.y);
    v_polylineAngle = czm_fastApproximateAtan(approxLineDirection.x, approxLineDirection.y);
}
