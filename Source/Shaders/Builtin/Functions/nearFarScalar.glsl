/**
 * Computes a value that scales with distance.  The scaling is clamped at the near and
 * far distances, and does not extrapolate.  This function works with the
 * {@link NearFarScalar} JavaScript class.
 *
 * @name czm_nearFarScalar
 * @glslFunction
 *
 * @param {vec4} nearFarScalar A vector with 4 components: Near distance (x), Near value (y), Far distance (z), Far value (w).
 * @param {float} cameraDistSq The square of the current distance from the camera.
 *
 * @returns {float} The value at this distance.
 */
float czm_nearFarScalar(vec4 nearFarScalar, float cameraDistSq)
{
    float valueAtMin = nearFarScalar.y;
    float valueAtMax = nearFarScalar.w;
    float nearDistanceSq = nearFarScalar.x * nearFarScalar.x;
    float farDistanceSq = nearFarScalar.z * nearFarScalar.z;

    float t = (cameraDistSq - nearDistanceSq) / (farDistanceSq - nearDistanceSq);

    t = pow(clamp(t, 0.0, 1.0), 0.2);

    return mix(valueAtMin, valueAtMax, t);
}
