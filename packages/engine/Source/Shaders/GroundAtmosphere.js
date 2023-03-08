//This file is automatically rebuilt by the Cesium build process.
export default "void computeAtmosphereScattering(vec3 positionWC, vec3 lightDirection, out vec3 rayleighColor, out vec3 mieColor, out float opacity) {\n\
\n\
    vec3 cameraToPositionWC = positionWC - czm_viewerPositionWC;\n\
    vec3 cameraToPositionWCDirection = normalize(cameraToPositionWC);\n\
    czm_ray primaryRay = czm_ray(czm_viewerPositionWC, cameraToPositionWCDirection);\n\
    \n\
    float atmosphereInnerRadius = length(positionWC);\n\
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
}\n\
";
