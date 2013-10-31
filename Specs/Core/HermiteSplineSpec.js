/*global defineSuite*/
defineSuite([
         'Core/HermiteSpline',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         HermiteSpline,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var points;
    var times;

    beforeEach(function() {
        points = [
            new Cartesian3(-1.0, -1.0, 0.0),
            new Cartesian3(-0.5, -0.125, 0.0),
            new Cartesian3(0.5, 0.125, 0.0),
            new Cartesian3(1.0, 1.0, 0.0)
        ];
        times = [0.0, 1.0, 2.0, 3.0];
    });

    it('constructor throws without points', function() {
        expect(function() {
            return new HermiteSpline();
        }).toThrow();
    });

    it('constructor throws when control points length is less than 3', function() {
        expect(function() {
            return new HermiteSpline({
                points : [Cartesian3.ZERO]
            });
        }).toThrow();
    });

    it('constructor throws without times', function() {
        expect(function() {
            return new HermiteSpline({
                points : points
            });
        }).toThrow();
    });

    it('constructor throws when times.length is not equal to points.length', function() {
        expect(function() {
            return new HermiteSpline({
                points : points,
                times : [0.0, 1.0]
            });
        }).toThrow();
    });

    it('evaluate fails with undefined time', function() {
        var hs = new HermiteSpline({
            points : points,
            times : times
        });
        expect(function() {
            hs.evaluate();
        }).toThrow();
    });

    it('evaluate fails with time out of range', function() {
        var hs = new HermiteSpline({
            points : points,
            times : times
        });
        expect(function() {
            hs.evaluate(times[0] - 1.0);
        }).toThrow();
    });

    // returns a function for a hermite curve between points p and q
    // with tangents pT and qT respectively on the interval [0, 1]
    var createHermiteBasis = function(p, pT, q, qT) {
        return function(u) {
            var a = 2.0 * u * u * u - 3.0 * u * u + 1.0;
            var b = -2.0 * u * u * u + 3.0 * u * u;
            var c = u * u * u - 2.0 * u * u + u;
            var d = u * u * u - u * u;

            var p0 = Cartesian3.multiplyByScalar(p, a);
            var p1 = Cartesian3.multiplyByScalar(q, b);
            var p2 = Cartesian3.multiplyByScalar(pT, c);
            var p3 = Cartesian3.multiplyByScalar(qT, d);

            return Cartesian3.add(Cartesian3.add(Cartesian3.add(p0, p1), p2), p3);
        };
    };

    it('natural cubic spline', function() {
        points = [
            new Cartesian3(1.0, 0.0, 0.0),
            new Cartesian3(0.0, 1.0, CesiumMath.PI_OVER_TWO),
            new Cartesian3(-1.0, 0.0, Math.PI),
            new Cartesian3(0.0, -1.0, CesiumMath.THREE_PI_OVER_TWO)
        ];

        var p0Tangent = new Cartesian3(-0.87, 1.53, 1.57);
        var p1Tangent = new Cartesian3(-1.27, -0.07, 1.57);

        var interpolate = createHermiteBasis(points[0], p0Tangent, points[1], p1Tangent);
        var hs = new HermiteSpline({
            points : points,
            times : times
        });

        var granularity = 0.1;
        for ( var i = times[0]; i < times[1]; i = i + granularity) {
            expect(hs.evaluate(i)).toEqualEpsilon(interpolate(i), CesiumMath.EPSILON3);
        }
    });

    it('clamped cubic spline', function() {
        points = [
            new Cartesian3(1.0, 0.0, 0.0),
            new Cartesian3(0.0, 1.0, CesiumMath.PI_OVER_TWO),
            new Cartesian3(-1.0, 0.0, Math.PI),
            new Cartesian3(0.0, -1.0, CesiumMath.THREE_PI_OVER_TWO)
        ];

        var firstTangent = new Cartesian3(0.0, 1.0, 0.0);
        var lastTangent = new Cartesian3(1.0, 0.0, 0.0);

        var p0Tangent = firstTangent;
        var p1Tangent = new Cartesian3(-1.53, 0.13, 1.88);

        var interpolate = createHermiteBasis(points[0].point, p0Tangent, points[1].point, p1Tangent);
        var hs = new HermiteSpline({
            points : points,
            times : times,
            firstTangent : firstTangent,
            lastTangent : lastTangent
        });

        var granularity = 0.1;
        for ( var i = points[0].time; i < points[1].time; i = i + granularity) {
            expect(hs.evaluate(i)).toEqualEpsilon(interpolate(i), CesiumMath.EPSILON3);
        }
    });

    it('evaluate with result parameter', function() {
        var hs = new HermiteSpline({
            points : points,
            times : times
        });
        var result = new Cartesian3();
        var point = hs.evaluate(times[0], result);
        expect(point).toBe(result);
        expect(result).toEqual(points[0]);
    });

    it('spline with 2 control points defaults to lerp', function() {
        points = points.slice(0, 2);
        times = times.slice(0, 2);

        var hs = new HermiteSpline({
            points : points,
            times : times
        });

        var t = (times[0] + times[1]) * 0.5;
        expect(hs.evaluate(t)).toEqual(Cartesian3.lerp(points[0], points[1], t));
    });

    it('spline with 2 control points defaults to lerp and result parameter', function() {
        points = points.slice(0, 2);
        times = times.slice(0, 2);

        var hs = new HermiteSpline({
            points : points,
            times : times
        });

        var t = (times[0] + times[1]) * 0.5;
        var result = new Cartesian3();
        var actual = hs.evaluate(t, result);
        expect(actual).toBe(result);
        expect(actual).toEqual(Cartesian3.lerp(points[0], points[1], t));
    });
});
