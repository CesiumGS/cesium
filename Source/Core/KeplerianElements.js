/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian3'],
    function(
        DeveloperError,
        CesiumMath,
        Cartesian3) {
    "use strict";

    var KeplerianElements = {};

    KeplerianElements.MeanAnomalyToTrueAnomaly = function(meanAnomaly, eccentricity) {
        if (eccentricity < 0.0 || eccentricity >= 1.0)
        {
            throw new DeveloperError('eccentricity out of range.');
        }
        var eccentricAnomaly = this.MeanAnomalyToEccentricAnomaly(meanAnomaly, eccentricity);
        return this.EccentricAnomalyToTrueAnomaly(eccentricAnomaly, eccentricity);
    };

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
            //TODO: Port 'DoubleFunctionExplorer'
        }

        eccentricAnomaly = iterationValue + revs * CesiumMath.TWO_PI;
        return eccentricAnomaly;
    };

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

    return KeplerianElements;

});
