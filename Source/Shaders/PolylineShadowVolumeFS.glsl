#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

varying vec4 v_startPlaneNormalEcAndHalfWidth;
varying vec4 v_endPlaneNormalEcAndBatchId;
varying vec4 v_rightPlaneEC; // Technically can compute distance for this here
varying vec4 v_endEcAndStartEcX;
varying vec4 v_texcoordNormalizationAndStartEcYZ;

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#endif

void main(void)
{
    float logDepthOrDepth = czm_branchFreeTernary(czm_sceneMode == czm_sceneMode2D, gl_FragCoord.z, czm_unpackDepth(texture2D(czm_globeDepthTexture, gl_FragCoord.xy / czm_viewport.zw)));
    vec3 ecStart = vec3(v_endEcAndStartEcX.w, v_texcoordNormalizationAndStartEcYZ.zw);

    // Discard for sky
    if (logDepthOrDepth == 0.0) {
#ifdef DEBUG_SHOW_VOLUME
        gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5);
        return;
#else // DEBUG_SHOW_VOLUME
        discard;
#endif // DEBUG_SHOW_VOLUME
    }

    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);
    eyeCoordinate /= eyeCoordinate.w;

    float halfMaxWidth = v_startPlaneNormalEcAndHalfWidth.w * czm_metersPerPixel(eyeCoordinate);
    // Check distance of the eye coordinate against the right-facing plane
    float widthwiseDistance = czm_planeDistance(v_rightPlaneEC, eyeCoordinate.xyz);

    // Check eye coordinate against the mitering planes
    float distanceFromStart = czm_planeDistance(v_startPlaneNormalEcAndHalfWidth.xyz, -dot(ecStart, v_startPlaneNormalEcAndHalfWidth.xyz), eyeCoordinate.xyz);
    float distanceFromEnd = czm_planeDistance(v_endPlaneNormalEcAndBatchId.xyz, -dot(v_endEcAndStartEcX.xyz, v_endPlaneNormalEcAndBatchId.xyz), eyeCoordinate.xyz);

    if (abs(widthwiseDistance) > halfMaxWidth || distanceFromStart < 0.0 || distanceFromEnd < 0.0) {
#ifdef DEBUG_SHOW_VOLUME
        gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5);
        return;
#else // DEBUG_SHOW_VOLUME
        discard;
#endif // DEBUG_SHOW_VOLUME
    }

    // Check distance of the eye coordinate against start and end planes with normals in the right plane.
    // For computing unskewed lengthwise texture coordinate.
    // Can also be used for clipping extremely pointy miters, but in practice unnecessary because of miter breaking.

    // aligned plane: cross the right plane normal with miter plane normal, then cross the result with right again to point it more "forward"
    vec3 alignedPlaneNormal;

    // start aligned plane
    alignedPlaneNormal = cross(v_rightPlaneEC.xyz, v_startPlaneNormalEcAndHalfWidth.xyz);
    alignedPlaneNormal = normalize(cross(alignedPlaneNormal, v_rightPlaneEC.xyz));
    distanceFromStart = czm_planeDistance(alignedPlaneNormal, -dot(alignedPlaneNormal, ecStart), eyeCoordinate.xyz);

    // end aligned plane
    alignedPlaneNormal = cross(v_rightPlaneEC.xyz, v_endPlaneNormalEcAndBatchId.xyz);
    alignedPlaneNormal = normalize(cross(alignedPlaneNormal, v_rightPlaneEC.xyz));
    distanceFromEnd = czm_planeDistance(alignedPlaneNormal, -dot(alignedPlaneNormal, v_endEcAndStartEcX.xyz), eyeCoordinate.xyz);

#ifdef PER_INSTANCE_COLOR
    gl_FragColor = czm_gammaCorrect(v_color);
#else // PER_INSTANCE_COLOR
    // Clamp - distance to aligned planes may be negative due to mitering,
    // so fragment texture coordinate might be out-of-bounds.
    float s = clamp(distanceFromStart / (distanceFromStart + distanceFromEnd), 0.0, 1.0);
    s = (s * v_texcoordNormalizationAndStartEcYZ.x) + v_texcoordNormalizationAndStartEcYZ.y;
    float t = (widthwiseDistance + halfMaxWidth) / (2.0 * halfMaxWidth);

    czm_materialInput materialInput;

    materialInput.s = s;
    materialInput.st = vec2(s, t);
    materialInput.str = vec3(s, t, 0.0);

    czm_material material = czm_getMaterial(materialInput);
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#endif // PER_INSTANCE_COLOR

    // Premultiply alpha. Required for classification primitives on translucent globe.
    gl_FragColor.rgb *= gl_FragColor.a;

    czm_writeDepthClamp();
}
