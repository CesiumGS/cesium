//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Determines if the fragment is back facing\n\
 *\n\
 * @name czm_backFacing\n\
 * @glslFunction \n\
 * \n\
 * @returns {bool} <code>true</code> if the fragment is back facing; otherwise, <code>false</code>.\n\
 */\n\
bool czm_backFacing()\n\
{\n\
    // !gl_FrontFacing doesn't work as expected on Mac/Intel so use the more verbose form instead. See https://github.com/CesiumGS/cesium/pull/8494.\n\
    return gl_FrontFacing == false;\n\
}\n\
";
