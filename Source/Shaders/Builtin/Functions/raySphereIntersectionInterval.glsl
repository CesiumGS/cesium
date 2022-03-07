/**
 * Compute the intersection interval of a ray with a sphere.
 *
 * @name czm_raySphereIntersectionInterval
 * @glslFunction
 *
 * @param {czm_ray} ray The ray.
 * @param {vec3} center The center of the sphere.
 * @param {float} radius The radius of the sphere.
 * @return {czm_raySegment} The intersection interval of the ray with the sphere.
 */
czm_raySegment czm_raySphereIntersectionInterval(czm_ray ray, vec3 center, float radius)
{
    vec3 o = ray.origin;
    vec3 d = ray.direction;

    vec3 oc = o - center;

    float a = dot(d, d);
    float b = 2.0 * dot(d, oc);
    float c = dot(oc, oc) - (radius * radius);

    float det = (b * b) - (4.0 * a * c);

    if (det < 0.0) {
        return czm_emptyRaySegment;
    }

    float sqrtDet = sqrt(det);

    float t0 = (-b - sqrtDet) / (2.0 * a);
    float t1 = (-b + sqrtDet) / (2.0 * a);

    czm_raySegment result = czm_raySegment(t0, t1);
    return result;
}
