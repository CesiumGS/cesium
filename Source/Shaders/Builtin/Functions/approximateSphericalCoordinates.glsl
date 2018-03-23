// Based on Michal Drobot's approximation from ShaderFastLibs, which in turn is based on
// "Efficient approximations for the arctangent function," Rajan, S. Sichun Wang Inkol, R. Joyal, A., May 2006.
// Adapted from ShaderFastLibs under MIT License.
//
// Chosen for the following characteristics over range [-1, 1]:
// - basically no error at -1 and 1, important for getting around range limit (atan2 via atan requires infinite range atan)
// - no need for function mirroring due to range reduction (neede when only approximating [0, 1])
// - no visible artifacts from first-derivative discontinuities, unlike latitude via range-reduced sqrt asin approximations (at equator)
float fastApproximateAtan(float x) {
    return x * (-0.1784 * abs(x) - 0.0663 * x * x + 1.0301);
}

// Compute longitude using an approximate Atan function
// Because our Atan approximation doesn't have infinite range,
// need to "flip and offset" the result periodically.
float longitudeApproximateAtan(vec2 xy) {
    float inAtanBounds = float(abs(xy.y / xy.x) < 1.0);
    float outAtanBounds = float(inAtanBounds == 0.0);
    float q = inAtanBounds * (xy.y / (sign(xy.x) * xy.x)) + outAtanBounds * (xy.x / xy.y);

    return inAtanBounds * (abs(min(sign(xy.x), 0.0)) * (sign(xy.y) * czm_pi)) + outAtanBounds * (sign(xy.y) * czm_piOverTwo) +
        (inAtanBounds * sign(xy.x) - outAtanBounds) * fastApproximateAtan(q);

    /* branch equivalent: */
    //if (abs(xy.y / xy.x) < 1.0) {
    //    float signX = sign(xy.x);
    //    return abs(min(signX, 0.0)) * (sign(xy.y) * czm_pi) + signX * fastApproximateAtan(xy.y / (signX * xy.x));
    //    /* branch equivalent: */
    //    //if (xy.x < 0.0) {
    //    //    return sign(xy.y) * czm_pi - fastApproximateAtan(xy.y / abs(xy.x));
    //    //}
    //    return fastApproximateAtan(xy.y / xy.x);
    //} else {
    //    return sign(xy.y) * czm_piOverTwo - fastApproximateAtan(xy.x / xy.y);
    //}
}

// Compute latitude using an approximate Atan function.
// Because our Atan approximation doesn't have infinite range,
// need to "flip and offset" the result when the vector passes 45 degrees offset from equator.
// Consider:
// atan(2 / 1) == pi/2 - atan(1 / 2)
// atan(2 / -1) == -pi/2 - atan(1 / -2)
// Using atan instead of asin because most asin approximations (and even some vendor implementations!)
// are based on range reduction and sqrt, which causes first-derivative discontuinity and pinching at the equator.
float latitudeApproximateAtan(float magXY, float normalZ) {
    float inAtanBounds = float(abs(normalZ / magXY) < 1.0);
    float outAtanBounds = float(inAtanBounds == 0.0);
    float q = inAtanBounds * (normalZ / magXY) + outAtanBounds * (magXY / normalZ);
    return outAtanBounds * sign(normalZ) * czm_piOverTwo + (inAtanBounds - outAtanBounds) * fastApproximateAtan(q);

    /* branch equivalent: */
    //float q = normalZ / magXY;
    //if (abs(q) < 1.0) {
    //    return fastApproximateAtan(normalZ / magXY);
    //} else {
    //    return sign(normalZ) * czm_piOverTwo - fastApproximateAtan(magXY / normalZ);
    //}
}

/**
 * Approximately computes spherical coordinates given a normal.
 * Uses approximate inverse trigonometry for speed and consistency,
 * since inverse trigonometry can differ from vendor-to-vendor and when compared with the CPU.
 *
 * @name czm_approximateSphericalCoordinates
 * @glslFunction
 *
 * @param {vec3} normal Unit-length normal.
 *
 * @returns {vec2} Approximate latitude and longitude spherical coordinates.
 */
vec2 czm_approximateSphericalCoordinates(vec3 normal) {
    // Project into plane with vertical for latitude
    float magXY = sqrt(normal.x * normal.x + normal.y * normal.y);

    // Project into equatorial plane for longitude
    vec2 xy = normal.xy / magXY;

    return vec2(latitudeApproximateAtan(magXY, normal.z), longitudeApproximateAtan(xy));
}
