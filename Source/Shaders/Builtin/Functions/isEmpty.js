//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Determines if a time interval is empty.\n\
 *\n\
 * @name czm_isEmpty\n\
 * @glslFunction \n\
 * \n\
 * @param {czm_raySegment} interval The interval to test.\n\
 * \n\
 * @returns {bool} <code>true</code> if the time interval is empty; otherwise, <code>false</code>.\n\
 *\n\
 * @example\n\
 * bool b0 = czm_isEmpty(czm_emptyRaySegment);      // true\n\
 * bool b1 = czm_isEmpty(czm_raySegment(0.0, 1.0)); // false\n\
 * bool b2 = czm_isEmpty(czm_raySegment(1.0, 1.0)); // false, contains 1.0.\n\
 */\n\
bool czm_isEmpty(czm_raySegment interval)\n\
{\n\
    return (interval.stop < 0.0);\n\
}\n\
";
