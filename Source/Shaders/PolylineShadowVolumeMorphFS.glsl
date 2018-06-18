varying vec3 v_forwardDirectionEC;
varying vec3 v_texcoordNormalizationAndHalfWidth;
varying float v_batchId;

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#else
varying vec2 v_alignedPlaneDistances;
varying float v_texcoordT;
#endif

float rayPlaneDistanceUnsafe(vec3 origin, vec3 direction, vec3 planeNormal, float planeDistance) {
    // We don't expect the ray to ever be parallel to the plane
    return (-planeDistance - dot(planeNormal, origin)) / dot(planeNormal, direction);
}

void main(void)
{
    vec4 eyeCoordinate = gl_FragCoord;
    eyeCoordinate /= eyeCoordinate.w;

#ifdef PER_INSTANCE_COLOR
    gl_FragColor = v_color;
#else // PER_INSTANCE_COLOR
    // Use distances for planes aligned with segment to prevent skew in dashing
    float distanceFromStart = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, -v_forwardDirectionEC, v_forwardDirectionEC.xyz, v_alignedPlaneDistances.x);
    float distanceFromEnd = rayPlaneDistanceUnsafe(eyeCoordinate.xyz, v_forwardDirectionEC, -v_forwardDirectionEC.xyz, v_alignedPlaneDistances.y);

    // Clamp - distance to aligned planes may be negative due to mitering
    distanceFromStart = max(0.0, distanceFromStart);
    distanceFromEnd = max(0.0, distanceFromEnd);

    float s = distanceFromStart / (distanceFromStart + distanceFromEnd);
    s = (s * v_texcoordNormalizationAndHalfWidth.x) + v_texcoordNormalizationAndHalfWidth.y;

    czm_materialInput materialInput;

    materialInput.s = s;
    materialInput.st = vec2(s, v_texcoordT);
    materialInput.str = vec3(s, v_texcoordT, 0.0);

    czm_material material = czm_getMaterial(materialInput);
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#endif // PER_INSTANCE_COLOR
}
