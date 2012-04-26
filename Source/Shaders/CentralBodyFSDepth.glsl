varying vec4 positionEC;

void main()
{
    // TODO: make arbitrary ellipsoid
    agi_ellipsoid ellipsoid = agi_getWgs84EllipsoidEC();
    
    vec3 direction = normalize(positionEC.xyz);
    agi_ray ray = agi_ray(vec3(0.0, 0.0, 0.0), direction);
    
    agi_raySegment intersection = agi_rayEllipsoidIntersectionInterval(ray, ellipsoid);
    if (!agi_isEmpty(intersection))
    {
        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    }
    else
    {
        discard;
    }
}