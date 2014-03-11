/**
 * @private
 */
float czm_alphaWeight(float z, float a)
{
    // See Weighted Blended Order-Independent Transparency for examples of different weighting functions:
    // http://jcgt.org/published/0002/02/09/
    return clamp(0.5 / 1e-5 + pow(abs(z) / 200.0, 6.0), 1e-2, 3e-3);
}