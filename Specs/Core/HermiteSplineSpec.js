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
    /*global it,expect,beforeEach*/

    var points;
    beforeEach(function() {
        points = [{
            point : new Cartesian3(-1.0, -1.0, 0.0),
            time : 0.0
        }, {
            point : new Cartesian3(-0.5, -0.125, 0.0),
            time : 1.0
        }, {
            point : new Cartesian3(0.5, 0.125, 0.0),
            time : 2.0
        }, {
            point : new Cartesian3(1.0, 1.0, 0.0),
            time : 3.0
        }];
    });

    it('constructor throws an exception with invalid control points', function() {
        expect(function() {
            return new HermiteSpline();
        }).toThrow();

        expect(function() {
            return new HermiteSpline(1.0);
        }).toThrow();

        expect(function() {
            return new HermiteSpline([1.0, 2.0, 3.0]);
        }).toThrow();
    });

    it('get control points', function() {
        var hs = new HermiteSpline(points);
        expect(hs.getControlPoints()).toEqual(points);
    });

    it('evaluate fails with undefined time', function() {
        var hs = new HermiteSpline(points);
        expect(function() {
            hs.evaluate();
        }).toThrow();
    });

    it('evaluate fails with time out of range', function() {
        var hs = new HermiteSpline(points);

        expect(function() {
            hs.evaluate(points[0].time - 1.0);
        }).toThrow();

        expect(function() {
            hs.evaluate(points[points.length - 1].time + 1.0);
        }).toThrow();
    });

    it('evaluate can jump around in time', function() {
        var hs = new HermiteSpline(points);

        expect(hs.evaluate(points[0].time).equals(points[0].point)).toEqual(true);

        // jump forward
        expect(hs.evaluate(points[1].time).equals(points[1].point)).toEqual(true);

        // jump backward
        expect(hs.evaluate(points[0].time).equals(points[0].point)).toEqual(true);

        // jump far forward
        expect(hs.evaluate(points[points.length - 2].time).equals(points[points.length - 2].point)).toEqual(true);

        // jump far back
        expect(hs.evaluate(points[0].time).equals(points[0].point)).toEqual(true);
    });

    // returns a function for a hermite curve between points p and q
    // with tangents pT and qT respectively on the interval [0, 1]
    var createHermiteBasis = function(p, pT, q, qT) {
        return function(u) {
            var a = 2.0 * u * u * u - 3.0 * u * u + 1.0;
            var b = -2.0 * u * u * u + 3.0 * u * u;
            var c = u * u * u - 2.0 * u * u + u;
            var d = u * u * u - u * u;

            var p0 = p.multiplyByScalar(a);
            var p1 = q.multiplyByScalar(b);
            var p2 = pT.multiplyByScalar(c);
            var p3 = qT.multiplyByScalar(d);

            return p0.add(p1).add(p2).add(p3);
        };
    };

    it('natural cubic spline', function() {
        points = [{
            point : new Cartesian3(1.0, 0.0, 0.0),
            time : 0.0
        }, {
            point : new Cartesian3(0.0, 1.0, CesiumMath.PI_OVER_TWO),
            time : 1.0
        }, {
            point : new Cartesian3(-1.0, 0.0, Math.PI),
            time : 2.0
        }, {
            point : new Cartesian3(0.0, -1.0, CesiumMath.THREE_PI_OVER_TWO),
            time : 3.0
        }];

        var p0Tangent = new Cartesian3(-0.87, 1.53, 1.57);
        var p1Tangent = new Cartesian3(-1.27, -0.07, 1.57);

        var interpolate = createHermiteBasis(points[0].point, p0Tangent, points[1].point, p1Tangent);
        var hs = new HermiteSpline(points);

        var granularity = 0.1;
        for ( var i = points[0].time; i < points[1].time; i = i + granularity) {
            expect(hs.evaluate(i).equalsEpsilon(interpolate(i), CesiumMath.EPSILON3)).toEqual(true);
        }
    });

    it('clamped cubic spline', function() {
        points = [{
            point : new Cartesian3(1.0, 0.0, 0.0),
            time : 0.0,
            tangent : new Cartesian3(0.0, 1.0, 0.0)
        }, {
            point : new Cartesian3(0.0, 1.0, CesiumMath.PI_OVER_TWO),
            time : 1.0
        }, {
            point : new Cartesian3(-1.0, 0.0, Math.PI),
            time : 2.0
        }, {
            point : new Cartesian3(0.0, -1.0, CesiumMath.THREE_PI_OVER_TWO),
            time : 3.0,
            tangent : new Cartesian3(1.0, 0.0, 0.0)
        }];

        var p0Tangent = new Cartesian3(0.0, 1.0, 0.0);
        var p1Tangent = new Cartesian3(-1.53, 0.13, 1.88);

        var interpolate = createHermiteBasis(points[0].point, p0Tangent, points[1].point, p1Tangent);
        var hs = new HermiteSpline(points);

        var granularity = 0.1;
        for ( var i = points[0].time; i < points[1].time; i = i + granularity) {
            expect(hs.evaluate(i).equalsEpsilon(interpolate(i), CesiumMath.EPSILON3)).toEqual(true);
        }
    });
});
