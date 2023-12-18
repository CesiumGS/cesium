/**
 * Compute the WC position on the elipsoid of the current fragment. The result
 * is low-precision due to use of 32-bit floats.
 *
 * @return {vec3} The position in world coordinates.
 */
vec3 czm_computeEllipsoidPosition()
{
    float mpp = czm_metersPerPixel(vec4(0.0, 0.0, -czm_currentFrustum.x, 1.0), 1.0);
    vec2 xy = gl_FragCoord.xy / czm_viewport.zw * 2.0 - vec2(1.0);
    xy *= czm_viewport.zw * mpp * 0.5;

    vec3 direction = normalize(vec3(xy, -czm_currentFrustum.x));
    czm_ray ray = czm_ray(vec3(0.0), direction);

    vec3 ellipsoid_center = czm_view[3].xyz;

    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid_center, czm_ellipsoidInverseRadii);

    vec3 ellipsoidPosition = czm_pointAlongRay(ray, intersection.start);
    return (czm_inverseView * vec4(ellipsoidPosition, 1.0)).xyz;
}
