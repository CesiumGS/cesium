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

    var date1 = new Date("June 22, 2011"); // June 22, 2011 at 16:00 UT
    date1.setUTCHours(16, 0, 0, 0); // 2455735.1666667;
    var julianDate1 = JulianDate.fromDate(date1);

    var date2 = new Date("March 3, 2011"); // March 3, 2011 at 12:00 UT
    date2.setUTCHours(12, 0, 0, 0); // 2455624.0
    var julianDate2 = JulianDate.fromDate(date2);

    var date3 = new Date("September 22, 2011"); // Sept 22, 2011 at 02:00 UT
    date3.setUTCHours(2, 0, 0, 0); // 2455826.5833333;
    var julianDate3 = JulianDate.fromDate(date3);

    var date4 = new Date("December 3, 2011"); // Dec. 3, 2011 at 21:00 UT
    date4.setUTCHours(21, 0, 0, 0); // 2455899.375;
    var julianDate4 = JulianDate.fromDate(date4);

    var AU_TO_METERS = 149597870700.0;
    var earthsRadius = 4.2634965 * CesiumMath.EPSILON5 * AU_TO_METERS;

    it("can correctly compute the distance from the earth to the sun (1)", function() {
        var sunPos = SunPosition.compute(julianDate1);
        expect(sunPos.distance).toEqualEpsilon(152038567856.43, earthsRadius);
    });

    it("can correctly compute the distance from the earth to the sun (2)", function() {
        var sunPos = SunPosition.compute(julianDate2);
        expect(sunPos.distance).toEqualEpsilon(148297002100.02, earthsRadius);
    });

    it("can correctly compute the distance from the earth to the sun (3)", function() {
        var sunPos = SunPosition.compute(julianDate3);
        expect(sunPos.distance).toEqualEpsilon(150184436627.52, earthsRadius);
    });

    it("can correctly compute the distance from the earth to the sun (4)", function() {
        var sunPos = SunPosition.compute(julianDate4);
        expect(sunPos.distance).toEqualEpsilon(147462128000.55, earthsRadius);
    });

    it("can correctly compute the sun's latitude (1)", function() {
        var sunPos = SunPosition.compute(julianDate1);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(23.44), CesiumMath.toRadians(1.0));
    });

    it("can correctly compute the sun's latitude (2)", function() {
        var sunPos = SunPosition.compute(julianDate2);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(-6.85), CesiumMath.toRadians(1.0));
    });

    it("can correctly compute the sun's latitude (3)", function() {
        var sunPos = SunPosition.compute(julianDate3);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(0.50), CesiumMath.toRadians(1.0));
    });

    it("can correctly compute the sun's latitude (4)", function() {
        var sunPos = SunPosition.compute(julianDate4);
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(-22.14), CesiumMath.toRadians(1.0));
    });

    it("can correctly compute the sun's longitude (1)", function() {
        var sunPos = SunPosition.compute(julianDate1);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-59.51), CesiumMath.toRadians(1.0));
    });

    it("can correctly compute the sun's longitude (2)", function() {
        var sunPos = SunPosition.compute(julianDate2);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(3.0), CesiumMath.toRadians(1.0));
    });

    it("can correctly compute the sun's longitude (3)", function() {
        var sunPos = SunPosition.compute(julianDate3);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(148.24), CesiumMath.toRadians(1.0));
    });

    it("can correctly compute the sun's longitude (4)", function() {
        var sunPos = SunPosition.compute(julianDate4);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-137.55), CesiumMath.toRadians(1.0));
    });

    it("can compute the sun's position during a leap year", function() {
        var julianDate = JulianDate.fromDate(new Date("April 1, 2012 16:00:00 UTC"));
        var sunPos = SunPosition.compute(julianDate);
        expect(sunPos.distance).toEqualEpsilon(149517419153.09, earthsRadius);
        expect(sunPos.cartographicPosition.longitude).toEqualEpsilon(CesiumMath.toRadians(-59.08), CesiumMath.toRadians(1.0));
        expect(sunPos.cartographicPosition.latitude).toEqualEpsilon(CesiumMath.toRadians(4.87), CesiumMath.toRadians(1.0));
    });

    it("has matching cartographic and cartesian positions (1)", function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sunPos = SunPosition.compute(julianDate1);
        var position = sunPos.position.normalize();
        var cartographicPos = sunPos.cartographicPosition;
        var cartesianPos = ellipsoid.toCartesian(cartographicPos).normalize();
        expect((cartesianPos).equalsEpsilon(position, CesiumMath.EPSILON2)).toBeTruthy();
    });

    it("has matching cartographic and cartesian positions (2)", function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sunPos = SunPosition.compute(julianDate2);
        var position = sunPos.position.normalize();
        var cartographicPos = sunPos.cartographicPosition;
        var cartesianPos = ellipsoid.toCartesian(cartographicPos).normalize();
        expect((cartesianPos).equalsEpsilon(position, CesiumMath.EPSILON2)).toBeTruthy();
    });

    it("has matching cartographic and cartesian positions (3)", function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sunPos = SunPosition.compute(julianDate3);
        var position = sunPos.position.normalize();
        var cartographicPos = sunPos.cartographicPosition;
        var cartesianPos = ellipsoid.toCartesian(cartographicPos).normalize();
        expect((cartesianPos).equalsEpsilon(position, CesiumMath.EPSILON2)).toBeTruthy();
    });

    it("has matching cartographic and cartesian positions (4)", function() {
        var ellipsoid = Ellipsoid.WGS84;
        var sunPos = SunPosition.compute(julianDate4);
        var position = sunPos.position.normalize();
        var cartographicPos = sunPos.cartographicPosition;
        var cartesianPos = ellipsoid.toCartesian(cartographicPos).normalize();
        expect((cartesianPos).equalsEpsilon(position, CesiumMath.EPSILON2)).toBeTruthy();
    });

    it("has the sun rising in the east and setting in the west", function() {
        //Julian dates for 24 hours, starting from July 6th 2011 @ 01:00 UTC
        var timesOfDay = [];
        for ( var i = 1; i < 25; i++) {
            var date = new Date("July 6, 2011");
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