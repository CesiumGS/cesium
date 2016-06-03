/*global defineSuite*/
defineSuite([
        'Core/Plane',
        'Core/Cartesian3',
        'Core/Cartesian4'
    ], function(
        Plane,
        Cartesian3,
        Cartesian4) {
    'use strict';

    it('constructs', function() {
        var normal = Cartesian3.UNIT_X;
        var distance = 1.0;
        var plane = new Plane(normal, distance);
        expect(plane.normal).toEqual(normal);
        expect(plane.distance).toEqual(distance);
    });

    it('constructor throws without a normal', function() {
        expect(function() {
            return new Plane(undefined, 0.0);
        }).toThrowDeveloperError();
    });

    it('constructor throws without a distance', function() {
        expect(function() {
            return new Plane(Cartesian3.UNIT_X, undefined);
        }).toThrowDeveloperError();
    });

    it('constructs from a point and a normal', function() {
        var normal = new Cartesian3(1.0, 2.0, 3.0);
        var point = new Cartesian3(4.0, 5.0, 6.0);
        var plane = Plane.fromPointNormal(point, normal);
        expect(plane.normal).toEqual(normal);
        expect(plane.distance).toEqual(-Cartesian3.dot(normal, point));
    });

    it('constructs from a point and a normal with result', function() {
        var normal = new Cartesian3(1.0, 2.0, 3.0);
        var point = new Cartesian3(4.0, 5.0, 6.0);

        var plane = new Plane(Cartesian3.UNIT_X, 0.0);
        Plane.fromPointNormal(point, normal, plane);

        expect(plane.normal).toEqual(normal);
        expect(plane.distance).toEqual(-Cartesian3.dot(normal, point));
    });

    it('constructs from a Cartesian4 without result', function() {
        var result = Plane.fromCartesian4(Cartesian4.UNIT_X);

        expect(result.normal).toEqual(Cartesian3.UNIT_X);
        expect(result.distance).toEqual(0.0);
    });

    it('constructs from a Cartesian4 with result', function() {
        var result = new Plane(Cartesian3.UNIT_X, 0.0);
        Plane.fromCartesian4(Cartesian4.UNIT_X, result);

        expect(result.normal).toEqual(Cartesian3.UNIT_X);
        expect(result.distance).toEqual(0.0);
    });

    it('fromPointNormal throws without a point', function() {
        expect(function() {
            return Plane.fromPointNormal(undefined, Cartesian3.UNIT_X);
        }).toThrowDeveloperError();
    });

    it('fromPointNormal throws without a normal', function() {
        expect(function() {
            return Plane.fromPointNormal(Cartesian3.UNIT_X, undefined);
        }).toThrowDeveloperError();
    });

    it('fromCartesian4 throws without coefficients', function() {
        expect(function() {
            return Plane.fromCartesian4(undefined);
        }).toThrowDeveloperError();
    });

    it('gets the distance to a point', function() {
        var plane = new Plane(new Cartesian3(1.0, 2.0, 3.0), 12.34);
        var point = new Cartesian3(4.0, 5.0, 6.0);

        expect(Plane.getPointDistance(plane, point)).toEqual(Cartesian3.dot(plane.normal, point) + plane.distance);
    });

    it('getPointDistance throws without a plane', function() {
        var point = Cartesian3.ZERO;
        expect(function() {
            return Plane.getPointDistance(undefined, point);
        }).toThrowDeveloperError();
    });

    it('getPointDistance throws without a point', function() {
        var plane = new Plane(Cartesian3.UNIT_X, 0.0);
        expect(function() {
            return Plane.getPointDistance(plane, undefined);
        }).toThrowDeveloperError();
    });
});
