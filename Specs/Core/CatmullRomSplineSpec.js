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
            return new CatmullRomSpline();
        }).toThrow();

        expect(function() {
            return new CatmullRomSpline(1.0);
        }).toThrow();

        expect(function() {
            return new CatmullRomSpline([1.0, 2.0, 3.0]);
        }).toThrow();
    });

    it('get control points', function() {
        var crs = new CatmullRomSpline(points);
        expect(crs.getControlPoints()).toEqual(points);
    });

    it('get start and end tangents', function() {
        var start = points[1].point.subtract(points[0].point);
        var end = points[points.length - 1].point.subtract(points[points.length - 2].point);
        var crs = new CatmullRomSpline(points, start, end);

        expect(start).toEqual(crs.getStartTangent());
        expect(end).toEqual(crs.getEndTangent());
    });

    it('get start and end tangents when they are undefined', function() {
        var controlPoint0 = Cartesian3.clone(points[0].point);
        var controlPoint1 = Cartesian3.clone(points[1].point);
        var controlPoint2 = Cartesian3.clone(points[2].point);

        var start = controlPoint1
                       .multiplyByScalar(2.0)
                       .subtract(controlPoint2)
                       .subtract(controlPoint0)
                       .multiplyByScalar(0.5);

        var n = points.length - 1;

        var controlPointn0 = Cartesian3.clone(points[n].point);
        var controlPointn1 = Cartesian3.clone(points[n - 1].point);
        var controlPointn2 = Cartesian3.clone(points[n - 2].point);

        var end = controlPointn0
                       .subtract(controlPointn1.multiplyByScalar(2.0))
                       .add(controlPointn2)
                       .multiplyByScalar(0.5);

        var crs = new CatmullRomSpline(points);

        expect(start).toEqual(crs.getStartTangent());
        expect(end).toEqual(crs.getEndTangent());
    });

    it('evaluate fails with undefined time', function() {
        var crs = new CatmullRomSpline(points);

        expect(function() {
            crs.evaluate();
        }).toThrow();
    });

    it('evaluate fails with time out of range', function() {
        var crs = new CatmullRomSpline(points);

        expect(function() {
            crs.evaluate(points[0].time - 1.0);
        }).toThrow();

        expect(function() {
            crs.evaluate(points[points.length - 1].time + 1.0);
        }).toThrow();
    });

    it('check Catmull-Rom spline against a Hermite spline', function() {
        var crs = new CatmullRomSpline(points);

        points[0].tangent = crs.getStartTangent();
        for ( var i = 1; i < points.length - 1; ++i) {
            points[i].tangent = points[i + 1].point.subtract(points[i - 1].point).multiplyByScalar(0.5);
        }
        points[points.length - 1].tangent = crs.getEndTangent();

        var hs = new HermiteSpline(points);

        var granularity = 0.5;
        for ( var j = points[0].time; j <= points[points.length - 1].time; j = j + granularity) {
            expect(hs.evaluate(j)).toEqualEpsilon(crs.evaluate(j), CesiumMath.EPSILON4);
        }
    });
});
