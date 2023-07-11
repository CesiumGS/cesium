uniform vec3 u_radii;
uniform vec3 u_oneOverEllipsoidRadiiSquared;

in vec3 v_positionEC;

vec4 computeEllipsoidColor(czm_ray ray, float intersection, float side)
{
    vec3 positionEC = czm_pointAlongRay(ray, intersection);
    vec3 positionMC = (czm_inverseModelView * vec4(positionEC, 1.0)).xyz;
    vec3 geodeticNormal = normalize(czm_geodeticSurfaceNormal(positionMC, vec3(0.0), u_oneOverEllipsoidRadiiSquared));
    vec3 sphericalNormal = normalize(positionMC / u_radii);
    vec3 normalMC = geodeticNormal * side;              // normalized surface normal (always facing the viewer) in model coordinates
    vec3 normalEC = normalize(czm_normal * normalMC);   // normalized surface normal in eye coordinates

    vec2 st = czm_ellipsoidWgs84TextureCoordinates(sphericalNormal);
    vec3 positionToEyeEC = -positionEC;

    czm_materialInput materialInput;
    materialInput.s = st.s;
    materialInput.st = st;
    materialInput.str = (positionMC + u_radii) / u_radii;
    materialInput.normalEC = normalEC;
    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(positionMC, normalEC);
    materialInput.positionToEyeEC = positionToEyeEC;
    czm_material material = czm_getMaterial(materialInput);

#ifdef ONLY_SUN_LIGHTING
    return czm_private_phong(normalize(positionToEyeEC), material, czm_sunDirectionEC);
#else
    return czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
#endif
}

void main()
{
    // PERFORMANCE_TODO: When dynamic branching is available, compute ratio of maximum and minimum radii
    // in the vertex shader. Only when it is larger than some constant, march along the ray.
    // Otherwise perform one intersection test which will be the common case.

    // Test if the ray intersects a sphere with the ellipsoid's maximum radius.
    // For very oblate ellipsoids, using the ellipsoid's radii for an intersection test
    // may cause false negatives. This will discard fragments before marching the ray forward.
    float maxRadius = max(u_radii.x, max(u_radii.y, u_radii.z)) * 1.5;
    vec3 direction = normalize(v_positionEC);
    vec3 ellipsoidCenter = czm_modelView[3].xyz;

    float t1 = -1.0;
    float t2 = -1.0;

    float b = -2.0 * dot(direction, ellipsoidCenter);
    float c = dot(ellipsoidCenter, ellipsoidCenter) - maxRadius * maxRadius;

    float discriminant = b * b - 4.0 * c;
    if (discriminant >= 0.0) {
        t1 = (-b - sqrt(discriminant)) * 0.5;
        t2 = (-b + sqrt(discriminant)) * 0.5;
    }

    if (t1 < 0.0 && t2 < 0.0) {
        discard;
    }

    float t = min(t1, t2);
    if (t < 0.0) {
        t = 0.0;
    }

    // March ray forward to intersection with larger sphere and find
    czm_ray ray = czm_ray(t * direction, direction);

    vec3 ellipsoid_inverseRadii = vec3(1.0 / u_radii.x, 1.0 / u_radii.y, 1.0 / u_radii.z);

    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoidCenter, ellipsoid_inverseRadii);

    if (czm_isEmpty(intersection))
    {
        discard;
    }

    // If the viewer is outside, compute outsideFaceColor, with normals facing outward.
    vec4 outsideFaceColor = (intersection.start != 0.0) ? computeEllipsoidColor(ray, intersection.start, 1.0) : vec4(0.0);

    // If the viewer either is inside or can see inside, compute insideFaceColor, with normals facing inward.
    vec4 insideFaceColor = (outsideFaceColor.a < 1.0) ? computeEllipsoidColor(ray, intersection.stop, -1.0) : vec4(0.0);

    out_FragColor = mix(insideFaceColor, outsideFaceColor, outsideFaceColor.a);
    out_FragColor.a = 1.0 - (1.0 - insideFaceColor.a) * (1.0 - outsideFaceColor.a);

#if (defined(WRITE_DEPTH) && (__VERSION__ == 300 || defined(GL_EXT_frag_depth)))
    t = (intersection.start != 0.0) ? intersection.start : intersection.stop;
    vec3 positionEC = czm_pointAlongRay(ray, t);
    vec4 positionCC = czm_projection * vec4(positionEC, 1.0);
#ifdef LOG_DEPTH
    czm_writeLogDepth(1.0 + positionCC.w);
#else
    float z = positionCC.z / positionCC.w;

    float n = czm_depthRange.near;
    float f = czm_depthRange.far;

    gl_FragDepth = (z * (f - n) + f + n) * 0.5;
#endif
#endif
}
