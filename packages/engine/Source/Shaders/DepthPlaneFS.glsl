in vec4 positionEC;

void main()
{
    vec3 position;
    vec3 direction;
    if (czm_orthographicIn3D == 1.0)
    {
        vec2 uv = (gl_FragCoord.xy -  czm_viewport.xy) / czm_viewport.zw;
        vec2 minPlane = vec2(czm_frustumPlanes.z, czm_frustumPlanes.y); // left, bottom
        vec2 maxPlane = vec2(czm_frustumPlanes.w, czm_frustumPlanes.x); // right, top
        position = vec3(mix(minPlane, maxPlane, uv), 0.0);
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
        out_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    }
    else
    {
        discard;
    }

    czm_writeLogDepth();
}
