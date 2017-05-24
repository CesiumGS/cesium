/*global defineSuite*/
defineSuite([
         'Core/BezierSpline',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         BezierSpline,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var points;
    var times;
    var inControlPoints;
    var outControlPoints;

    beforeEach(function() {
        times = [0.0, 1.0, 2.0];
        points = [
            new Cartesian3(0.0, 0.0, 0.0),
            new Cartesian3(3.0, 0.0, 2.0),
            new Cartesian3(7.0, 3.0, 3.0)
        ];
        outControlPoints = [
            new Cartesian3(1.0, 1.0, 1.0),
            new Cartesian3(4.0, 1.0, 3.0)
        ];
        inControlPoints = [
            new Cartesian3(2.0, -1.0, 1.0),
            new Cartesian3(6.0, -1.0, 2.0)
        ];
    });

    it('constructor throws without points, times, or control points', function() {
        expect(function() {
            return new BezierSpline();
        }).toThrowDeveloperError();
    });

    it('constructor throws when control points length is less than 2', function() {
        expect(function() {
            return new BezierSpline({
                points : [Cartesian3.ZERO]
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws when times.length is not equal to points.length', function() {
        expect(function() {
            return new BezierSpline({
                points : points,
                times : [0.0, 1.0]
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws when inControlPoints or outControlPoints length is not equal to points.length - 1', function() {
        expect(function() {
            return new BezierSpline({
                points : points,
                times : times,
                inControlPoints : [Cartesian3.ZERO],
                outControlPoints : [Cartesian3.UNIT_X]
            });
        }).toThrowDeveloperError();
    });

    // returns a function for a bezier curve between points p0 and p1
    // with inner control points c0 and c1 on the interval [0, 1]
    var createBezierBasis = function(p0, c0, c1, p1) {
        return function(u) {
            var a = 1.0 - 3.0 * u + 3.0 * u * u - u * u * u;
            var b = 3.0 * u - 6.0 * u * u + 3.0 * u * u * u;
            var c = 3.0 * u * u - 3.0 * u * u * u;
            var d = u * u * u;

            var q0 = Cartesian3.multiplyByScalar(p0, a);
            var q1 = Cartesian3.multiplyByScalar(c0, b);
            var q2 = Cartesian3.multiplyByScalar(c1, c);
            var q3 = Cartesian3.multiplyByScalar(p1, d);

            return Cartesian3.add(Cartesian3.add(Cartesian3.add(q0, q1), q2), q3);
        };
    };

    it('create spline', function() {
        var bs = new BezierSpline({
            points : points,
            times : times,
            outControlPoints : outControlPoints,
            inControlPoints : inControlPoints
        });

        var p0 = points[0];
        var p1 = points[1];
        var c0 = outControlPoints[0];
        var c1 = inControlPoints[0];
        var interpolate = createBezierBasis(p0, c0, c1, p1);

        var granularity = 0.1;
        for ( var i = 0.0; i < 1.0; i = i + granularity) {
            expect(bs.evaluate(i)).toEqualEpsilon(interpolate(i), CesiumMath.EPSILON3);
        }
    });

    it('evaluate fails with undefined time', function() {
        var bs = new BezierSpline({
            points : points,
            times : times,
            outControlPoints : outControlPoints,
            inControlPoints : inControlPoints
        });
        expect(function() {
            bs.evaluate();
        }).toThrowDeveloperError();
    });

    it('evaluate fails with time out of range', function() {
        var bs = new BezierSpline({
            points : points,
            times : times,
            outControlPoints : outControlPoints,
            inControlPoints : inControlPoints
        });
        expect(function() {
            bs.evaluate(times[0] - 1.0);
        }).toThrowDeveloperError();
    });

    it('evaluate with result parameter', function() {
        var bs = new BezierSpline({
            points : points,
            times : times,
            outControlPoints : outControlPoints,
            inControlPoints : inControlPoints
        });
        var result = new Cartesian3();
        var point = bs.evaluate(times[0], result);
        expect(point).toBe(result);
        expect(result).toEqual(points[0]);
    });
});
