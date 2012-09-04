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

    /**
     * Utility class for computing the position to the sun in Earth's fixed frame.
     * @alias SunPosition
     * @constructor
     *
     * @example
     * //Set scene's sun position to always match current real-world time.
     * var sunPosition = new SunPosition();
     * scene.setAnimation(function() {
     *   var now = new JulianDate();
     *   sunPosition.update(now);
     *   scene.setSunPosition(sunPosition.position);
     * });
     */
    var SunPosition = function() {
        /**
         * The approximate coordinates of the sun's position in the Earth's fixed frame.
         * @type Cartesian3
         */
        this.position = new Cartesian3();

        /**
         * The sun's position projected onto the Earth's surface.  This is accurate to within less than a degree of the true position.
         * @type Cartographic
         */
        this.surfacePosition = new Cartographic();

        /**
         * A unit vector pointing from the center of the earth to the sun in the Earth's fixed frame.
         * @type Cartesian3
         */
        this.direction = new Cartesian3();

        /**
         * The approximate distance from the center of the Earth to the center of the Sun in meters.
         * @type Number
         */
        this.distance = 0.0;
    };

    /**
     * Updates all properties to reflect the provided time.
     *
     * @param {JulianDate} julianDate The time at which to compute the Sun's position.
     *
     * @exception {DeveloperError} julianDate is required.
     *
     * @example
     * // Update the sun position to current real-world time.
     * var sunPosition = new SunPosition();
     * var now = new JulianDate();
     * sunPosition.update(now);
     * var position = sunPosition.position;
     * var distanceToEarth = sunPosition.distance;
     */
    SunPosition.prototype.update = function(julianDate) {
        if (typeof julianDate === 'undefined') {
            throw new DeveloperError('julianDate is required.');
        }

        var T = (julianDate.getTotalDays() - 2451545.0) / 36525;
        var meanAnomaly = CesiumMath.convertLongitudeRange(CesiumMath.toRadians(357.5277233 + 35999.05034 * T));
        var distanceToSunInAU = 1.000140612 - 0.016708617 * Math.cos(meanAnomaly) - 0.000139589 * Math.cos(2 * meanAnomaly);

        var date = julianDate.toDate();
        var month =  date.getUTCMonth();
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

        var direction = Matrix3.multiplyByVector(transform, scratch, this.direction);
        var distance = this.distance = distanceToSunInAU * AU_TO_METERS;

        direction.multiplyByScalar(distance, this.position);
        this.surfacePosition.longitude = hourAngle;
        this.surfacePosition.latitude = declinationAngle;
        //this.surfacePosition.height = 0.0; (Always 0.0, so there's no need to set it)
    };

    return SunPosition;
});
