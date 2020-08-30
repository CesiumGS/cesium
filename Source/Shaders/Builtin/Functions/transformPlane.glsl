vec4 czm_transformPlane(vec4 clippingPlane, mat4 transform, mat3 normalTransform) {
    vec3 transformedDirection = normalize(normalTransform * clippingPlane.xyz);
    vec3 transformedPosition = (transform * vec4(clippingPlane.xyz * -clippingPlane.w, 1.0)).xyz;
    vec4 transformedPlane;
    transformedPlane.xyz = transformedDirection;
    transformedPlane.w = -dot(transformedDirection, transformedPosition);
    return transformedPlane;
}
