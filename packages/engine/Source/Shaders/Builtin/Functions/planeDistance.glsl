/**
 * Computes distance from a point to a plane.
 *
 * @name czm_planeDistance
 * @glslFunction
 *
 * param {vec4} plane A Plane in Hessian Normal Form. See Plane.js
 * param {vec3} point A point in the same space as the plane.
 * returns {float} The distance from the point to the plane.
 */
float czm_planeDistance(vec4 plane, vec3 point) {
    return (dot(plane.xyz, point) + plane.w);
}

/**
 * Computes distance from a point to a plane.
 *
 * @name czm_planeDistance
 * @glslFunction
 *
 * param {vec3} planeNormal Normal for a plane in Hessian Normal Form. See Plane.js
 * param {float} planeDistance Distance for a plane in Hessian Normal form. See Plane.js
 * param {vec3} point A point in the same space as the plane.
 * returns {float} The distance from the point to the plane.
 */
float czm_planeDistance(vec3 planeNormal, float planeDistance, vec3 point) {
    return (dot(planeNormal, point) + planeDistance);
}
