varying vec4 positionEC;

void main()
{
    // TODO: make arbitrary ellipsoid
    czm_getWgs84EllipsoidEC();

    vec3 direction = normalize(positionEC.xyz);
    czm_ray ray = czm_ray(vec3(0.0), direction);

    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, czm_ellipsoid_center, czm_ellipsoid_inverseRadii);
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
