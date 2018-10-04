vec3 czm_sphericalHarmonics(vec3 normal, vec3 coeffs[9])
{
    const float c1 = 0.429043;
    const float c2 = 0.511664;
    const float c3 = 0.743125;
    const float c4 = 0.886227;
    const float c5 = 0.247708;

    vec3 L00 = coeffs[0];
    vec3 L1_1 = coeffs[1];
    vec3 L10 = coeffs[2];
    vec3 L11 = coeffs[3];
    vec3 L2_2 = coeffs[4];
    vec3 L2_1 = coeffs[5];
    vec3 L20 = coeffs[6];
    vec3 L21 = coeffs[7];
    vec3 L22 = coeffs[8];

    float x = normal.x;
    float y = normal.y;
    float z = normal.z;

    return c1 * L22 * (x * x - y * y) + c3 * L20 * z * z + c4 * L00 - c5 * L20 +
           2.0 * c1 * (L2_2 * x * y + L21 * x * z + L2_1 * y * z) +
           2.0 * c2 * (L11 * x + L1_1 * y + L10 * z);
}
