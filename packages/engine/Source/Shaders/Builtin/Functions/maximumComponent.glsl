/**
 * Find the maximum component of a vector.
 *
 * @name czm_maximumComponent
 * @glslFunction
 *
 * @param {vec2|vec3|vec4} v The input vector.
 * @returns {float} The value of the largest component.
 */
float czm_maximumComponent(vec2 v)
{
    return max(v.x, v.y);
}
float czm_maximumComponent(vec3 v)
{
    return max(max(v.x, v.y), v.z);
}
float czm_maximumComponent(vec4 v)
{
    return max(max(max(v.x, v.y), v.z), v.w);
}
