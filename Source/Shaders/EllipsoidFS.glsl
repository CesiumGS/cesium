uniform vec3 u_radii;

varying vec3 v_positionEC;
varying vec3 v_centerEC;

void main()
{   
    agi_ellipsoid ellipsoid = agi_ellipsoidNew(v_centerEC, u_radii);
    vec3 direction = normalize(v_positionEC);
    agi_ray ray = agi_ray(vec3(0.0), direction);
    agi_raySegment intersection = agi_rayEllipsoidIntersectionInterval(ray, ellipsoid);
    
    if (!agi_isEmpty(intersection))
    {        
        // TODO: Use material system.
        gl_FragColor = vec4(0.0, 1.0, 1.0, 0.75);
    }
    else
    {
        discard;
    }
}
