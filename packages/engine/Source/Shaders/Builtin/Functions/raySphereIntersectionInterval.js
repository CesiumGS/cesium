//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Compute the intersection interval of a ray with a sphere.\n\
 *\n\
 * @name czm_raySphereIntersectionInterval\n\
 * @glslFunction\n\
 *\n\
 * @param {czm_ray} ray The ray.\n\
 * @param {vec3} center The center of the sphere.\n\
 * @param {float} radius The radius of the sphere.\n\
 * @return {czm_raySegment} The intersection interval of the ray with the sphere.\n\
 */\n\
czm_raySegment czm_raySphereIntersectionInterval(czm_ray ray, vec3 center, float radius)\n\
{\n\
    vec3 o = ray.origin;\n\
    vec3 d = ray.direction;\n\
\n\
    vec3 oc = o - center;\n\
\n\
    float a = dot(d, d);\n\
    float b = 2.0 * dot(d, oc);\n\
    float c = dot(oc, oc) - (radius * radius);\n\
\n\
    float det = (b * b) - (4.0 * a * c);\n\
\n\
    if (det < 0.0) {\n\
        return czm_emptyRaySegment;\n\
    }\n\
\n\
    float sqrtDet = sqrt(det);\n\
\n\
    float t0 = (-b - sqrtDet) / (2.0 * a);\n\
    float t1 = (-b + sqrtDet) / (2.0 * a);\n\
\n\
    czm_raySegment result = czm_raySegment(t0, t1);\n\
    return result;\n\
}\n\
";
