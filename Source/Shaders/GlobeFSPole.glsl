uniform vec3 u_color;

varying vec2 v_textureCoordinates;

void main()
{
    // TODO: make arbitrary ellipsoid
    czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();
    vec3 direction = normalize(czm_windowToEyeCoordinates(gl_FragCoord).xyz);
    czm_ray ray = czm_ray(vec3(0.0), direction);
    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);
    
    if (!czm_isEmpty(intersection))
    {
        vec3 positionEC = czm_pointAlongRay(ray, intersection.start);
        vec3 positionMC = (czm_inverseModelView * vec4(positionEC, 1.0)).xyz;
        
        vec3 normalMC = normalize(czm_geodeticSurfaceNormal(positionMC, vec3(0.0), vec3(1.0)));
        vec3 normalEC = normalize(czm_normal * normalMC);
        
        vec3 startDayColor = u_color;
        
        gl_FragColor = vec4(startDayColor, 1.0);
    }
    else
    {
        discard;
    }
}