/*global define*/
define([
        './defined',
        './IauOrientationParameters',
        './JulianDate',
        './Math',
        './TimeConstants'
    ], function(
        defined,
        IauOrientationParameters,
        JulianDate,
        CesiumMath,
        TimeConstants) {
    "use strict";

    /**
     * This is a collection of the orientation information available for central bodies.
     * The data comes from the Report of the IAU/IAG Working Group on Cartographic
     * Coordinates and Rotational Elements: 2000.
     * @exports Iau2000Orientation
     */
    var Iau2000Orientation = {};

    var TdtMinusTai = 32.184;
    var J2000d = 2451545.0;

    var c1 = -0.0529921;
    var c2 = -0.1059842;
    var c3 = 13.0120009;
    var c4 = 13.3407154;
    var c5 = 0.9856003;
    var c6 = 26.4057084;
    var c7 = 13.0649930;
    var c8 = 0.3287146;
    var c9 = 1.7484877;
    var c10 = -0.1589763;
    var c11 = 0.0036096;
    var c12 = 0.1643573;
    var c13 = 12.9590088;

    /**
     * Compute the orientation parameters for the Moon.
     *
     * @param {JulianDate} [date] The date to evaluate the parameters.
     * @returns {IauOrientationParameters} The parameters representing the orientation of the Earth's Moon.
     */
    Iau2000Orientation.ComputeMoon = function(date) {
        if (!defined(date)) {
            date = new JulianDate();
        }

        var result = date.addSeconds(TdtMinusTai);
        var d = result.getTotalDays() - J2000d;
        var T = d / TimeConstants.DAYS_PER_JULIAN_CENTURY;

        var E1 = (125.045 + c1 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E2 = (250.089 + c2 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E3 = (260.008 + c3 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E4 = (176.625 + c4 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E5 = (357.529 + c5 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E6 = (311.589 + c6 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E7 = (134.963 + c7 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E8 = (276.617 + c8 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E9 = (34.226 + c9 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E10 = (15.134 + c10 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E11 = (119.743 + c11 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E12 = (239.961 + c12 * d) * CesiumMath.RADIANS_PER_DEGREE;
        var E13 = (25.053 + c13 * d) * CesiumMath.RADIANS_PER_DEGREE;

        var rightAscension = (269.9949 + 0.0031 * T - 3.8787 * Math.sin(E1) - 0.1204 * Math.sin(E2) +
            0.0700 * Math.sin(E3) - 0.0172 * Math.sin(E4) + 0.0072 * Math.sin(E6) -
            0.0052 * Math.sin(E10) + 0.0043 * Math.sin(E13)) *
            CesiumMath.RADIANS_PER_DEGREE;
        var declination = (66.5392 + 0.013 * T + 1.5419 * Math.cos(E1) + 0.0239 * Math.cos(E2) -
            0.0278 * Math.cos(E3) + 0.0068 * Math.cos(E4) - 0.0029 * Math.cos(E6) +
            0.0009 * Math.cos(E7) + 0.0008 * Math.cos(E10) - 0.0009 * Math.cos(E13)) *
            CesiumMath.RADIANS_PER_DEGREE;
        var rotation = (38.3213 + 13.17635815 * d - 1.4e-12 * d * d + 3.5610 * Math.sin(E1) +
            0.1208 * Math.sin(E2) - 0.0642 * Math.sin(E3) + 0.0158 * Math.sin(E4) +
            0.0252 * Math.sin(E5) - 0.0066 * Math.sin(E6) - 0.0047 * Math.sin(E7) -
            0.0046 * Math.sin(E8) + 0.0028 * Math.sin(E9) + 0.0052 * Math.sin(E10) +
            0.004 * Math.sin(E11) + 0.0019 * Math.sin(E12) - 0.0044 * Math.sin(E13)) *
            CesiumMath.RADIANS_PER_DEGREE;

        var rotationRate = ((13.17635815 - 1.4e-12 * (2.0 * d)) +
            3.5610 * Math.cos(E1) * c1 +
            0.1208 * Math.cos(E2)*c2 - 0.0642 * Math.cos(E3)*c3 + 0.0158 * Math.cos(E4)*c4 +
            0.0252 * Math.cos(E5)*c5 - 0.0066 * Math.cos(E6)*c6 - 0.0047 * Math.cos(E7)*c7 -
            0.0046 * Math.cos(E8)*c8 + 0.0028 * Math.cos(E9)*c9 + 0.0052 * Math.cos(E10)*c10 +
            0.004 * Math.cos(E11)*c11 + 0.0019 * Math.cos(E12)*c12 - 0.0044 * Math.cos(E13)*c13) /
            86400.0 * CesiumMath.RADIANS_PER_DEGREE;

        return new IauOrientationParameters(rightAscension, declination, rotation, rotationRate);
    };

    return Iau2000Orientation;
});