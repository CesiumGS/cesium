//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Computes a value that scales with distance.  The scaling is clamped at the near and\n\
 * far distances, and does not extrapolate.  This function works with the\n\
 * {@link NearFarScalar} JavaScript class.\n\
 *\n\
 * @name czm_nearFarScalar\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} nearFarScalar A vector with 4 components: Near distance (x), Near value (y), Far distance (z), Far value (w).\n\
 * @param {float} cameraDistSq The square of the current distance from the camera.\n\
 *\n\
 * @returns {float} The value at this distance.\n\
 */\n\
float czm_nearFarScalar(vec4 nearFarScalar, float cameraDistSq)\n\
{\n\
    float valueAtMin = nearFarScalar.y;\n\
    float valueAtMax = nearFarScalar.w;\n\
    float nearDistanceSq = nearFarScalar.x * nearFarScalar.x;\n\
    float farDistanceSq = nearFarScalar.z * nearFarScalar.z;\n\
\n\
    float t = (cameraDistSq - nearDistanceSq) / (farDistanceSq - nearDistanceSq);\n\
\n\
    t = pow(clamp(t, 0.0, 1.0), 0.2);\n\
\n\
    return mix(valueAtMin, valueAtMax, t);\n\
}\n\
";
