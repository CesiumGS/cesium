/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Matrix3'],
    function(
        DeveloperError,
        CesiumMath,
        Cartesian3,
        Matrix3) {
    "use strict";

    /**
     * Functions related to classical Keplerian elements representing an elliptical orbit.
     *
     * @see ModifiedKeplerianElements
     */

    var KeplerianElements = {};

    /**
     * Calculates the true anomaly given the mean anomaly and the eccentricity.
     * @param {Number} meanAnomaly The mean anomaly (radians)
     * @param {Number} eccentricity The eccentricity
     *
     * @exception {DeveloperError} This method assumes a circular or elliptical orbit, so the eccentricity must be between zero and unity.

     *
     * @returns {Number} The true anomaly (radians)
     */
    KeplerianElements.MeanAnomalyToTrueAnomaly = function(meanAnomaly, eccentricity) {
        if (eccentricity < 0.0 || eccentricity >= 1.0)
        {
            throw new DeveloperError('eccentricity out of range.');
        }
        var eccentricAnomaly = this.MeanAnomalyToEccentricAnomaly(meanAnomaly, eccentricity);
        return this.EccentricAnomalyToTrueAnomaly(eccentricAnomaly, eccentricity);
    };

    /**
     * Calculates the eccentric anomaly given the mean anomaly and the eccentricity.
     * @param {Number} meanAnomaly The mean anomaly (radians)
     * @param {Number} eccentricity The eccentricity
     *
     * @exception {DeveloperError} This method assumes a circular or elliptical orbit, so the eccentricity must be between zero and unity.
     *
     * @returns {Number} The eccentric anomaly (radians)
     */
    KeplerianElements.MeanAnomalyToEccentricAnomaly = function(meanAnomaly, eccentricity)
    {
        if (eccentricity < 0.0 || eccentricity >= 1.0)
        {
            throw new DeveloperError('eccentricity out of range.');
        }

        // Maximum number of times to iterate in on Kepler's equation
        var maxIterationCount = 50;

        // Maximum difference to be considered convergence of Kepler's equation
        var keplerEqConvergence = CesiumMath.EPSILON8;

        var revs = Math.floor(meanAnomaly / CesiumMath.TWO_PI);

        // Find angle in current revolution
        meanAnomaly -= revs * CesiumMath.TWO_PI;

        // calculate starting value for iteration sequence
        var iterationValue = meanAnomaly + (eccentricity * Math.sin(meanAnomaly)) /
            (1.0 - Math.sin(meanAnomaly + eccentricity) + Math.sin(meanAnomaly));

        // Perform Newton-Raphson iteration on Kepler's equation
        var eccentricAnomaly = Number.MAX_VALUE;

        var count;
        for (count = 0;
            count < maxIterationCount && Math.abs(eccentricAnomaly - iterationValue) > keplerEqConvergence;
            ++count)
        {
            eccentricAnomaly = iterationValue;
            var NRfunction = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
            var dNRfunction = 1 - eccentricity * Math.cos(eccentricAnomaly);
            iterationValue = eccentricAnomaly - NRfunction / dNRfunction;
        }

        if (count >= maxIterationCount) {
            throw new DeveloperError('Kepler equation did not converge');
            //TODO: Port 'DoubleFunctionExplorer' from components
        }

        eccentricAnomaly = iterationValue + revs * CesiumMath.TWO_PI;
        return eccentricAnomaly;
    };

    /**
     * Calculates the true anomaly given the eccentric anomaly and the eccentricity.
     * @param {Number} eccentricAnomaly The eccentric anomaly (radians)
     * @param {Number} eccentricity The eccentricity
     *
     * @exception {DeveloperError} This method assumes a circular or elliptical orbit, so the eccentricity must be between zero and unity.
     *
     * @returns {Number} The true anomaly (radians)
     */
    KeplerianElements.EccentricAnomalyToTrueAnomaly = function(eccentricAnomaly, eccentricity) {
        if (eccentricity < 0.0 || eccentricity >= 1.0)
        {
            throw new DeveloperError('eccentricity out of range.');
        }

        // Calculate the number of previous revolutions
        var revs = Math.floor(eccentricAnomaly / CesiumMath.TWO_PI);

        // Find angle in current revolution
        eccentricAnomaly -= revs * CesiumMath.TWO_PI;

        // Calculate true anomaly from eccentric anomaly
        var trueAnomalyX = Math.cos(eccentricAnomaly) - eccentricity;
        var trueAnomalyY = Math.sin(eccentricAnomaly) * Math.sqrt(1 - eccentricity * eccentricity);

        var trueAnomaly = Math.atan2(trueAnomalyY, trueAnomalyX);

        // Ensure the correct quadrant
        trueAnomaly = CesiumMath.zeroToTwoPi(trueAnomaly);
        if (eccentricAnomaly < 0)
        {
            trueAnomaly -= CesiumMath.TWO_PI;
        }

        // Add on previous revolutions
        trueAnomaly += revs * CesiumMath.TWO_PI;

        return trueAnomaly;
    };

    /**
     * Calculates the transformation matrix to convert from the perifocal (PQW) coordinate
     * system to inertial cartesian coordinates.
     *
     * @param {Number} argumentOfPeriapsis The argument of periapsis (radians)
     * @param {Number} inclination The inclination (radians)
     * @param {Number} rightAscension The right ascension of the ascending node (radians)
     *
     * @returns {Matrix3} The transformation matrix to convert from the perifocal coordinate system to inertial cartesian coordinates.
     */
    KeplerianElements.PerifocalToCartesianMatrix = function(argumentOfPeriapsis, inclination, rightAscension) {
        if (inclination < 0 || inclination > CesiumMath.PI)
        {
            throw new DeveloperError('inclination out of range');
        }
        var cosap = Math.cos(argumentOfPeriapsis);
        var sinap = Math.sin(argumentOfPeriapsis);

        var cosi = Math.cos(inclination);
        var sini = Math.sin(inclination);

        var cosraan = Math.cos(rightAscension);
        var sinraan = Math.sin(rightAscension);

        return new Matrix3(
            cosraan * cosap - sinraan * sinap * cosi,
            -cosraan * sinap - sinraan * cosap * cosi,
            sinraan * sini,

            sinraan * cosap + cosraan * sinap * cosi,
            -sinraan * sinap + cosraan * cosap * cosi,
            -cosraan * sini,

            sinap * sini,
            cosap * sini,
            cosi);
    };

    return KeplerianElements;

});
