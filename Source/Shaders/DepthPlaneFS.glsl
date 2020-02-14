varying vec4 positionEC;

void main()
{
    vec3 direction = normalize(positionEC.xyz);
    czm_ray ray = czm_ray(vec3(0.0), direction);

    vec3 ellipsoid_center = czm_view[3].xyz;

    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid_center, czm_ellipsoidInverseRadii);
    if (!czm_isEmpty(intersection) && intersection.start != 0.0)
    {
        float t = intersection.start * 0.75 + intersection.stop * 0.25;

        vec3 positionEC = czm_pointAlongRay(ray, t);
        vec4 positionCC = czm_projection * vec4(positionEC, 1.0);
#ifdef LOG_DEPTH
        czm_writeLogDepth(1.0 + positionCC.w);
#else
        float z = positionCC.z / positionCC.w;

        float n = czm_depthRange.near;
        float f = czm_depthRange.far;

        gl_FragDepthEXT = (z * (f - n) + f + n) * 0.5;
#endif

        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5);
    }
    else
    {
        gl_FragColor = vec4(1.0, 0.0, 1.0, 0.5);
        //discard;
    }
}
