/*global defineSuite*/
defineSuite([
         'Core/CatmullRomSpline',
         'Core/Cartesian3',
         'Core/HermiteSpline',
         'Core/Math'
     ], function(
         CatmullRomSpline,
         Cartesian3,
         HermiteSpline,
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
            return new CatmullRomSpline();
        }).toThrow();
    });

    it('constructor throws when control points length is less than 3', function() {
        expect(function() {
            return new CatmullRomSpline({
                points : [Cartesian3.ZERO]
            });
        }).toThrow();
    });

    it('constructor throws without times', function() {
        expect(function() {
            return new CatmullRomSpline({
                points : points
            });
        }).toThrow();
    });

    it('constructor throws when times.length is not equal to points.length', function() {
        expect(function() {
            return new CatmullRomSpline({
                points : points,
                times : [0.0, 1.0]
            });
        }).toThrow();
    });

    it('sets start and end tangents', function() {
        var start = Cartesian3.subtract(points[1], points[0]);
        var end = Cartesian3.subtract(points[points.length - 1], points[points.length - 2]);
        var crs = new CatmullRomSpline({
            points : points,
            times : times,
            firstTangent : start,
            lastTangent : end
        });

        expect(start).toEqual(crs.firstTangent);
        expect(end).toEqual(crs.lastTangent);
    });

    it('computes start and end tangents', function() {
        var controlPoint0 = Cartesian3.clone(points[0]);
        var controlPoint1 = Cartesian3.clone(points[1]);
        var controlPoint2 = Cartesian3.clone(points[2]);

        var start = Cartesian3.multiplyByScalar(Cartesian3.subtract(Cartesian3.subtract(Cartesian3.multiplyByScalar(controlPoint1, 2.0), controlPoint2), controlPoint0), 0.5);

        var controlPointn0 = Cartesian3.clone(points[points.length - 1]);
        var controlPointn1 = Cartesian3.clone(points[points.length - 2]);
        var controlPointn2 = Cartesian3.clone(points[points.length - 3]);

        var end = Cartesian3.multiplyByScalar(Cartesian3.add(Cartesian3.subtract(controlPointn0, Cartesian3.multiplyByScalar(controlPointn1, 2.0)), controlPointn2), 0.5);

        var crs = new CatmullRomSpline({
            points : points,
            times : times
        });

        expect(start).toEqual(crs.firstTangent);
        expect(end).toEqual(crs.lastTangent);
    });

    it('evaluate throws without time', function() {
        var crs = new CatmullRomSpline({
            points : points,
            times : times
        });

        expect(function() {
            crs.evaluate();
        }).toThrow();
    });

    it('evaluate throws when time is out of range', function() {
        var crs = new CatmullRomSpline({
            points : points,
            times : times
        });

        expect(function() {
            crs.evaluate(times[0] - 1.0);
        }).toThrow();
    });

    it('check Catmull-Rom spline against a Hermite spline', function() {
        var crs = new CatmullRomSpline({
            points : points,
            times : times
        });

        var tangents = [crs.firstTangent];
        for ( var i = 1; i < points.length - 1; ++i) {
            tangents.push(Cartesian3.multiplyByScalar(Cartesian3.subtract(points[i + 1], points[i - 1]), 0.5));
        }
        tangents.push(crs.lastTangent);

        var hs = new HermiteSpline({
            points : points,
            tangents : tangents,
            times : times
        });

        var granularity = 0.5;
        for ( var j = times[0]; j <= times[points.length - 1]; j = j + granularity) {
            expect(hs.evaluate(j)).toEqualEpsilon(crs.evaluate(j), CesiumMath.EPSILON4);
        }
    });

    it('evaluate with result parameter', function() {
        var crs = new CatmullRomSpline({
            points : points,
            times : times
        });
        var result = new Cartesian3();

        var point = crs.evaluate(times[0], result);
        expect(point).toBe(result);
        expect(result).toEqual(points[0]);
    });

    it('spline with 2 control points defaults to lerp', function() {
        points = points.slice(0, 2);
        times = times.slice(0, 2);

        var crs = new CatmullRomSpline({
            points : points,
            times : times
        });

        var t = (times[0] + times[1]) * 0.5;
        expect(crs.evaluate(t)).toEqual(Cartesian3.lerp(points[0], points[1], t));
    });

    it('spline with 2 control points defaults to lerp and result parameter', function() {
        points = points.slice(0, 2);
        times = times.slice(0, 2);

        var crs = new CatmullRomSpline({
            points : points,
            times : times
        });

        var t = (times[0] + times[1]) * 0.5;
        var result = new Cartesian3();
        var actual = crs.evaluate(t, result);
        expect(actual).toBe(result);
        expect(actual).toEqual(Cartesian3.lerp(points[0], points[1], t));
    });
});
