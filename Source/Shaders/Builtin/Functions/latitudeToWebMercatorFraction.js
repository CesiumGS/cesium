    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Computes the fraction of a Web Wercator rectangle at which a given geodetic latitude is located.\n\
 *\n\
 * @name czm_latitudeToWebMercatorFraction\n\
 * @glslFunction\n\
 *\n\
 * @param {float} latitude The geodetic latitude, in radians.\n\
 * @param {float} southMercatorYLow The low portion of the Web Mercator coordinate of the southern boundary of the rectangle.\n\
 * @param {float} southMercatorYHigh The high portion of the Web Mercator coordinate of the southern boundary of the rectangle.\n\
 * @param {float} oneOverMercatorHeight The total height of the rectangle in Web Mercator coordinates.\n\
 *\n\
 * @returns {float} The fraction of the rectangle at which the latitude occurs.  If the latitude is the southern\n\
 *          boundary of the rectangle, the return value will be zero.  If it is the northern boundary, the return\n\
 *          value will be 1.0.  Latitudes in between are mapped according to the Web Mercator projection.\n\
 */ \n\
float czm_latitudeToWebMercatorFraction(float latitude, float southMercatorYLow, float southMercatorYHigh, float oneOverMercatorHeight)\n\
{\n\
    float sinLatitude = sin(latitude);\n\
    float mercatorY = 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));\n\
    \n\
    // mercatorY - southMercatorY in simulated double precision.\n\
    float t1 = 0.0 - southMercatorYLow;\n\
    float e = t1 - 0.0;\n\
    float t2 = ((-southMercatorYLow - e) + (0.0 - (t1 - e))) + mercatorY - southMercatorYHigh;\n\
    float highDifference = t1 + t2;\n\
    float lowDifference = t2 - (highDifference - t1);\n\
    \n\
    return highDifference * oneOverMercatorHeight + lowDifference * oneOverMercatorHeight;\n\
}\n\
";
});