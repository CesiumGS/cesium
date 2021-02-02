//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * The maximum latitude, in radians, both North and South, supported by a Web Mercator\n\
 * (EPSG:3857) projection.  Technically, the Mercator projection is defined\n\
 * for any latitude up to (but not including) 90 degrees, but it makes sense\n\
 * to cut it off sooner because it grows exponentially with increasing latitude.\n\
 * The logic behind this particular cutoff value, which is the one used by\n\
 * Google Maps, Bing Maps, and Esri, is that it makes the projection\n\
 * square.  That is, the rectangle is equal in the X and Y directions.\n\
 *\n\
 * The constant value is computed as follows:\n\
 *   czm_pi * 0.5 - (2.0 * atan(exp(-czm_pi)))\n\
 *\n\
 * @name czm_webMercatorMaxLatitude\n\
 * @glslConstant\n\
 */\n\
const float czm_webMercatorMaxLatitude = 1.4844222297453324;\n\
";
