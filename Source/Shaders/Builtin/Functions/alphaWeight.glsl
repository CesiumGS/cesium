float czm_alphaWeight(float a)
{
    float z = czm_windowToEyeCoordinates(gl_FragCoord).z;
    return pow(a + 0.01, 4.0) + max(1e-2, min(3.0 * 1e3, 100.0 / (1e-5 + pow(abs(z) / 10.0, 3.0) + pow(abs(z) / 200.0, 6.0))));
}