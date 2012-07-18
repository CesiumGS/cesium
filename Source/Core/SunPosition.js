/*global define*/
define([
        './Math',
        './Cartesian3',
        './Cartographic',
        './Matrix3',
        './JulianDate'
    ],
    function(
        CesiumMath,
        Cartesian3,
        Cartographic,
        Matrix3,
        JulianDate) {
    "use strict";

    /**
     * DOC_TBA.
     *
     * @exports SunPosition
     */
    var SunPosition = {
        /**
         * Computes the approximate sun position, in the WGS84 coordinate system (Earth's fixed frame), for a given julian date.
         *
         * @param {JulianDate} [julianDate] The julian date to compute the sun's position for.
         *
         * @example
         * // Compute the current sun position
         * var position = SunPosition.compute().position;
         */
        compute : function(julianDate) {
            julianDate = julianDate || new JulianDate();

            var AU_TO_METERS = 149597870700.0;

            function isLeapYear(year) {
                return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
            }

            function toGregorianDate(julianDate) {
                var j = julianDate + 32044;
                var g = Math.floor(j / 146097);
                var dg = j - Math.floor(j / 146097) * 146097;
                var c = Math.floor((Math.floor(dg / 36524 + 1) * 3) / 4);
                var dc = dg - c * 36524;
                var b = Math.floor(dc / 1461);
                var db = dc - Math.floor(dc / 1461) * 1461;
                var a = Math.floor((Math.floor(db / 365 + 1) * 3) / 4);
                var da = db - a * 365;
                var y = g * 400 + c * 100 + b * 4 + a;
                var m = Math.floor((da * 5 + 308) / 153) - 2;
                var d = da - Math.floor(((m + 4) * 153) / 5) + 122;
                var year = y - 4800 + Math.floor((m + 2) / 12);
                var month = (m + 2) - Math.floor((m + 2) / 12) * 12 + 1;
                var day = Math.floor(d + 1.5);
                return {
                    month : month,
                    day : day,
                    year : year
                };
            }

            var T = (julianDate.getTotalDays() - 2451545.0) / 36525;
            var meanAnomaly = CesiumMath.convertLongitudeRange(CesiumMath.toRadians(357.5277233 + 35999.05034 * T));
            var distanceToSunInAU = 1.000140612 - 0.016708617 * Math.cos(meanAnomaly) - 0.000139589 * Math.cos(2 * meanAnomaly);

            var date = toGregorianDate(julianDate.getTotalDays());
            var dayNumber = 0;
            switch (date.month) {
            case 1:
                dayNumber = date.day;
                break;
            case 2:
                dayNumber = date.day + 31;
                break;
            case 3:
                dayNumber = date.day + 59;
                break;
            case 4:
                dayNumber = date.day + 90;
                break;
            case 5:
                dayNumber = date.day + 120;
                break;
            case 6:
                dayNumber = date.day + 151;
                break;
            case 7:
                dayNumber = date.day + 181;
                break;
            case 8:
                dayNumber = date.day + 212;
                break;
            case 9:
                dayNumber = date.day + 243;
                break;
            case 10:
                dayNumber = date.day + 273;
                break;
            case 11:
                dayNumber = date.day + 304;
                break;
            case 12:
                dayNumber = date.day + 334;
                break;
            }

            if (isLeapYear(date.year) && date.month > 2) {
                dayNumber++;
            }

            var temp = CesiumMath.toRadians((360.0 / 365.0) * (dayNumber - 81.0));
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
            var declinationAngle = Math.asin(0.39795 * Math.cos(CesiumMath.toRadians(0.98563 * (dayNumber - 173.0))));
            var x = Math.cos(declinationAngle) * Math.cos(hourAngle);
            var y = Math.cos(declinationAngle) * Math.sin(hourAngle);
            var z = Math.sin(declinationAngle);
            var latitudeAngle = 0.0;

            var transform = new Matrix3(
                    Math.cos(latitudeAngle),        0.0, Math.sin(latitudeAngle),
                    0.0,                            1.0, 0.0,
                    -1.0 * Math.sin(latitudeAngle), 0.0, Math.cos(latitudeAngle));

            var direction = transform.multiplyByVector(new Cartesian3(x, y, z));
            var distance = distanceToSunInAU * AU_TO_METERS;

            /**
             * DOC_TBA
             */
            return {
                /**
                 * The approximate coordinates of the sun's position in the earth's fixed frame.
                 *
                 * @type Cartesian3
                 */
                position : direction.multiplyByScalar(distance),

                /**
                 * The cartographic position, in radians, of the sun's position projected onto Earth.  This is accurate to within less than a degree of the true position.
                 *
                 * @type Cartographic
                 */
                cartographicPosition : new Cartographic(hourAngle, declinationAngle, 0.0),

                /**
                 * Returns a unit vector, in Earth's fixed frame, pointing to the sun.
                 *
                 * @type Cartesian3
                 */
                direction : direction,

                /**
                 * The approximate distance from the center of the Earth to the center of the Sun in meters.
                 *
                 * @type Number
                 */
                distance : distance
            };
        }
    };

    return SunPosition;
});
