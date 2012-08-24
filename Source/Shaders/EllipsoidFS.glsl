uniform vec3 u_radii;

varying vec3 v_positionEC;

void main()
{
 
    // TODO:  WTF - center in eye coordinates, and radii in model coordinates!
    czm_ellipsoid ellipsoid = czm_ellipsoidNew(czm_modelView[3].xyz, u_radii);
    vec3 direction = normalize(v_positionEC);
    czm_ray ray = czm_ray(vec3(0.0), direction);
    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);
    
    if (!czm_isEmpty(intersection))
    {
        // TODO: start is zero if inside the ellipsoid
            
        // TODO: Use material system.        
        gl_FragColor = vec4(0.0, 1.0, 0.0, 0.75);
    }
    else
    {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 0.75);
//        discard;
    }
}
