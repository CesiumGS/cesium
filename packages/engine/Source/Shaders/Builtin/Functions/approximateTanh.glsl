/**
 * Compute a rational approximation to tanh(x)
 *
 * @param {float} x A real number input
 * @returns {float} An approximation for tanh(x)
*/
float czm_approximateTanh(float x) {
    float x2 = x * x;
    return max(-1.0, min(1.0, x * (27.0 + x2) / (27.0 + 9.0 * x2)));
}
