//This file is automatically rebuilt by the Cesium build process.
export default "float interpolateByDistance(vec4 nearFarScalar, float distance)\n\
{\n\
    float startDistance = nearFarScalar.x;\n\
    float startValue = nearFarScalar.y;\n\
    float endDistance = nearFarScalar.z;\n\
    float endValue = nearFarScalar.w;\n\
    float t = clamp((distance - startDistance) / (endDistance - startDistance), 0.0, 1.0);\n\
    return mix(startValue, endValue, t);\n\
}\n\
\n\
vec3 getLightDirection(vec3 positionWC)\n\
{\n\
    float lightEnum = u_radiiAndDynamicAtmosphereColor.z;\n\
    vec3 lightDirection =\n\
        positionWC * float(lightEnum == 0.0) +\n\
        czm_lightDirectionWC * float(lightEnum == 1.0) +\n\
        czm_sunDirectionWC * float(lightEnum == 2.0);\n\
    return normalize(lightDirection);\n\
}\n\
\n\
void computeAtmosphereScattering(vec3 positionWC, vec3 lightDirection, out vec3 rayleighColor, out vec3 mieColor, out float opacity, out float underTranslucentGlobe)\n\
{\n\
    float ellipsoidRadiiDifference = czm_ellipsoidRadii.x - czm_ellipsoidRadii.z;\n\
\n\
    // Adjustment to the atmosphere radius applied based on the camera height.\n\
    float distanceAdjustMin = czm_ellipsoidRadii.x / 4.0;\n\
    float distanceAdjustMax = czm_ellipsoidRadii.x;\n\
    float distanceAdjustModifier = ellipsoidRadiiDifference / 2.0;\n\
    float distanceAdjust = distanceAdjustModifier * clamp((czm_eyeHeight - distanceAdjustMin) / (distanceAdjustMax - distanceAdjustMin), 0.0, 1.0);\n\
\n\
    // Since atmosphere scattering assumes the atmosphere is a spherical shell, we compute an inner radius of the atmosphere best fit \n\
    // for the position on the ellipsoid.\n\
    float radiusAdjust = (ellipsoidRadiiDifference / 4.0) + distanceAdjust;\n\
    float atmosphereInnerRadius = (length(czm_viewerPositionWC) - czm_eyeHeight) - radiusAdjust;\n\
\n\
    // Setup the primary ray: from the camera position to the vertex position.\n\
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;\n\
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);\n\
    czm_ray primaryRay = czm_ray(czm_viewerPositionWC, cameraToPositionWCDirection);\n\
\n\
    underTranslucentGlobe = 0.0;\n\
\n\
    // Brighten the sky atmosphere under the Earth's atmosphere when translucency is enabled.\n\
    #if defined(GLOBE_TRANSLUCENT)\n\
\n\
        // Check for intersection with the inner radius of the atmopshere.\n\
        czm_raySegment primaryRayEarthIntersect = czm_raySphereIntersectionInterval(primaryRay, vec3(0.0), atmosphereInnerRadius + radiusAdjust);\n\
        if (primaryRayEarthIntersect.start > 0.0 && primaryRayEarthIntersect.stop > 0.0) {\n\
            \n\
            // Compute position on globe.\n\
            vec3 direction = normalize(positionWC);\n\
            czm_ray ellipsoidRay = czm_ray(positionWC, -direction);\n\
            czm_raySegment ellipsoidIntersection = czm_rayEllipsoidIntersectionInterval(ellipsoidRay, vec3(0.0), czm_ellipsoidInverseRadii);\n\
            vec3 onEarth = positionWC - (direction * ellipsoidIntersection.start);\n\
\n\
            // Control the color using the camera angle.\n\
            float angle = dot(normalize(czm_viewerPositionWC), normalize(onEarth));\n\
\n\
            // Control the opacity using the distance from Earth.\n\
            opacity = interpolateByDistance(vec4(0.0, 1.0, czm_ellipsoidRadii.x, 0.0), length(czm_viewerPositionWC - onEarth));\n\
            vec3 horizonColor = vec3(0.1, 0.2, 0.3);\n\
            vec3 nearColor = vec3(0.0);\n\
\n\
            rayleighColor = mix(nearColor, horizonColor, exp(-angle) * opacity);\n\
            \n\
            // Set the traslucent flag to avoid alpha adjustment in computeFinalColor funciton.\n\
            underTranslucentGlobe = 1.0;\n\
            return;\n\
        }\n\
    #endif\n\
\n\
    computeScattering(\n\
        primaryRay,\n\
        length(cameraToPositionWC),\n\
        lightDirection,\n\
        atmosphereInnerRadius,\n\
        rayleighColor,\n\
        mieColor,\n\
        opacity\n\
    );\n\
\n\
    // Alter the opacity based on how close the viewer is to the ground.\n\
    // (0.0 = At edge of atmosphere, 1.0 = On ground)\n\
    float cameraHeight = czm_eyeHeight + atmosphereInnerRadius;\n\
    float atmosphereOuterRadius = atmosphereInnerRadius + ATMOSPHERE_THICKNESS;\n\
    opacity = clamp((atmosphereOuterRadius - cameraHeight) / (atmosphereOuterRadius - atmosphereInnerRadius), 0.0, 1.0);\n\
\n\
    // Alter alpha based on time of day (0.0 = night , 1.0 = day)\n\
    float nightAlpha = (u_radiiAndDynamicAtmosphereColor.z != 0.0) ? clamp(dot(normalize(positionWC), lightDirection), 0.0, 1.0) : 1.0;\n\
    opacity *= pow(nightAlpha, 0.5);\n\
}\n\
";
