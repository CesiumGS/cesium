float c0 = 0.282095;
float c1 = 0.488603;
float c2 = 1.092548;
float c3 = 0.315392;
float c4 = 0.546274;

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

    vec3 L = 
          L00 * c0
         + L1_1 * y * c1
        + L10 * z * c1
        + L11 * x * c1;
        + L2_2 * (y * x) * c2
        + L2_1 * (y * z) * c2
        + L20 * (3.0 * z * z - 1.0) * c3
        + L21 * (z * x) * c2
        + L22 * (x * x - y * y) * c4;
    return max(L, vec3(0.0));
}
