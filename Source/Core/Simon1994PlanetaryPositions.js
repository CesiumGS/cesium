/*global define*/
define([
        './Cartesian3',
        './defined',
        './DeveloperError',
        './JulianDate',
        './Math',
        './Matrix3',
        './TimeConstants',
        './TimeStandard'
    ], function(
        Cartesian3,
        defined,
        DeveloperError,
        JulianDate,
        CesiumMath,
        Matrix3,
        TimeConstants,
        TimeStandard) {
    "use strict";

    /**
     * Contains functions for finding the Cartesian coordinates of the sun and the moon in the
     * Earth-centered inertial frame.
     *
     * @namespace
     * @alias Simon1994PlanetaryPositions
     */
    var Simon1994PlanetaryPositions = {};

    function computeTdbMinusTtSpice(daysSinceJ2000InTerrestrialTime) {
        /* STK Comments ------------------------------------------------------
         * This function uses constants designed to be consistent with
         * the SPICE Toolkit from JPL version N0051 (unitim.c)
         * M0 = 6.239996
         * M0Dot = 1.99096871e-7 rad/s = 0.01720197 rad/d
         * EARTH_ECC = 1.671e-2
         * TDB_AMPL = 1.657e-3 secs
         *--------------------------------------------------------------------*/

        //* Values taken as specified in STK Comments except: 0.01720197 rad/day = 1.99096871e-7 rad/sec
        //* Here we use the more precise value taken from the SPICE value 1.99096871e-7 rad/sec converted to rad/day
        //* All other constants are consistent with the SPICE implementation of the TDB conversion
        //* except where we treat the independent time parameter to be in TT instead of TDB.
        //* This is an approximation made to facilitate performance due to the higher prevalance of
        //* the TT2TDB conversion over TDB2TT in order to avoid having to iterate when converting to TDB for the JPL ephemeris.
        //* Days are used instead of seconds to provide a slight improvement in numerical precision.

        //* For more information see:
        //* http://www.cv.nrao.edu/~rfisher/Ephemerides/times.html#TDB
        //* ftp://ssd.jpl.nasa.gov/pub/eph/planets/ioms/ExplSupplChap8.pdf

        var g = 6.239996 + (0.0172019696544) * daysSinceJ2000InTerrestrialTime;
        return 1.657e-3 * Math.sin(g + 1.671e-2 * Math.sin(g));
    }

    var TdtMinusTai = 32.184;
    var J2000d = 2451545;
    function taiToTdb(date, result) {
        //Converts TAI to TT
        result = JulianDate.addSeconds(date, TdtMinusTai, result);

        //Converts TT to TDB
        var days = JulianDate.totalDays(result) - J2000d;
        result = JulianDate.addSeconds(result, computeTdbMinusTtSpice(days), result);

        return result;
    }

    var epoch = new JulianDate(2451545, 0, TimeStandard.TAI); //Actually TDB (not TAI)
    var GravitationalParameterOfEarth = 3.98600435e14;
    var GravitationalParameterOfSun = GravitationalParameterOfEarth * (1.0 + 0.012300034) * 328900.56;
    var MetersPerKilometer = 1000.0;
    var RadiansPerDegree = CesiumMath.RADIANS_PER_DEGREE;
    var RadiansPerArcSecond = CesiumMath.RADIANS_PER_ARCSECOND;
    var MetersPerAstronomicalUnit = 1.49597870e+11; // IAU 1976 value

    var perifocalToEquatorial = new Matrix3();
    function elementsToCartesian(semimajorAxis, eccentricity, inclination, longitudeOfPerigee, longitudeOfNode, meanLongitude, gravitationalParameter, result) {
        if (inclination < 0.0) {
            inclination = -inclination;
            longitudeOfNode += CesiumMath.PI;
        }
        if (inclination < 0 || inclination > CesiumMath.PI) {
            throw new DeveloperError('The inclination is out of range. Inclination must be greater than or equal to zero and less than or equal to Pi radians.');
        }

        var radiusOfPeriapsis = semimajorAxis * (1.0 - eccentricity);
        var argumentOfPeriapsis = longitudeOfPerigee - longitudeOfNode;
        var rightAscensionOfAscendingNode = longitudeOfNode;
        var trueAnomaly = meanAnomalyToTrueAnomaly(meanLongitude - longitudeOfPerigee, eccentricity);
        var type = chooseOrbit(eccentricity, 0.0);
        if (type === 'Hyperbolic' && Math.abs(CesiumMath.negativePiToPi(trueAnomaly)) >= Math.acos(- 1.0 / eccentricity)) {
            throw new DeveloperError('The true anomaly of the hyperbolic orbit lies outside of the bounds of the hyperbola.');
        }
        perifocalToCartesianMatrix(argumentOfPeriapsis, inclination, rightAscensionOfAscendingNode, perifocalToEquatorial);
        var semilatus = radiusOfPeriapsis * (1.0 + eccentricity);
        var costheta = Math.cos(trueAnomaly);
        var sintheta = Math.sin(trueAnomaly);

        var denom = (1.0 + eccentricity * costheta);
        if (denom <= CesiumMath.Epsilon10) {
            throw new DeveloperError('elements cannot be converted to cartesian');
        }

        var radius = semilatus / denom;
        if (!defined(result)) {
            result = new Cartesian3(radius * costheta, radius * sintheta, 0.0);
        } else {
            result.x = radius * costheta;
            result.y = radius * sintheta;
            result.z = 0.0;
        }

        return Matrix3.multiplyByVector(perifocalToEquatorial, result, result);
    }

    function chooseOrbit(eccentricity, tolerance) {
        if (eccentricity < 0) {
            throw new DeveloperError('eccentricity cannot be negative.');
        } else if (eccentricity <= tolerance) {
            return 'Circular';
        } else if (eccentricity < 1.0 - tolerance) {
            return 'Elliptical';
        } else if (eccentricity <= 1.0 + tolerance) {
            return 'Parabolic';
        } else {
            return 'Hyperbolic';
        }
    }

    // Calculates the true anomaly given the mean anomaly and the eccentricity.
    function meanAnomalyToTrueAnomaly(meanAnomaly, eccentricity) {
        if (eccentricity < 0.0 || eccentricity >= 1.0) {
            throw new DeveloperError('eccentricity out of range.');
        }
        var eccentricAnomaly = meanAnomalyToEccentricAnomaly(meanAnomaly, eccentricity);
        return eccentricAnomalyToTrueAnomaly(eccentricAnomaly, eccentricity);
    }

    var maxIterationCount = 50;
    var keplerEqConvergence = CesiumMath.EPSILON8;
    // Calculates the eccentric anomaly given the mean anomaly and the eccentricity.
    function meanAnomalyToEccentricAnomaly(meanAnomaly, eccentricity) {
        if (eccentricity < 0.0 || eccentricity >= 1.0) {
            throw new DeveloperError('eccentricity out of range.');
        }
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
            // STK Components uses a numerical method to find the eccentric anomaly in the case that Kepler's
            // equation does not converge. We don't expect that to ever be necessary for the reasonable orbits used here.
        }

        eccentricAnomaly = iterationValue + revs * CesiumMath.TWO_PI;
        return eccentricAnomaly;
    }

     // Calculates the true anomaly given the eccentric anomaly and the eccentricity.
    function eccentricAnomalyToTrueAnomaly(eccentricAnomaly, eccentricity) {
        if (eccentricity < 0.0 || eccentricity >= 1.0) {
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
    }

     // Calculates the transformation matrix to convert from the perifocal (PQW) coordinate
     // system to inertial cartesian coordinates.
    function perifocalToCartesianMatrix(argumentOfPeriapsis, inclination, rightAscension, result) {
        if (inclination < 0 || inclination > CesiumMath.PI) {
            throw new DeveloperError('inclination out of range');
        }
        var cosap = Math.cos(argumentOfPeriapsis);
        var sinap = Math.sin(argumentOfPeriapsis);

        var cosi = Math.cos(inclination);
        var sini = Math.sin(inclination);

        var cosraan = Math.cos(rightAscension);
        var sinraan = Math.sin(rightAscension);
        if (!defined(result)) {
            result = new Matrix3(
                    cosraan * cosap - sinraan * sinap * cosi,
                    -cosraan * sinap - sinraan * cosap * cosi,
                    sinraan * sini,

                    sinraan * cosap + cosraan * sinap * cosi,
                    -sinraan * sinap + cosraan * cosap * cosi,
                    -cosraan * sini,

                    sinap * sini,
                    cosap * sini,
                    cosi);
        } else {
            result[0] = cosraan * cosap - sinraan * sinap * cosi;
            result[1] = sinraan * cosap + cosraan * sinap * cosi;
            result[2] = sinap * sini;
            result[3] = -cosraan * sinap - sinraan * cosap * cosi;
            result[4] = -sinraan * sinap + cosraan * cosap * cosi;
            result[5] = cosap * sini;
            result[6] = sinraan * sini;
            result[7] = -cosraan * sini;
            result[8] = cosi;
        }
        return result;
    }

    // From section 5.8
    var semiMajorAxis0 = 1.0000010178 * MetersPerAstronomicalUnit;
    var meanLongitude0 = 100.46645683 * RadiansPerDegree;
    var meanLongitude1 = 1295977422.83429 * RadiansPerArcSecond;

    // From table 6
    var p1u = 16002;
    var p2u = 21863;
    var p3u = 32004;
    var p4u = 10931;
    var p5u = 14529;
    var p6u = 16368;
    var p7u = 15318;
    var p8u = 32794;

    var Ca1 = 64 * 1e-7 * MetersPerAstronomicalUnit;
    var Ca2 = -152 * 1e-7 * MetersPerAstronomicalUnit;
    var Ca3 = 62 * 1e-7 * MetersPerAstronomicalUnit;
    var Ca4 = -8 * 1e-7 * MetersPerAstronomicalUnit;
    var Ca5 = 32 * 1e-7 * MetersPerAstronomicalUnit;
    var Ca6 = -41 * 1e-7 * MetersPerAstronomicalUnit;
    var Ca7 = 19 * 1e-7 * MetersPerAstronomicalUnit;
    var Ca8 = -11 * 1e-7 * MetersPerAstronomicalUnit;

    var Sa1 = -150 * 1e-7 * MetersPerAstronomicalUnit;
    var Sa2 = -46 * 1e-7 * MetersPerAstronomicalUnit;
    var Sa3 = 68 * 1e-7 * MetersPerAstronomicalUnit;
    var Sa4 = 54 * 1e-7 * MetersPerAstronomicalUnit;
    var Sa5 = 14 * 1e-7 * MetersPerAstronomicalUnit;
    var Sa6 = 24 * 1e-7 * MetersPerAstronomicalUnit;
    var Sa7 = -28 * 1e-7 * MetersPerAstronomicalUnit;
    var Sa8 = 22 * 1e-7 * MetersPerAstronomicalUnit;

    var q1u = 10;
    var q2u = 16002;
    var q3u = 21863;
    var q4u = 10931;
    var q5u = 1473;
    var q6u = 32004;
    var q7u = 4387;
    var q8u = 73;

    var Cl1 = -325 * 1e-7;
    var Cl2 = -322 * 1e-7;
    var Cl3 = -79 * 1e-7;
    var Cl4 = 232 * 1e-7;
    var Cl5 = -52 * 1e-7;
    var Cl6 = 97 * 1e-7;
    var Cl7 = 55 * 1e-7;
    var Cl8 = -41 * 1e-7;

    var Sl1 = -105 * 1e-7;
    var Sl2 = -137 * 1e-7;
    var Sl3 = 258 * 1e-7;
    var Sl4 = 35 * 1e-7;
    var Sl5 = -116 * 1e-7;
    var Sl6 = -88 * 1e-7;
    var Sl7 = -112 * 1e-7;
    var Sl8 = -80 * 1e-7;

    var scratchDate = new JulianDate(0, 0.0, TimeStandard.TAI);
    /**
     * Gets a point describing the motion of the Earth-Moon barycenter according to the equations
     * described in section 6.
     */

    function computeSimonEarthMoonBarycenter(date, result) {

        // t is thousands of years from J2000 TDB
        taiToTdb(date, scratchDate);
        var x = (scratchDate.dayNumber - epoch.dayNumber) + ((scratchDate.secondsOfDay - epoch.secondsOfDay)/TimeConstants.SECONDS_PER_DAY);
        var t = x / (TimeConstants.DAYS_PER_JULIAN_CENTURY * 10.0);

        var u = 0.35953620 * t;
        var semimajorAxis = semiMajorAxis0 +
                            Ca1 * Math.cos(p1u * u) + Sa1 * Math.sin(p1u * u) +
                            Ca2 * Math.cos(p2u * u) + Sa2 * Math.sin(p2u * u) +
                            Ca3 * Math.cos(p3u * u) + Sa3 * Math.sin(p3u * u) +
                            Ca4 * Math.cos(p4u * u) + Sa4 * Math.sin(p4u * u) +
                            Ca5 * Math.cos(p5u * u) + Sa5 * Math.sin(p5u * u) +
                            Ca6 * Math.cos(p6u * u) + Sa6 * Math.sin(p6u * u) +
                            Ca7 * Math.cos(p7u * u) + Sa7 * Math.sin(p7u * u) +
                            Ca8 * Math.cos(p8u * u) + Sa8 * Math.sin(p8u * u);
        var meanLongitude = meanLongitude0 + meanLongitude1 * t +
                            Cl1 * Math.cos(q1u * u) + Sl1 * Math.sin(q1u * u) +
                            Cl2 * Math.cos(q2u * u) + Sl2 * Math.sin(q2u * u) +
                            Cl3 * Math.cos(q3u * u) + Sl3 * Math.sin(q3u * u) +
                            Cl4 * Math.cos(q4u * u) + Sl4 * Math.sin(q4u * u) +
                            Cl5 * Math.cos(q5u * u) + Sl5 * Math.sin(q5u * u) +
                            Cl6 * Math.cos(q6u * u) + Sl6 * Math.sin(q6u * u) +
                            Cl7 * Math.cos(q7u * u) + Sl7 * Math.sin(q7u * u) +
                            Cl8 * Math.cos(q8u * u) + Sl8 * Math.sin(q8u * u);

        // All constants in this part are from section 5.8
        var eccentricity = 0.0167086342 - 0.0004203654 * t;
        var longitudeOfPerigee = 102.93734808 * RadiansPerDegree + 11612.35290 * RadiansPerArcSecond * t;
        var inclination = 469.97289 * RadiansPerArcSecond * t;
        var longitudeOfNode = 174.87317577 * RadiansPerDegree - 8679.27034 * RadiansPerArcSecond * t;

        return elementsToCartesian(semimajorAxis, eccentricity, inclination, longitudeOfPerigee,
                longitudeOfNode, meanLongitude, GravitationalParameterOfSun, result);
    }

    /**
     * Gets a point describing the position of the moon according to the equations described in section 4.
     */
    function computeSimonMoon(date, result) {
        taiToTdb(date, scratchDate);
        var x = (scratchDate.dayNumber - epoch.dayNumber) + ((scratchDate.secondsOfDay - epoch.secondsOfDay)/TimeConstants.SECONDS_PER_DAY);
        var t = x / (TimeConstants.DAYS_PER_JULIAN_CENTURY);
        var t2 = t * t;
        var t3 = t2 * t;
        var t4 = t3 * t;

        // Terms from section 3.4 (b.1)
        var semimajorAxis = 383397.7725 + 0.0040 * t;
        var eccentricity = 0.055545526 - 0.000000016 * t;
        var inclinationConstant = 5.15668983 * RadiansPerDegree;
        var inclinationSecPart = -0.00008 * t + 0.02966 * t2 -
                                  0.000042 * t3 - 0.00000013 * t4;
        var longitudeOfPerigeeConstant = 83.35324312 * RadiansPerDegree;
        var longitudeOfPerigeeSecPart = 14643420.2669 * t - 38.2702 * t2 -
                                        0.045047 * t3 + 0.00021301 * t4;
        var longitudeOfNodeConstant = 125.04455501 * RadiansPerDegree;
        var longitudeOfNodeSecPart = -6967919.3631 * t + 6.3602 * t2 +
                                      0.007625 * t3 - 0.00003586 * t4;
        var meanLongitudeConstant = 218.31664563 * RadiansPerDegree;
        var meanLongitudeSecPart = 1732559343.48470 * t - 6.3910 * t2 +
                                   0.006588 * t3 - 0.00003169 * t4;

        // Delaunay arguments from section 3.5 b
        var D = 297.85019547 * RadiansPerDegree + RadiansPerArcSecond *
                    (1602961601.2090 * t - 6.3706 * t2 + 0.006593 * t3 - 0.00003169 * t4);
        var F = 93.27209062 * RadiansPerDegree + RadiansPerArcSecond *
                    (1739527262.8478 * t - 12.7512 * t2 - 0.001037 * t3 + 0.00000417 * t4);
        var l = 134.96340251 * RadiansPerDegree + RadiansPerArcSecond *
                    (1717915923.2178 * t + 31.8792 * t2 + 0.051635 * t3 - 0.00024470 * t4);
        var lprime = 357.52910918 * RadiansPerDegree + RadiansPerArcSecond *
                    (129596581.0481 * t - 0.5532 * t2 + 0.000136 * t3 - 0.00001149 * t4);
        var psi = 310.17137918 * RadiansPerDegree - RadiansPerArcSecond *
                    (6967051.4360 * t + 6.2068 * t2 + 0.007618 * t3 - 0.00003219 * t4);

        // Add terms from Table 4
        var twoD = 2.0 * D;
        var fourD = 4.0 * D;
        var sixD = 6.0 * D;
        var twol = 2.0 * l;
        var threel = 3.0 * l;
        var fourl = 4.0 * l;
        var twoF = 2.0 * F;
        semimajorAxis += 3400.4 * Math.cos(twoD) - 635.6 * Math.cos(twoD - l) -
                         235.6 * Math.cos(l) + 218.1 * Math.cos(twoD - lprime) +
                         181.0 * Math.cos(twoD + l);
        eccentricity += 0.014216 * Math.cos(twoD - l) + 0.008551 * Math.cos(twoD - twol) -
                        0.001383 * Math.cos(l) + 0.001356 * Math.cos(twoD + l) -
                        0.001147 * Math.cos(fourD - threel) - 0.000914 * Math.cos(fourD - twol) +
                        0.000869 * Math.cos(twoD - lprime - l) - 0.000627 * Math.cos(twoD) -
                        0.000394 * Math.cos(fourD - fourl) + 0.000282 * Math.cos(twoD - lprime - twol) -
                        0.000279 * Math.cos(D - l) - 0.000236 * Math.cos(twol) +
                        0.000231 * Math.cos(fourD) + 0.000229 * Math.cos(sixD - fourl) -
                        0.000201 * Math.cos(twol - twoF);
        inclinationSecPart += 486.26 * Math.cos(twoD - twoF) - 40.13 * Math.cos(twoD) +
                              37.51 * Math.cos(twoF) + 25.73 * Math.cos(twol - twoF) +
                              19.97 * Math.cos(twoD - lprime - twoF);
        longitudeOfPerigeeSecPart += -55609 * Math.sin(twoD - l) - 34711 * Math.sin(twoD - twol) -
                                      9792 * Math.sin(l) + 9385 * Math.sin(fourD - threel) +
                                      7505 * Math.sin(fourD - twol) + 5318 * Math.sin(twoD + l) +
                                      3484 * Math.sin(fourD - fourl) - 3417 * Math.sin(twoD - lprime - l) -
                                      2530 * Math.sin(sixD - fourl) - 2376 * Math.sin(twoD) -
                                      2075 * Math.sin(twoD - threel) - 1883 * Math.sin(twol) -
                                      1736 * Math.sin(sixD - 5.0 * l) + 1626 * Math.sin(lprime) -
                                      1370 * Math.sin(sixD - threel);
        longitudeOfNodeSecPart += -5392 * Math.sin(twoD - twoF) - 540 * Math.sin(lprime) -
                                  441 * Math.sin(twoD) + 423 * Math.sin(twoF) -
                                  288 * Math.sin(twol - twoF);
        meanLongitudeSecPart += -3332.9 * Math.sin(twoD) + 1197.4 * Math.sin(twoD - l) -
                                662.5 * Math.sin(lprime) + 396.3 * Math.sin(l) -
                                218.0 * Math.sin(twoD - lprime);

        // Add terms from Table 5
        var twoPsi = 2.0 * psi;
        var threePsi = 3.0 * psi;
        inclinationSecPart += 46.997 * Math.cos(psi) * t - 0.614 * Math.cos(twoD - twoF + psi) * t +
                              0.614 * Math.cos(twoD - twoF - psi) * t - 0.0297 * Math.cos(twoPsi) * t2 -
                              0.0335 * Math.cos(psi) * t2 + 0.0012 * Math.cos(twoD - twoF + twoPsi) * t2 -
                              0.00016 * Math.cos(psi) * t3 + 0.00004 * Math.cos(threePsi) * t3 +
                              0.00004 * Math.cos(twoPsi) * t3;
        var perigeeAndMean = 2.116 * Math.sin(psi) * t - 0.111 * Math.sin(twoD - twoF - psi) * t -
                                0.0015 * Math.sin(psi) * t2;
        longitudeOfPerigeeSecPart += perigeeAndMean;
        meanLongitudeSecPart += perigeeAndMean;
        longitudeOfNodeSecPart += -520.77 * Math.sin(psi) * t + 13.66 * Math.sin(twoD - twoF + psi) * t +
                                  1.12 * Math.sin(twoD - psi) * t - 1.06 * Math.sin(twoF - psi) * t +
                                  0.660 * Math.sin(twoPsi) * t2 + 0.371 * Math.sin(psi) * t2 -
                                  0.035 * Math.sin(twoD - twoF + twoPsi) * t2 - 0.015 * Math.sin(twoD - twoF + psi) * t2 +
                                  0.0014 * Math.sin(psi) * t3 - 0.0011 * Math.sin(threePsi) * t3 -
                                  0.0009 * Math.sin(twoPsi) * t3;

        // Add constants and convert units
        semimajorAxis *= MetersPerKilometer;
        var inclination = inclinationConstant + inclinationSecPart * RadiansPerArcSecond;
        var longitudeOfPerigee = longitudeOfPerigeeConstant + longitudeOfPerigeeSecPart * RadiansPerArcSecond;
        var meanLongitude = meanLongitudeConstant + meanLongitudeSecPart * RadiansPerArcSecond;
        var longitudeOfNode = longitudeOfNodeConstant + longitudeOfNodeSecPart * RadiansPerArcSecond;

        return elementsToCartesian(semimajorAxis, eccentricity, inclination, longitudeOfPerigee,
                                   longitudeOfNode, meanLongitude, GravitationalParameterOfEarth, result);
    }

    /**
     * Gets a point describing the motion of the Earth.  This point uses the Moon point and
     * the 1992 mu value (ratio between Moon and Earth masses) in Table 2 of the paper in order
     * to determine the position of the Earth relative to the Earth-Moon barycenter.
     */
    var moonEarthMassRatio = 0.012300034; // From 1992 mu value in Table 2
    var factor = moonEarthMassRatio / (moonEarthMassRatio + 1.0) * -1;
    function computeSimonEarth(date, result) {
        result = computeSimonMoon(date, result);
        return Cartesian3.multiplyByScalar(result, factor, result);
    }

    // Values for the <code>axesTransformation</code> needed for the rotation were found using the STK Components
    // GreographicTransformer on the position of the sun center of mass point and the earth J2000 frame.

    var axesTransformation = new Matrix3(1.0000000000000002, 5.619723173785822e-16, 4.690511510146299e-19,
            -5.154129427414611e-16, 0.9174820620691819, -0.39777715593191376,
             -2.23970096136568e-16, 0.39777715593191376, 0.9174820620691819);
    var translation = new Cartesian3();
    /**
     * Computes the position of the Sun in the Earth-centered inertial frame
     *
     * @param {JulianDate} [julianDate] The time at which to compute the Sun's position, if not provided the current system time is used.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} Calculated sun position
     */
    Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame= function(date, result){
        if (!defined(date)) {
            date = JulianDate.now();
        }

        if (!defined(result)) {
            result = new Cartesian3();
        }

        //first forward transformation
        translation = computeSimonEarthMoonBarycenter(date, translation);
        result = Cartesian3.negate(translation, result);

        //second forward transformation
        computeSimonEarth(date, translation);

        Cartesian3.subtract(result, translation, result);
        Matrix3.multiplyByVector(axesTransformation, result, result);

        return result;
    };

    /**
     * Computes the position of the Moon in the Earth-centered inertial frame
     *
     * @param {JulianDate} [julianDate] The time at which to compute the Sun's position, if not provided the current system time is used.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} Calculated moon position
     */
    Simon1994PlanetaryPositions.computeMoonPositionInEarthInertialFrame = function(date, result){
        if (!defined(date)) {
            date = JulianDate.now();
        }

        result = computeSimonMoon(date, result);
        Matrix3.multiplyByVector(axesTransformation, result, result);

        return result;
    };

    return Simon1994PlanetaryPositions;
});
