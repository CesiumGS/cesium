varying vec4 positionEC;

void main()
{
    vec3 position;
    vec3 direction;
    if (czm_orthographicIn3D == 1.0)
    {
        position = czm_windowToEyeCoordinates(vec4(gl_FragCoord.xy, 0.0, 1.0)).xyz;
        direction = vec3(0.0, 0.0, -1.0);
    } 
    else 
    {
        position = vec3(0.0);
        direction = normalize(positionEC.xyz);
    }

    czm_ray ray = czm_ray(position, direction);

    vec3 ellipsoid_center = czm_view[3].xyz;

    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid_center, czm_ellipsoidInverseRadii);
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
