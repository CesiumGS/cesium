/*global define*/
define([
        './isLeapYear',
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Cartographic',
        './Matrix3',
        './JulianDate'
    ],
    function(
        isLeapYear,
        DeveloperError,
        CesiumMath,
        Cartesian3,
        Cartographic,
        Matrix3,
        JulianDate) {
    "use strict";

    var offSets = [0,  // January
                   31, // February
                   59, // March
                   90, // April
                   120,// May
                   151,// June
                   181,// July
                   212,// August
                   243,// September
                   273,// October
                   304,// November
                   334 // December
                  ];

    var scratch = new Cartesian3();
    var transform = new Matrix3(0.0, 0.0, 0.0,
                                0.0, 1.0, 0.0,
                                0.0, 0.0, 0.0);

    var AU_TO_METERS = 149597870700.0;

    var direction = new Cartesian3();

    /**
     * Computes the position of the Sun in Earth's fixed frame.
     * @exports computeSunPosition
     *
     * @param {JulianDate} [julianDate] The time at which to compute the Sun's position, if not provided the current system time is used.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} julianDate is required.
     *
     * @example
     * var sunPosition = computeSunPosition(new JulianDate());
     */
    var computeSunPosition = function(julianDate, result) {
        if (typeof julianDate === 'undefined') {
            julianDate = new JulianDate();
        }

        var T = (julianDate.getTotalDays() - 2451545.0) / 36525;
        var meanAnomaly = CesiumMath.convertLongitudeRange(CesiumMath.toRadians(357.5277233 + 35999.05034 * T));
        var distanceToSunInAU = 1.000140612 - 0.016708617 * Math.cos(meanAnomaly) - 0.000139589 * Math.cos(2 * meanAnomaly);

        var date = julianDate.toDate();
        var month = date.getUTCMonth();
        var dayOfYear = date.getUTCDate() + offSets[month];

        if (isLeapYear(date.getUTCFullYear()) && month > 1) {
            dayOfYear++;
        }

        var temp = CesiumMath.toRadians((360.0 / 365.0) * (dayOfYear - 81.0));
        var equationOfTime = 9.87 * Math.sin(2 * temp) - 7.53 * Math.cos(temp) - 1.5 * Math.sin(temp);
        var timeFraction = julianDate.getJulianTimeFraction();
        var localTime;
        if (timeFraction >= 0.5) {
            localTime = timeFraction * 24.0 - 12.0;
        } else {
            localTime = 12.0 + timeFraction * 24.0;
        }
        var localSolarTime = localTime + (equationOfTime / 60.0);
        var hourAngle = CesiumMath.toRadians(15.0 * (12.0 - localSolarTime));
        var declinationAngle = Math.asin(0.39795 * Math.cos(CesiumMath.toRadians(0.98563 * (dayOfYear - 173.0))));

        var latitudeAngle = 0.0;

        var cosLatitudeAngle = Math.cos(latitudeAngle);
        var sinLatitudeAngle = Math.sin(latitudeAngle);

        //Since some of these are constant,
        //there's no need to set them every time.
        transform[0] = cosLatitudeAngle;
        //transform[1] = 0.0;
        transform[2] = -sinLatitudeAngle;
        //transform[3] = 0.0;
        //transform[4] = 1.0;
        //transform[5] = 0.0;
        transform[6] = sinLatitudeAngle;
        //transform[7] = 0.0;
        transform[8] = cosLatitudeAngle;

        var cosDeclinationAngle = Math.cos(declinationAngle);
        scratch.x = cosDeclinationAngle * Math.cos(hourAngle);
        scratch.y = cosDeclinationAngle * Math.sin(hourAngle);
        scratch.z = Math.sin(declinationAngle);

        Matrix3.multiplyByVector(transform, scratch, direction);
        var distance = distanceToSunInAU * AU_TO_METERS;

        return direction.multiplyByScalar(distance, result);
    };

    return computeSunPosition;
});
