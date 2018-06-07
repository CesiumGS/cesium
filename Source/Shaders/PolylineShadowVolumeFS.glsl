#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

varying vec4 v_startPlaneEC_lengthHalfWidth;
varying vec4 v_endPlaneEC;
varying vec4 v_rightPlaneEC;
varying vec4 v_ecEnd_and_ecStart_X;
varying vec4 v_texcoordNormalization_and_ecStart_YZ;

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#endif

float rayPlaneDistanceUnsafe(vec3 origin, vec3 direction, vec3 planeNormal, float planeDistance) {
    // We don't expect the ray to ever be parallel to the plane
    return (-planeDistance - dot(planeNormal, origin)) / dot(planeNormal, direction);
}

void main(void)
{
    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, gl_FragCoord.xy / czm_viewport.zw));
    vec3 ecStart = vec3(v_ecEnd_and_ecStart_X.w, v_texcoordNormalization_and_ecStart_YZ.zw);
    vec3 forwardDirection = normalize(v_ecEnd_and_ecStart_X.xyz - ecStart);

    // Discard for sky
    bool shouldDiscard = logDepthOrDepth == 0.0;

    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);
    eyeCoordinate /= eyeCoordinate.w;

    float halfWidth = length(v_startPlaneEC_lengthHalfWidth.xyz);
    float halfMaxWidth = halfWidth * czm_metersPerPixel(eyeCoordinate);
    // Check distance of the eye coordinate against the right-facing plane
    float widthwiseDistance = czm_planeDistance(v_rightPlaneEC, eyeCoordinate.xyz);

    // Check distance of the eye coordinate against the mitering planes
    vec3 startPlaneNormal = v_startPlaneEC_lengthHalfWidth.xyz / halfWidth;
    float distanceFromStart = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, -forwardDirection, startPlaneNormal, v_startPlaneEC_lengthHalfWidth.w);
    float distanceFromEnd = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, forwardDirection, v_endPlaneEC.xyz, v_endPlaneEC.w);

    shouldDiscard = shouldDiscard || (abs(widthwiseDistance) > halfMaxWidth || distanceFromStart < 0.0 || distanceFromEnd < 0.0);

    // Check distance of the eye coordinate against start and end planes with normals in the right plane.
    // For computing unskewed linear texture coordinate and for clipping extremely pointy miters

    // aligned plane: cross the right plane normal with miter plane normal, then cross the result with right again to point it more "forward"
    vec4 alignedPlane;

    // start aligned plane
    alignedPlane.xyz = cross(v_rightPlaneEC.xyz, startPlaneNormal);
    alignedPlane.xyz = cross(alignedPlane.xyz, v_rightPlaneEC.xyz);
    alignedPlane.w = -dot(alignedPlane.xyz, ecStart);
    distanceFromStart = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, -forwardDirection, alignedPlane.xyz, alignedPlane.w);

    // end aligned plane
    alignedPlane.xyz = cross(v_rightPlaneEC.xyz, v_endPlaneEC.xyz);
    alignedPlane.xyz = cross(alignedPlane.xyz, v_rightPlaneEC.xyz);
    alignedPlane.w = -dot(alignedPlane.xyz, v_ecEnd_and_ecStart_X.xyz);
    distanceFromEnd = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, forwardDirection, alignedPlane.xyz, alignedPlane.w);

    shouldDiscard = shouldDiscard || distanceFromStart < -halfMaxWidth || distanceFromEnd < -halfMaxWidth;

    if (shouldDiscard) {
#ifdef DEBUG_SHOW_VOLUME
        gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5);
        return;
#else // DEBUG_SHOW_VOLUME
        discard;
#endif // DEBUG_SHOW_VOLUME
    }

#ifdef PICK
    gl_FragColor.a = 1.0;
#else // PICK
#ifdef PER_INSTANCE_COLOR
    gl_FragColor = v_color;
#else // PER_INSTANCE_COLOR
    // Clamp - distance to aligned planes may be negative due to mitering
    distanceFromStart = max(0.0, distanceFromStart);
    distanceFromEnd = max(0.0, distanceFromEnd);

    float s = distanceFromStart / (distanceFromStart + distanceFromEnd);
    s = (s * v_texcoordNormalization_and_ecStart_YZ.y) + v_texcoordNormalization_and_ecStart_YZ.x;
    float t = (widthwiseDistance + halfMaxWidth) / (2.0 * halfMaxWidth);

    czm_materialInput materialInput;

    materialInput.s = s;
    materialInput.st = vec2(s, t);
    materialInput.str = vec3(s, t, 0.0);

    czm_material material = czm_getMaterial(materialInput);
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#endif // PER_INSTANCE_COLOR

#endif // PICK
}
