//This file is automatically rebuilt by the Cesium build process.
export default "varying vec3 v_forwardDirectionEC;\n\
varying vec3 v_texcoordNormalizationAndHalfWidth;\n\
varying float v_batchId;\n\
\n\
#ifdef PER_INSTANCE_COLOR\n\
varying vec4 v_color;\n\
#else\n\
varying vec2 v_alignedPlaneDistances;\n\
varying float v_texcoordT;\n\
#endif\n\
\n\
float rayPlaneDistanceUnsafe(vec3 origin, vec3 direction, vec3 planeNormal, float planeDistance) {\n\
    // We don't expect the ray to ever be parallel to the plane\n\
    return (-planeDistance - dot(planeNormal, origin)) / dot(planeNormal, direction);\n\
}\n\
\n\
void main(void)\n\
{\n\
    vec4 eyeCoordinate = gl_FragCoord;\n\
    eyeCoordinate /= eyeCoordinate.w;\n\
\n\
#ifdef PER_INSTANCE_COLOR\n\
    gl_FragColor = czm_gammaCorrect(v_color);\n\
#else // PER_INSTANCE_COLOR\n\
    // Use distances for planes aligned with segment to prevent skew in dashing\n\
    float distanceFromStart = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, -v_forwardDirectionEC, v_forwardDirectionEC.xyz, v_alignedPlaneDistances.x);\n\
    float distanceFromEnd = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, v_forwardDirectionEC, -v_forwardDirectionEC.xyz, v_alignedPlaneDistances.y);\n\
\n\
    // Clamp - distance to aligned planes may be negative due to mitering\n\
    distanceFromStart = max(0.0, distanceFromStart);\n\
    distanceFromEnd = max(0.0, distanceFromEnd);\n\
\n\
    float s = distanceFromStart / (distanceFromStart + distanceFromEnd);\n\
    s = (s * v_texcoordNormalizationAndHalfWidth.x) + v_texcoordNormalizationAndHalfWidth.y;\n\
\n\
    czm_materialInput materialInput;\n\
\n\
    materialInput.s = s;\n\
    materialInput.st = vec2(s, v_texcoordT);\n\
    materialInput.str = vec3(s, v_texcoordT, 0.0);\n\
\n\
    czm_material material = czm_getMaterial(materialInput);\n\
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n\
#endif // PER_INSTANCE_COLOR\n\
}\n\
";
