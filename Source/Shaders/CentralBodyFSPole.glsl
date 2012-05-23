uniform sampler2D u_texture;
uniform vec3 u_color;

varying vec2 v_textureCoordinates;

void main()
{
    // TODO: make arbitrary ellipsoid
    agi_ellipsoid ellipsoid = agi_getWgs84EllipsoidEC();
    vec3 direction = normalize(agi_windowToEyeCoordinates(gl_FragCoord).xyz);
    agi_ray ray = agi_ray(vec3(0.0, 0.0, 0.0), direction);
    agi_raySegment intersection = agi_rayEllipsoidIntersectionInterval(ray, ellipsoid);
    
    vec4 color = texture2D(u_texture, v_textureCoordinates);
    
    if (!agi_isEmpty(intersection) && color.a == 0.0)
    {
        gl_FragColor = vec4(u_color, 1.0);
    }
    else
    {
        discard;
    }
}