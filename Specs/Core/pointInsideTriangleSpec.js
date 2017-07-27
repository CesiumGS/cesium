defineSuite([
        'Core/pointInsideTriangle',
        'Core/Cartesian2'
    ], function(
        pointInsideTriangle,
        Cartesian2) {
    'use strict';

    it('pointInsideTriangle has point inside', function() {
        expect(pointInsideTriangle(new Cartesian2(0.25, 0.25), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(true);
    });

    it('pointInsideTriangle has point outside', function() {
        expect(pointInsideTriangle(new Cartesian2(1.0, 1.0), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('pointInsideTriangle has point outside (2)', function() {
        expect(pointInsideTriangle(new Cartesian2(0.5, -0.5), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('pointInsideTriangle has point outside (3)', function() {
        expect(pointInsideTriangle(new Cartesian2(-0.5, 0.5), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('pointInsideTriangle has point on corner', function() {
        expect(pointInsideTriangle(Cartesian2.ZERO, Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('pointInsideTriangle has point inside on edge', function() {
        expect(pointInsideTriangle(new Cartesian2(0.5, 0.0), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('throws without point', function() {
        expect(function() {
            pointInsideTriangle();
        }).toThrowDeveloperError();
    });

    it('throws without p0', function() {
        expect(function() {
            pointInsideTriangle(new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('throws without p1', function() {
        expect(function() {
            pointInsideTriangle(new Cartesian2(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('throws without p2', function() {
        expect(function() {
            pointInsideTriangle(new Cartesian2(), new Cartesian2(), new Cartesian2());
        }).toThrowDeveloperError();
    });
});
