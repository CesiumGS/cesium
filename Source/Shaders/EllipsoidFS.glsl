uniform vec3 u_radii;

varying vec3 v_positionEC;
varying vec3 v_centerEC;

void main()
{   
    czm_ellipsoid ellipsoid = czm_ellipsoidNew(v_centerEC, u_radii);
    vec3 direction = normalize(v_positionEC);
    czm_ray ray = czm_ray(vec3(0.0), direction);
    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);
    
    if (!czm_isEmpty(intersection))
    {        
        // TODO: Use material system.        
        gl_FragColor = vec4(0.0, 1.0, 0.0, 0.75);
    }
    else
    {
        discard;
    }
}
