//This file is automatically rebuilt by the Cesium build process.
export default "varying vec4 positionEC;\n\
\n\
void main()\n\
{\n\
    vec3 position;\n\
    vec3 direction;\n\
    if (czm_orthographicIn3D == 1.0)\n\
    {\n\
        vec2 uv = (gl_FragCoord.xy -  czm_viewport.xy) / czm_viewport.zw;\n\
        vec2 minPlane = vec2(czm_frustumPlanes.z, czm_frustumPlanes.y); // left, bottom\n\
        vec2 maxPlane = vec2(czm_frustumPlanes.w, czm_frustumPlanes.x); // right, top\n\
        position = vec3(mix(minPlane, maxPlane, uv), 0.0);\n\
        direction = vec3(0.0, 0.0, -1.0);\n\
    } \n\
    else \n\
    {\n\
        position = vec3(0.0);\n\
        direction = normalize(positionEC.xyz);\n\
    }\n\
\n\
    czm_ray ray = czm_ray(position, direction);\n\
\n\
    vec3 ellipsoid_center = czm_view[3].xyz;\n\
\n\
    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid_center, czm_ellipsoidInverseRadii);\n\
    if (!czm_isEmpty(intersection))\n\
    {\n\
        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);\n\
    }\n\
    else\n\
    {\n\
        discard;\n\
    }\n\
\n\
    czm_writeLogDepth();\n\
}\n\
";
