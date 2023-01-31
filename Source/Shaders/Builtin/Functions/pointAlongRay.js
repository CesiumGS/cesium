//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Computes the point along a ray at the given time.  <code>time</code> can be positive, negative, or zero.\n\
 *\n\
 * @name czm_pointAlongRay\n\
 * @glslFunction\n\
 *\n\
 * @param {czm_ray} ray The ray to compute the point along.\n\
 * @param {float} time The time along the ray.\n\
 * \n\
 * @returns {vec3} The point along the ray at the given time.\n\
 * \n\
 * @example\n\
 * czm_ray ray = czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0)); // origin, direction\n\
 * vec3 v = czm_pointAlongRay(ray, 2.0); // (2.0, 0.0, 0.0)\n\
 */\n\
vec3 czm_pointAlongRay(czm_ray ray, float time)\n\
{\n\
    return ray.origin + (time * ray.direction);\n\
}\n\
";
