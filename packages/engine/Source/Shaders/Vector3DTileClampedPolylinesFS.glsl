in vec4 v_startPlaneEC;
in vec4 v_endPlaneEC;
in vec4 v_rightPlaneEC;
in float v_halfWidth;
in vec3 v_volumeUpEC;

uniform vec4 u_highlightColor;
void main()
{
    float logDepthOrDepth = czm_branchFreeTernary(czm_sceneMode == czm_sceneMode2D, gl_FragCoord.z, czm_unpackDepth(texture(czm_globeDepthTexture, gl_FragCoord.xy / czm_viewport.zw)));

    // Discard for sky
    if (logDepthOrDepth == 0.0) {
#ifdef DEBUG_SHOW_VOLUME
        out_FragColor = vec4(0.0, 0.0, 1.0, 0.5);
        return;
#else // DEBUG_SHOW_VOLUME
        discard;
#endif // DEBUG_SHOW_VOLUME
    }

    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);
    eyeCoordinate /= eyeCoordinate.w;

    float halfMaxWidth = v_halfWidth * czm_metersPerPixel(eyeCoordinate);

    // Expand halfMaxWidth if direction to camera is almost perpendicular with the volume's up direction
    halfMaxWidth += halfMaxWidth * (1.0 - dot(-normalize(eyeCoordinate.xyz), v_volumeUpEC));

    // Check distance of the eye coordinate against the right-facing plane
    float widthwiseDistance = czm_planeDistance(v_rightPlaneEC, eyeCoordinate.xyz);

    // Check eye coordinate against the mitering planes
    float distanceFromStart = czm_planeDistance(v_startPlaneEC, eyeCoordinate.xyz);
    float distanceFromEnd = czm_planeDistance(v_endPlaneEC, eyeCoordinate.xyz);

    if (abs(widthwiseDistance) > halfMaxWidth || distanceFromStart < 0.0 || distanceFromEnd < 0.0) {
#ifdef DEBUG_SHOW_VOLUME
        out_FragColor = vec4(logDepthOrDepth, 0.0, 0.0, 0.5);
        return;
#else // DEBUG_SHOW_VOLUME
        discard;
#endif // DEBUG_SHOW_VOLUME
    }
    out_FragColor = u_highlightColor;

    czm_writeDepthClamp();
}
