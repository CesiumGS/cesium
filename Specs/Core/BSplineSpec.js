/*global defineSuite*/
defineSuite([
         'Core/BSpline',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         BSpline,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var points;
    var times;

    beforeEach(function() {
        times = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
        points = [
            new Cartesian3(0.0, 0.0, 0.0),
            new Cartesian3(1.0, 1.0, 1.0),
            new Cartesian3(2.0, -1.0, 1.0),
            new Cartesian3(3.0, 0.0, 2.0),
            new Cartesian3(4.0, 1.0, 3.0),
            new Cartesian3(6.0, -1.0, 2.0),
            new Cartesian3(7.0, 3.0, 3.0)
        ];
    });

    it('constructor throws without points or times', function() {
        expect(function() {
            return new BSpline();
        }).toThrowDeveloperError();
    });

    it('constructor throws when control points length is less than 2', function() {
        expect(function() {
            return new BSpline({
                points : [Cartesian3.ZERO]
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws when times.length is not equal to points.length', function() {
        expect(function() {
            return new BSpline({
                points : points,
                times : [0.0, 1.0]
            });
        }).toThrowDeveloperError();
    });

    // returns a function for a b-spline curve between points p0 and p1
    // on the interval [0, 1]
    var createBasis = function(p0, p1, p2, p3) {
        return function(u) {
            var a = (1.0 - 3.0 * u + 3.0 * u * u - u * u * u) / 6.0;
            var b = (4.0 - 6.0 * u * u + 3.0 * u * u * u) / 6.0;
            var c = (1.0 + 3.0 * u + 3.0 * u * u - 3.0 * u * u * u) / 6.0;
            var d = (u * u * u) / 6.0;

            var q0 = Cartesian3.multiplyByScalar(p0, a);
            var q1 = Cartesian3.multiplyByScalar(p1, b);
            var q2 = Cartesian3.multiplyByScalar(p2, c);
            var q3 = Cartesian3.multiplyByScalar(p3, d);

            return Cartesian3.add(Cartesian3.add(Cartesian3.add(q0, q1), q2), q3);
        };
    };

    it('create spline', function() {
        var bs = new BSpline({
            points : points,
            times : times
        });

        var interpolate = createBasis(points[0], points[1], points[2], points[3]);

        var offset = times[1];
        var granularity = 0.1;
        for ( var i = 0.0; i < 1.0; i = i + granularity) {
            expect(bs.evaluate(offset + i)).toEqualEpsilon(interpolate(i), CesiumMath.EPSILON3);
        }
    });

    it('evaluate fails with undefined time', function() {
        var bs = new BSpline({
            points : points,
            times : times
        });
        expect(function() {
            bs.evaluate();
        }).toThrowDeveloperError();
    });

    it('evaluate fails with time out of range', function() {
        var bs = new BSpline({
            points : points,
            times : times
        });
        expect(function() {
            bs.evaluate(times[0] - 1.0);
        }).toThrowDeveloperError();
    });

    it('evaluate with result parameter', function() {
        var bs = new BSpline({
            points : points,
            times : times
        });
        var result = new Cartesian3();
        var point = bs.evaluate(times[0], result);
        expect(point).toBe(result);
        expect(result).toEqual(points[0]);
    });

    it('spline with 2 control points defaults to lerp', function() {
        points = points.slice(0, 2);
        times = times.slice(0, 2);

        var bs = new BSpline({
            points : points,
            times : times
        });

        var t = (times[0] + times[1]) * 0.5;
        expect(bs.evaluate(t)).toEqual(Cartesian3.lerp(points[0], points[1], t));
    });

    it('spline with 2 control points defaults to lerp and result parameter', function() {
        points = points.slice(0, 2);
        times = times.slice(0, 2);

        var bs = new BSpline({
            points : points,
            times : times
        });

        var t = (times[0] + times[1]) * 0.5;
        var result = new Cartesian3();
        var actual = bs.evaluate(t, result);
        expect(actual).toBe(result);
        expect(actual).toEqual(Cartesian3.lerp(points[0], points[1], t));
    });
});
