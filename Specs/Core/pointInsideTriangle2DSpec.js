/*global defineSuite*/
defineSuite([
         'Core/pointInsideTriangle2D',
         'Core/Cartesian2'
     ], function(
         pointInsideTriangle2D,
         Cartesian2) {
    "use strict";
    /*global it,expect*/

    it('pointInsideTriangle2D has point inside', function() {
        expect(pointInsideTriangle2D(new Cartesian2(0.25, 0.25), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(true);
    });

    it('pointInsideTriangle2D has point outside', function() {
        expect(pointInsideTriangle2D(new Cartesian2(1.0, 1.0), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('pointInsideTriangle2D has point outside (2)', function() {
        expect(pointInsideTriangle2D(new Cartesian2(0.5, -0.5), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('pointInsideTriangle2D has point outside (3)', function() {
        expect(pointInsideTriangle2D(new Cartesian2(-0.5, 0.5), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('pointInsideTriangle2D has point on corner', function() {
        expect(pointInsideTriangle2D(Cartesian2.ZERO, Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('pointInsideTriangle2D has point inside on edge', function() {
        expect(pointInsideTriangle2D(new Cartesian2(0.5, 0.0), Cartesian2.ZERO, new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0))).toEqual(false);
    });

    it('throws without point', function() {
        expect(function() {
            pointInsideTriangle2D();
        }).toThrow();
    });

    it('throws without p0', function() {
        expect(function() {
            pointInsideTriangle2D(new Cartesian2());
        }).toThrow();
    });

    it('throws without p1', function() {
        expect(function() {
            pointInsideTriangle2D(new Cartesian2(), new Cartesian2());
        }).toThrow();
    });

    it('throws without p2', function() {
        expect(function() {
            pointInsideTriangle2D(new Cartesian2(), new Cartesian2(), new Cartesian2());
        }).toThrow();
    });
});