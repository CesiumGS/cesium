defineSuite([
        'Core/Simon1994PlanetaryPositions',
        'Core/defined',
        'Core/JulianDate',
        'Core/Math',
        'Core/Matrix3',
        'Core/TimeStandard',
        'Core/Transforms'
    ], function(
        PlanetaryPositions,
        defined,
        JulianDate,
        CesiumMath,
        Matrix3,
        TimeStandard,
        Transforms) {
    'use strict';

    // Values for the X Y and Z were found using the STK Components GeometryTransformer on the position of the
    // sun center of mass point and the earth J2000 reference frame.
    it('computes correct sun position', function() {
        var date = new JulianDate(2451545, 0, TimeStandard.TAI);
        var sun = PlanetaryPositions.computeSunPositionInEarthInertialFrame(date);
        var X = 26500268539.790234;
        var Y = -132756447253.27325;
        var Z = -57556483362.533806;
        expect(X).toEqualEpsilon(sun.x, CesiumMath.EPSILON2);
        expect(Y).toEqualEpsilon(sun.y, CesiumMath.EPSILON2);
        expect(Z).toEqualEpsilon(sun.z, CesiumMath.EPSILON2);

        date = new JulianDate(2456401.5, 0, TimeStandard.TAI);
        sun = PlanetaryPositions.computeSunPositionInEarthInertialFrame(date);
        X = 131512388940.33589;
        Y = 66661342667.949928;
        Z = 28897975607.905258;
        expect(X).toEqualEpsilon(sun.x, CesiumMath.EPSILON3);
        expect(Y).toEqualEpsilon(sun.y, CesiumMath.EPSILON3);
        expect(Z).toEqualEpsilon(sun.z, CesiumMath.EPSILON3);

        date = new JulianDate(2455998.591667, 0, TimeStandard.TAI);
        sun = PlanetaryPositions.computeSunPositionInEarthInertialFrame(date);
        X = 147109989956.19534;
        Y = -19599996881.217579;
        Z = -8497578102.7696457;
        expect(X).toEqualEpsilon(sun.x, CesiumMath.EPSILON3);
        expect(Y).toEqualEpsilon(sun.y, CesiumMath.EPSILON3);
        expect(Z).toEqualEpsilon(sun.z, CesiumMath.EPSILON3);
    });

    // Values for X Y and Z were found using the STK Components GeometryTransformer on the Simon 1994 moon point and the earth
    // J2000 reference frame.
    it('computes correct moon position', function() {
        var date = new JulianDate(2451545.0, 0, TimeStandard.TAI);
        var moon = PlanetaryPositions.computeMoonPositionInEarthInertialFrame(date);
        var X = -291632410.61232185;
        var Y = -266522146.36821631;
        var Z = -75994518.081043154;
        expect(X).toEqualEpsilon(moon.x, CesiumMath.EPSILON4);
        expect(Y).toEqualEpsilon(moon.y, CesiumMath.EPSILON4);
        expect(Z).toEqualEpsilon(moon.z, CesiumMath.EPSILON4);

        date = new JulianDate(2456401.5, 0, TimeStandard.TAI);
        moon = PlanetaryPositions.computeMoonPositionInEarthInertialFrame(date);
        X = -223792974.4736526;
        Y = 315772435.34490639;
        Z = 97913011.236112773;
        expect(X).toEqualEpsilon(moon.x, CesiumMath.EPSILON4);
        expect(Y).toEqualEpsilon(moon.y, CesiumMath.EPSILON4);
        expect(Z).toEqualEpsilon(moon.z, CesiumMath.EPSILON4);

        date = new JulianDate(2455998.591667, 0, TimeStandard.TAI);
        moon = PlanetaryPositions.computeMoonPositionInEarthInertialFrame(date);
        X = -268426117.00202647;
        Y = -220468861.73998192;
        Z = -110670164.58446842;
        expect(X).toEqualEpsilon(moon.x, CesiumMath.EPSILON4);
        expect(Y).toEqualEpsilon(moon.y, CesiumMath.EPSILON4);
        expect(Z).toEqualEpsilon(moon.z, CesiumMath.EPSILON4);
    });

    it('has the sun rising in the east and setting in the west', function() {
        //Julian dates for 24 hours, starting from July 6th 2011 @ 01:00 UTC
        var transformMatrix = new Matrix3();
        var timesOfDay = [];
        var i;
        for ( i = 1; i < 25; i++) {
            var date = new Date('July 6, 2011');
            date.setUTCHours(i, 0, 0, 0);
            timesOfDay.push(JulianDate.fromDate(date));
        }
        var angles = [];
        for (i = 0; i < 24; i++) {
            transformMatrix = Transforms.computeIcrfToFixedMatrix(timesOfDay[i], transformMatrix);
            if (!defined(transformMatrix)) {
                transformMatrix = Transforms.computeTemeToPseudoFixedMatrix(timesOfDay[i], transformMatrix);
            }
            var position = PlanetaryPositions.computeSunPositionInEarthInertialFrame(timesOfDay[i]);
            Matrix3.multiplyByVector(transformMatrix, position, position);
            angles.push(CesiumMath.convertLongitudeRange(Math.atan2(position.y, position.x)));
        }
        //Expect a clockwise motion.
        for (i = 1; i < 24; i++) {
            expect(angles[i]).toBeLessThan(angles[i - 1]);
        }
    });

    it('works without a time', function() {
        PlanetaryPositions.computeSunPositionInEarthInertialFrame(undefined);
    });

});
