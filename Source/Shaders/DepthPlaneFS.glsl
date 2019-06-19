varying vec4 positionEC;

void main()
{
    vec3 direction = normalize(positionEC.xyz);
    czm_ray ray = czm_ray(vec3(0.0), direction);

    vec3 ellipsoid_center = czm_view[3].xyz;
    vec3 ellipsoid_radii = vec3(6378137.0, 6378137.0, 6356752.314245);
    vec3 ellipsoid_inverseRadii = vec3(1.0 / ellipsoid_radii.x, 1.0 / ellipsoid_radii.y, 1.0 / ellipsoid_radii.z);

    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid_center, ellipsoid_inverseRadii);
    if (!czm_isEmpty(intersection))
    {
        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    }
    else
    {
        discard;
    }

    czm_writeLogDepth();
}
