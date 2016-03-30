/*global defineSuite*/
defineSuite([
        'Core/QuaternionSpline',
        'Core/Cartesian3',
        'Core/Math',
        'Core/Quaternion'
    ], function(
        QuaternionSpline,
        Cartesian3,
        CesiumMath,
        Quaternion) {
    'use strict';

    var points;
    var times;

    beforeEach(function() {
        points = [
            Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR),
            Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR),
            Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -CesiumMath.PI_OVER_FOUR),
            Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, CesiumMath.PI_OVER_FOUR)
        ];
        times = [0.0, 1.0, 2.0, 3.0];
    });

    it('constructor throws without points or times', function() {
        expect(function() {
            return new QuaternionSpline();
        }).toThrowDeveloperError();
    });

    it('constructor throws when control points length is less than 2', function() {
        expect(function() {
            return new QuaternionSpline({
                points : [Quaternion.ZERO]
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws when times.length is not equal to points.length', function() {
        expect(function() {
            return new QuaternionSpline({
                points : points,
                times : [0.0, 1.0]
            });
        }).toThrowDeveloperError();
    });

    it('evaluate throws without time', function() {
        var qs = new QuaternionSpline({
            points : points,
            times : times
        });

        expect(function() {
            qs.evaluate();
        }).toThrowDeveloperError();
    });

    it('evaluate throws when time is out of range', function() {
        var qs = new QuaternionSpline({
            points : points,
            times : times
        });

        expect(function() {
            qs.evaluate(times[0] - 1.0);
        }).toThrowDeveloperError();
    });

    it('evaluate without result parameter', function() {
        var qs = new QuaternionSpline({
            points : points,
            times : times
        });

        expect(qs.evaluate(times[0])).toEqual(points[0]);

        var time = (times[2] + times[1]) * 0.5;
        var t = (time - times[1]) / (times[2] - times[1]);

        var quads = qs.innerQuadrangles;
        var actual = qs.evaluate(time);
        var expected = Quaternion.squad(points[1], points[2], quads[1], quads[2], t, new Quaternion());
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    });

    it('evaluate with result parameter', function() {
        var qs = new QuaternionSpline({
            points : points,
            times : times
        });
        var result = new Quaternion();

        var point = qs.evaluate(times[0], result);
        expect(point).toBe(result);
        expect(result).toEqual(points[0]);
    });

    it('spline with 2 control points defaults to slerp', function() {
        points = points.slice(0, 2);
        times = times.slice(0, 2);

        var qs = new QuaternionSpline({
            points : points,
            times : times
        });

        var t = (times[0] + times[1]) * 0.5;
        var actual = qs.evaluate(t);
        var expected = Quaternion.slerp(points[0], points[1], t, new Quaternion());
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    });

    it('spline with 2 control points defaults to slerp and result parameter', function() {
        points = points.slice(0, 2);
        times = times.slice(0, 2);

        var qs = new QuaternionSpline({
            points : points,
            times : times
        });

        var t = (times[0] + times[1]) * 0.5;
        var result = new Cartesian3();
        var actual = qs.evaluate(t, result);
        var expected = Quaternion.slerp(points[0], points[1], t, new Quaternion());
        expect(actual).toBe(result);
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    });
});
