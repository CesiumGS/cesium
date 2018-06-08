#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

varying vec4 v_startPlaneNormalEC_and_halfWidth;
varying vec4 v_endPlaneNormalEC_and_batchId;
varying vec4 v_rightPlaneEC; // Technically can compute distance for this here
varying vec4 v_ecEnd_and_ecStart_X;
varying vec4 v_texcoordNormalization_and_ecStart_YZ;

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#endif

void main(void)
{
    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, gl_FragCoord.xy / czm_viewport.zw));
    vec3 ecStart = vec3(v_ecEnd_and_ecStart_X.w, v_texcoordNormalization_and_ecStart_YZ.zw);

    // Discard for sky
    bool shouldDiscard = logDepthOrDepth == 0.0;

    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);
    eyeCoordinate /= eyeCoordinate.w;

    float halfMaxWidth = v_startPlaneNormalEC_and_halfWidth.w * czm_metersPerPixel(eyeCoordinate);
    // Check distance of the eye coordinate against the right-facing plane
    float widthwiseDistance = czm_planeDistance(v_rightPlaneEC, eyeCoordinate.xyz);

    // Check eye coordinate against the mitering planes
    float distanceFromStart = czm_planeDistance(v_startPlaneNormalEC_and_halfWidth.xyz, -dot(ecStart, v_startPlaneNormalEC_and_halfWidth.xyz), eyeCoordinate.xyz);
    float distanceFromEnd = czm_planeDistance(v_endPlaneNormalEC_and_batchId.xyz, -dot(v_ecEnd_and_ecStart_X.xyz, v_endPlaneNormalEC_and_batchId.xyz), eyeCoordinate.xyz);

    shouldDiscard = shouldDiscard || (abs(widthwiseDistance) > halfMaxWidth || distanceFromStart < 0.0 || distanceFromEnd < 0.0);

    // Check distance of the eye coordinate against start and end planes with normals in the right plane.
    // For computing unskewed linear texture coordinate and for clipping extremely pointy miters

    // aligned plane: cross the right plane normal with miter plane normal, then cross the result with right again to point it more "forward"
    vec3 alignedPlaneNormal;

    // start aligned plane
    alignedPlaneNormal = cross(v_rightPlaneEC.xyz, v_startPlaneNormalEC_and_halfWidth.xyz);
    alignedPlaneNormal = normalize(cross(alignedPlaneNormal, v_rightPlaneEC.xyz));
    distanceFromStart = czm_planeDistance(alignedPlaneNormal, -dot(alignedPlaneNormal, ecStart), eyeCoordinate.xyz);

    // end aligned plane
    alignedPlaneNormal = cross(v_rightPlaneEC.xyz, v_endPlaneNormalEC_and_batchId.xyz);
    alignedPlaneNormal = normalize(cross(alignedPlaneNormal, v_rightPlaneEC.xyz));
    distanceFromEnd = czm_planeDistance(alignedPlaneNormal, -dot(alignedPlaneNormal, v_ecEnd_and_ecStart_X.xyz), eyeCoordinate.xyz);

    shouldDiscard = shouldDiscard || distanceFromStart < -halfMaxWidth || distanceFromEnd < -halfMaxWidth;

    if (shouldDiscard) {
#ifdef DEBUG_SHOW_VOLUME
        gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5);
        return;
#else // DEBUG_SHOW_VOLUME
        discard;
#endif // DEBUG_SHOW_VOLUME
    }

#ifdef PER_INSTANCE_COLOR
    gl_FragColor = v_color;
#else // PER_INSTANCE_COLOR
    // Clamp - distance to aligned planes may be negative due to mitering,
    // so fragment texture coordinate might be out-of-bounds.
    float s = clamp(distanceFromStart / (distanceFromStart + distanceFromEnd), 0.0, 1.0);
    s = (s * v_texcoordNormalization_and_ecStart_YZ.x) + v_texcoordNormalization_and_ecStart_YZ.y;
    float t = (widthwiseDistance + halfMaxWidth) / (2.0 * halfMaxWidth);

    czm_materialInput materialInput;

    materialInput.s = s;
    materialInput.st = vec2(s, t);
    materialInput.str = vec3(s, t, 0.0);

    czm_material material = czm_getMaterial(materialInput);
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#endif // PER_INSTANCE_COLOR
}
