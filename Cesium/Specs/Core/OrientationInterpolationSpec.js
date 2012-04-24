defineSuite([
         'Core/OrientationInterpolator',
         'Core/Quaternion',
         'Core/Math'
     ], function(
         OrientationInterpolator,
         Quaternion,
         CesiumMath) {
    "use strict";
    /*global it,expect,beforeEach*/

   var points;
    beforeEach(function() {
        points = [{
            orientation : new Quaternion(0.27116054990302285, -0.885350179519183, 0.035188558098451651, 0.37601699586666631),
            time : 0.0
        }, {
            orientation : new Quaternion(0.26889944029028207, -0.90878407626997149, 0.016358190654748833, 0.31864871461879546),
            time : 10.0
        }, {
            orientation : new Quaternion(0.26535345397905041, -0.92848386989206388, -0.0020331133700619221, 0.25980976552406471),
            time : 20.0
        }, {
            orientation : new Quaternion(0.26056952418800283, -0.94435650802614191, -0.019897791724875168, 0.19974580520647395),
            time : 30.0
        }, {
            orientation : new Quaternion(0.25460046885229015, -0.9563253912753481, -0.037152635039526927, 0.1387084315096456),
            time : 40.0
        }, {
            orientation : new Quaternion(0.24750463007148754, -0.964330741391216, -0.053719198440647778, 0.076954057852319485),
            time : 50.0
        }];
    });

    it("constructor throws an exception with invalid control points", function() {
        expect(function() {
            return new OrientationInterpolator();
        }).toThrow();

        expect(function() {
            return new OrientationInterpolator(1.0);
        }).toThrow();

        expect(function() {
            return new OrientationInterpolator([1.0]);
        }).toThrow();
    });

    it("get control points", function() {
        var oi = new OrientationInterpolator(points);
        expect(oi.getControlPoints()).toEqual(points);
    });

    it("evaluate fails with undefined time", function() {
        var oi = new OrientationInterpolator(points);
        expect(function() {
            oi.evaluate();
        }).toThrow();
    });

    it("evaluate fails with time out of range", function() {
        var oi = new OrientationInterpolator(points);

        expect(function() {
            oi.evaluate(points[0].time - 1.0);
        }).toThrow();

        expect(function() {
            oi.evaluate(points[points.length - 1].time + 1.0);
        }).toThrow();
    });

    it("evaluate can jump around in time", function() {
        var oi = new OrientationInterpolator(points);

        expect(oi.evaluate(points[0].time).equalsEpsilon(points[0].orientation, CesiumMath.EPSILON12)).toBeTruthy();

        // jump forward
        expect(oi.evaluate(points[1].time).equalsEpsilon(points[1].orientation, CesiumMath.EPSILON12)).toBeTruthy();

        // jump backward
        expect(oi.evaluate(points[0].time).equalsEpsilon(points[0].orientation, CesiumMath.EPSILON12)).toBeTruthy();

        // jump far forward
        expect(oi.evaluate(points[points.length - 2].time).equalsEpsilon(points[points.length - 2].orientation, CesiumMath.EPSILON12)).toBeTruthy();

        // jump far back
        expect(oi.evaluate(points[0].time).equalsEpsilon(points[0].orientation, CesiumMath.EPSILON12)).toBeTruthy();
    });

    it("evaluate", function() {
        var oi = new OrientationInterpolator(points);
        var actual = oi.evaluate((points[1].time + points[2].time) * 0.5);
        var expected = points[1].orientation.slerp(0.5, points[2].orientation);
        expect(actual.equals(expected)).toBeTruthy();
    });
});