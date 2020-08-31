vec4 czm_transformPlane(vec4 clippingPlane, mat4 transform) {
    vec4 transformPlane = transform * clippingPlane;
    vec3 normalMagnitude = length(transformPlane.xyz);
    return transformPlane / normalMagnitude;
}
