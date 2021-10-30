/**
 * Determines if the fragment is back facing
 *
 * @name czm_backFacing
 * @glslFunction 
 * 
 * @returns {bool} <code>true</code> if the fragment is back facing; otherwise, <code>false</code>.
 */
bool czm_backFacing()
{
    // !gl_FrontFacing doesn't work as expected on Mac/Intel so use the more verbose form instead. See https://github.com/CesiumGS/cesium/pull/8494.
    return gl_FrontFacing == false;
}
