/*global defineSuite*/
defineSuite([
         'Core/SunPosition',
         'Core/JulianDate',
         'Core/Ellipsoid',
         'Core/Math'
     ], function(
         SunPosition,
         JulianDate,
         Ellipsoid,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    var date1 = new Date('January 15, 2012');
    date1.setUTCHours(12, 0, 0, 0);
    var julianDate1 = JulianDate.fromDate(date1);

    var date2 = new Date('February 15, 2012');
    date2.setUTCHours(12, 0, 0, 0);
    var julianDate2 = JulianDate.fromDate(date2);

    var date3 = new Date('March 3, 2011');
    date3.setUTCHours(12, 0, 0, 0);
    var julianDate3 = JulianDate.fromDate(date3);

    var date4 = new Date('April 15, 2012');
    date4.setUTCHours(12, 0, 0, 0);
    var julianDate4 = JulianDate.fromDate(date4);

    var date5 = new Date('May 15, 2012');
    date5.setUTCHours(12, 0, 0, 0);
    var julianDate5 = JulianDate.fromDate(date5);

    var date6 = new Date('June 22, 2011');
    date6.setUTCHours(16, 0, 0, 0);
    var julianDate6 = JulianDate.fromDate(date6);

    var date7 = new Date('July 6, 2012');
    date7.setUTCHours(12, 0, 0, 0);
    var julianDate7 = JulianDate.fromDate(date7);

    var date8 = new Date('August 29, 2012');
    date8.setUTCHours(12, 0, 0, 0);
    var julianDate8 = JulianDate.fromDate(date8);

    var date9 = new Date('September 22, 2011');
    date9.setUTCHours(2, 0, 0, 0);
    var julianDate9 = JulianDate.fromDate(date9);

    var date10 = new Date('October 1, 2012');
    date10.setUTCHours(12, 0, 0, 0);
    var julianDate10 = JulianDate.fromDate(date10);

    var date11 = new Date('November 24, 2012');
    date11.setUTCHours(12, 0, 0, 0);
    var julianDate11 = JulianDate.fromDate(date11);

    var date12 = new Date('December 3, 2011');
    date12.setUTCHours(21, 0, 0, 0);
    var julianDate12 = JulianDate.fromDate(date12);

    var AU_TO_METERS = 149597870700.0;
    var earthsRadius = 4.2634965 * CesiumMath.EPSILON5 * AU_TO_METERS;

    it('can correctly compute the distance from the earth to the sun (1)', function() {
        var sunPos = SunPosition.compute(julianDate1);
        expect(sunPos.distance).toEqualEpsilon(147148431117.98, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (2)', function() {
        var sunPos = SunPosition.compute(julianDate2);
        expect(sunPos.distance).toEqualEpsilon(147753960797.35, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (3)', function() {
        var sunPos = SunPosition.compute(julianDate3);
        expect(sunPos.distance).toEqualEpsilon(148297002100.02, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (4)', function() {
        var sunPos = SunPosition.compute(julianDate4);
        expect(sunPos.distance).toEqualEpsilon(150111025763.77, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (5)', function() {
        var sunPos = SunPosition.compute(julianDate5);
        expect(sunPos.distance).toEqualEpsilon(151244858657.05, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (6)', function() {
        var sunPos = SunPosition.compute(julianDate6);
        expect(sunPos.distance).toEqualEpsilon(152038567856.43, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (7)', function() {
        var sunPos = SunPosition.compute(julianDate7);
        expect(sunPos.distance).toEqualEpsilon(152091959910.50, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (8)', function() {
        var sunPos = SunPosition.compute(julianDate8);
        expect(sunPos.distance).toEqualEpsilon(151056458099.59, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (9)', function() {
        var sunPos = SunPosition.compute(julianDate9);
        expect(sunPos.distance).toEqualEpsilon(150184436627.52, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (10)', function() {
        var sunPos = SunPosition.compute(julianDate10);
        expect(sunPos.distance).toEqualEpsilon(149744103802.39, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (11)', function() {
        var sunPos = SunPosition.compute(julianDate11);
        expect(sunPos.distance).toEqualEpsilon(147676653136.92, earthsRadius);
    });

    it('can correctly compute the distance from the earth to the sun (12)', function() {
        var sunPos = SunPosition.compute(julianDate12);
        expect(sunPos.distance).toEqualEpsilon(147462128000.55, earthsRadius);
    });

    it('can correctly compute latitude (1)', function() {
        var sunPos = SunPosition.compute(julianDate1);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(-21.18), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (2)', function() {
        var sunPos = SunPosition.compute(julianDate2);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(-12.78), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (3)', function() {
        var sunPos = SunPosition.compute(julianDate3);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(-6.85), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (4)', function() {
        var sunPos = SunPosition.compute(julianDate4);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(10.01), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (5)', function() {
        var sunPos = SunPosition.compute(julianDate5);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(19.03), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (6)', function() {
        var sunPos = SunPosition.compute(julianDate6);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(23.44), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (7)', function() {
        var sunPos = SunPosition.compute(julianDate7);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(22.61), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (8)', function() {
        var sunPos = SunPosition.compute(julianDate8);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(9.11), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (9)', function() {
        var sunPos = SunPosition.compute(julianDate9);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(0.50), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (10)', function() {
        var sunPos = SunPosition.compute(julianDate10);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(-3.45), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (11)', function() {
        var sunPos = SunPosition.compute(julianDate11);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(-20.68), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute latitude (12)', function() {
        var sunPos = SunPosition.compute(julianDate12);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(-22.14), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (1)', function() {
        var sunPos = SunPosition.compute(julianDate1);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(2.30), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (2)', function() {
        var sunPos = SunPosition.compute(julianDate2);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(3.53), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (3)', function() {
        var sunPos = SunPosition.compute(julianDate3);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(3.0), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (4)', function() {
        var sunPos = SunPosition.compute(julianDate4);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-0.02), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (5)', function() {
        var sunPos = SunPosition.compute(julianDate5);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-0.92), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (6)', function() {
        var sunPos = SunPosition.compute(julianDate6);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-59.51), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (7)', function() {
        var sunPos = SunPosition.compute(julianDate7);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(1.21), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (8)', function() {
        var sunPos = SunPosition.compute(julianDate8);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(0.20), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (9)', function() {
        var sunPos = SunPosition.compute(julianDate9);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(148.24), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (10)', function() {
        var sunPos = SunPosition.compute(julianDate10);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-2.62), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (11)', function() {
        var sunPos = SunPosition.compute(julianDate11);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-3.29), CesiumMath.toRadians(1.0));
    });

    it('can correctly compute longitude (12)', function() {
        var sunPos = SunPosition.compute(julianDate12);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-137.55), CesiumMath.toRadians(1.0));
    });

    it('can compute position during a leap year', function() {
        var julianDate = JulianDate.fromDate(new Date('April 1, 2012 16:00:00 UTC'));
        var sunPos = SunPosition.compute(julianDate);
        expect(sunPos.distance).toEqualEpsilon(149517419153.09, earthsRadius);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-59.08), CesiumMath.toRadians(1.0));
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(4.87), CesiumMath.toRadians(1.0));
    });

    it('has matching cartographic and cartesian positions (1)', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sunPos = SunPosition.compute(julianDate6);
        var position = sunPos.position.normalize();
        var cartographicPos = sunPos.cartographicPosition;
        var cartesianPos = ellipsoid.cartographicToCartesian(cartographicPos).normalize();
        expect((cartesianPos).equalsEpsilon(position, CesiumMath.EPSILON2)).toEqual(true);
    });

    it('has matching cartographic and cartesian positions (2)', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sunPos = SunPosition.compute(julianDate3);
        var position = sunPos.position.normalize();
        var cartographicPos = sunPos.cartographicPosition;
        var cartesianPos = ellipsoid.cartographicToCartesian(cartographicPos).normalize();
        expect((cartesianPos).equalsEpsilon(position, CesiumMath.EPSILON2)).toEqual(true);
    });

    it('has matching cartographic and cartesian positions (3)', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sunPos = SunPosition.compute(julianDate3);
        var position = sunPos.position.normalize();
        var cartographicPos = sunPos.cartographicPosition;
        var cartesianPos = ellipsoid.cartographicToCartesian(cartographicPos).normalize();
        expect((cartesianPos).equalsEpsilon(position, CesiumMath.EPSILON2)).toEqual(true);
    });

    it('has matching cartographic and cartesian positions (4)', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sunPos = SunPosition.compute(julianDate12);
        var position = sunPos.position.normalize();
        var cartographicPos = sunPos.cartographicPosition;
        var cartesianPos = ellipsoid.cartographicToCartesian(cartographicPos).normalize();
        expect((cartesianPos).equalsEpsilon(position, CesiumMath.EPSILON2)).toEqual(true);
    });

    it('has the sun rising in the east and setting in the west', function() {
        //Julian dates for 24 hours, starting from July 6th 2011 @ 01:00 UTC
        var timesOfDay = [];
        for ( var i = 1; i < 25; i++) {
            var date = new Date('July 6, 2011');
            date.setUTCHours(i, 0, 0, 0);
            timesOfDay.push(JulianDate.fromDate(date));
        }
        var angles = [];
        for (i = 0; i < 24; i++) {
            var sunPos = SunPosition.compute(timesOfDay[i]);
            var position = sunPos.position;
            angles.push(CesiumMath.convertLongitudeRange(Math.atan2(position.y, position.x)));
        }
        //Expect a clockwise motion.
        for (i = 1; i < 24; i++) {
            expect(angles[i]).toBeLessThan(angles[i - 1]);
        }
    });
});