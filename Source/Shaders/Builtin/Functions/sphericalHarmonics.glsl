/**
 * Computes a color from the third order spherical harmonic coefficients and a normalized direction vector.
 * <p>
 * The order of the coefficients is [L00, L1_1, L10, L11, L2_2, L2_1, L20, L21, L22].
 * </p>
 *
 * @name czm_sphericalHarmonics
 * @glslFunction
 *
 * @param {vec3} normal The normalized direction.
 * @param {vec3[9]} coefficients The third order spherical harmonic coefficients.
 * @returns {vec3} The color at the direction.
 *
 * @see https://graphics.stanford.edu/papers/envmap/envmap.pdf
 */
vec3 czm_sphericalHarmonics(vec3 normal, vec3 coefficients[9])
{
    const float c1 = 0.429043;
    const float c2 = 0.511664;
    const float c3 = 0.743125;
    const float c4 = 0.886227;
    const float c5 = 0.247708;

    vec3 L00 = coefficients[0];
    vec3 L1_1 = coefficients[1];
    vec3 L10 = coefficients[2];
    vec3 L11 = coefficients[3];
    vec3 L2_2 = coefficients[4];
    vec3 L2_1 = coefficients[5];
    vec3 L20 = coefficients[6];
    vec3 L21 = coefficients[7];
    vec3 L22 = coefficients[8];

    float x = normal.x;
    float y = normal.y;
    float z = normal.z;

    return c1 * L22 * (x * x - y * y) + c3 * L20 * z * z + c4 * L00 - c5 * L20 +
           2.0 * c1 * (L2_2 * x * y + L21 * x * z + L2_1 * y * z) +
           2.0 * c2 * (L11 * x + L1_1 * y + L10 * z);
}
