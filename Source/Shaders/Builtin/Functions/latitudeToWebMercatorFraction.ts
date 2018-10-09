//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Computes the fraction of a Web Wercator rectangle at which a given geodetic latitude is located.\n\
 *\n\
 * @name czm_latitudeToWebMercatorFraction\n\
 * @glslFunction\n\
 *\n\
 * @param {float} latitude The geodetic latitude, in radians.\n\
 * @param {float} southMercatorY The Web Mercator coordinate of the southern boundary of the rectangle.\n\
 * @param {float} oneOverMercatorHeight The total height of the rectangle in Web Mercator coordinates.\n\
 *\n\
 * @returns {float} The fraction of the rectangle at which the latitude occurs.  If the latitude is the southern\n\
 *          boundary of the rectangle, the return value will be zero.  If it is the northern boundary, the return\n\
 *          value will be 1.0.  Latitudes in between are mapped according to the Web Mercator projection.\n\
 */ \n\
float czm_latitudeToWebMercatorFraction(float latitude, float southMercatorY, float oneOverMercatorHeight)\n\
{\n\
    float sinLatitude = sin(latitude);\n\
    float mercatorY = 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));\n\
    \n\
    return (mercatorY - southMercatorY) * oneOverMercatorHeight;\n\
}\n\
";
});