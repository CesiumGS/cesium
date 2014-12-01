/**
 * Computes the fraction of a Web Wercator rectangle at which a given geodetic latitude is located.
 *
 * @name czm_latitudeToWebMercatorFraction
 * @glslFunction
 *
 * @param {float} latitude The geodetic latitude, in radians.
 * @param {float} southMercatorYLow The low portion of the Web Mercator coordinate of the southern boundary of the rectangle.
 * @param {float} southMercatorYHigh The high portion of the Web Mercator coordinate of the southern boundary of the rectangle.
 * @param {float} oneOverMercatorHeight The total height of the rectangle in Web Mercator coordinates.
 *
 * @returns {float} The fraction of the rectangle at which the latitude occurs.  If the latitude is the southern
 *          boundary of the rectangle, the return value will be zero.  If it is the northern boundary, the return
 *          value will be 1.0.  Latitudes in between are mapped according to the Web Mercator projection.
 */ 
float czm_latitudeToWebMercatorFraction(float latitude, float southMercatorYLow, float southMercatorYHigh, float oneOverMercatorHeight)
{
    float sinLatitude = sin(latitude);
    float mercatorY = 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));
    
    // mercatorY - southMercatorY in simulated double precision.
    float t1 = 0.0 - southMercatorYLow;
    float e = t1 - 0.0;
    float t2 = ((-southMercatorYLow - e) + (0.0 - (t1 - e))) + mercatorY - southMercatorYHigh;
    float highDifference = t1 + t2;
    float lowDifference = t2 - (highDifference - t1);
    
    return highDifference * oneOverMercatorHeight + lowDifference * oneOverMercatorHeight;
}
