/*global defineSuite*/
defineSuite([
         'Core/OrientationInterpolator',
         'Core/Quaternion',
         'Core/Math'
     ], function(
         OrientationInterpolator,
         Quaternion,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

   var points;
    beforeEach(function() {
        points = [{
            orientation : new Quaternion(0.0, 0.0, 0.0, 1.0),
            time : 0.0
        }, {
            orientation : new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR)),
            time : 10.0
        }, {
            orientation : new Quaternion(0.0, -1.0, 0.0, CesiumMath.toRadians(15.0)),
            time : 20.0
        }];
    });

    it('constructor throws an exception with invalid control points', function() {
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

    it('get control points', function() {
        var oi = new OrientationInterpolator(points);
        expect(oi.getControlPoints()).toEqual(points);
    });

    it('evaluate fails with undefined time', function() {
        var oi = new OrientationInterpolator(points);
        expect(function() {
            oi.evaluate();
        }).toThrow();
    });

    it('evaluate fails with time out of range', function() {
        var oi = new OrientationInterpolator(points);

        expect(function() {
            oi.evaluate(points[0].time - 1.0);
        }).toThrow();

        expect(function() {
            oi.evaluate(points[points.length - 1].time + 1.0);
        }).toThrow();
    });

    it('evaluate can jump around in time', function() {
        var oi = new OrientationInterpolator(points);

        expect(oi.evaluate(points[0].time)).toEqualEpsilon(points[0].orientation, CesiumMath.EPSILON12);

        // jump forward
        expect(oi.evaluate(points[1].time)).toEqualEpsilon(points[1].orientation, CesiumMath.EPSILON12);

        // jump backward
        expect(oi.evaluate(points[0].time)).toEqualEpsilon(points[0].orientation, CesiumMath.EPSILON12);

        // jump far forward
        expect(oi.evaluate(points[points.length - 2].time)).toEqualEpsilon(points[points.length - 2].orientation, CesiumMath.EPSILON12);

        // jump far back
        expect(oi.evaluate(points[0].time)).toEqualEpsilon(points[0].orientation, CesiumMath.EPSILON12);
    });

    it('evaluate (1)', function() {
        var oi = new OrientationInterpolator(points);
        var actual = oi.evaluate((points[0].time + points[1].time) * 0.5);
        var expected = new Quaternion(0.0, 0.0, Math.sin(Math.PI / 8.0), Math.cos(Math.PI / 8.0));
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('evaluate (2)', function() {
        var oi = new OrientationInterpolator(points);
        var actual = oi.evaluate(points[2].time);
        var expected = new Quaternion(0.0, -1.0, 0.0, CesiumMath.toRadians(15.0));
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });
});
