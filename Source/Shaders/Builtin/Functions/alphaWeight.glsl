/**
 * @private
 */
float czm_alphaWeight(float a)
{
    // See Weighted Blended Order-Independent Transparency for examples of different weighting functions:
    // http://jcgt.org/published/0002/02/09/
    
    // This function uses the fragment depth. The other functions in the paper are based on distance from the camera.
    // If we decide to use one of those functions, we could use czm_windowToEyeCoordinates, but that would break
    // 2D because it relies on czm_inverseProjection which would throw when trying to invert the orthographic
    // projection matrix. Another option would be to use a varying containing the position in eye coordinates.
    
    return pow(a + 0.01, 4.0) + max(1e-2, min(3.0 * 1e3, 1e10 * pow(1.0 - gl_FragCoord.z, 3.0)));
}