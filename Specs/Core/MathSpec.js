/*global defineSuite*/
defineSuite([
         'Core/Math',
         'Core/Cartesian3',
         'Core/Cartographic2',
         'Core/Cartographic3'
     ], function(
         CesiumMath,
         Cartesian3,
         Cartographic2,
         Cartographic3) {
    "use strict";
    /*global it,expect*/

    it('sign of -2', function() {
        expect(CesiumMath.sign(-2)).toEqual(-1);
    });

    it('sign of 2', function() {
        expect(CesiumMath.sign(2)).toEqual(1);
    });

    it('sign of 0', function() {
        expect(CesiumMath.sign(0)).toEqual(0);
    });

    ///////////////////////////////////////////////////////////////////////

    it('angleBetween between orthogonal vectors', function() {
        expect(CesiumMath.angleBetween(Cartesian3.UNIT_X, Cartesian3.UNIT_Y)).toEqual(CesiumMath.PI_OVER_TWO);
    });

    it('angleBetween between colinear vectors', function() {
        expect(CesiumMath.angleBetween(Cartesian3.UNIT_X, Cartesian3.UNIT_X)).toEqual(0.0);
    });

    it('angleBetween between zero vector', function() {
        expect(CesiumMath.angleBetween(Cartesian3.UNIT_X, Cartesian3.ZERO)).toEqual(0.0);
    });

    //////////////////////////////////////////////////////////////////////

    it('cosh', function() {
        expect(CesiumMath.cosh(0.0)).toEqual(1.0);
        expect(CesiumMath.cosh(-1.0)).toBeGreaterThan(1.0);
        expect(CesiumMath.cosh(1.0)).toBeGreaterThan(1.0);
    });

    it('cosh NaN', function() {
        expect(isNaN(CesiumMath.cosh(NaN))).toEqual(true);
    });

    it('cosh infinity', function() {
        expect(CesiumMath.cosh(Infinity)).toEqual(Infinity);
        expect(CesiumMath.cosh(-Infinity)).toEqual(Infinity);
    });

    it('sinh', function() {
        expect(CesiumMath.sinh(0.0)).toEqual(0.0);
        expect(CesiumMath.sinh(-1.0)).toBeLessThan(1.0);
        expect(CesiumMath.sinh(1.0)).toBeGreaterThan(1.0);
    });

    it('sinh NaN', function() {
        expect(isNaN(CesiumMath.sinh(NaN))).toEqual(true);
    });

    it('sinh infinity', function() {
        expect(CesiumMath.sinh(Infinity)).toEqual(Infinity);
        expect(CesiumMath.sinh(-Infinity)).toEqual(-Infinity);
    });

    ///////////////////////////////////////////////////////////////////////

    it('lerps at time 0', function() {
        expect(CesiumMath.lerp(1.0, 2.0, 0.0)).toEqual(1.0);
    });

    it('lerps at time 0.5', function() {
        expect(CesiumMath.lerp(1.0, 2.0, 0.5)).toEqual(1.5);
    });

    it('lerps at time 1', function() {
        expect(CesiumMath.lerp(1.0, 2.0, 1.0)).toEqual(2.0);
    });

    ///////////////////////////////////////////////////////////////////////

    it('toRadians', function() {
        expect(CesiumMath.toRadians(360.0)).toEqual(2 * Math.PI);
    });

    it('cartographic3ToRadians', function() {
        var c = CesiumMath.cartographic3ToRadians(new Cartographic3(360.0, 180.0, 1.0));
        expect(c.longitude).toEqual(2.0 * Math.PI);
        expect(c.latitude).toEqual(Math.PI);
        expect(c.height).toEqual(1.0);
    });

    it('cartographic2ToRadians', function() {
        var c = CesiumMath.cartographic2ToRadians(new Cartographic2(180.0, 360.0));
        expect(c.longitude).toEqual(Math.PI);
        expect(c.latitude).toEqual(2.0 * Math.PI);
    });

    it('toDegrees', function() {
        expect(CesiumMath.toDegrees(Math.PI)).toEqual(180.0);
    });

    it('cartographic3ToDegrees', function() {
        var c = CesiumMath.cartographic3ToDegrees(new Cartographic3(2.0 * Math.PI, Math.PI, 1.0));
        expect(c.longitude).toEqual(360.0);
        expect(c.latitude).toEqual(180.0);
        expect(c.height).toEqual(1.0);
    });

    it('cartographic2ToDegrees', function() {
        var c = CesiumMath.cartographic2ToDegrees(new Cartographic2(Math.PI, 2.0 * Math.PI));
        expect(c.longitude).toEqual(180.0);
        expect(c.latitude).toEqual(360.0);
    });

    it('convertLongitudeRange (1)', function() {
        expect(CesiumMath.convertLongitudeRange(CesiumMath.THREE_PI_OVER_TWO)).toEqualEpsilon(-CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON16);
    });

    it('convertLongitudeRange (2)', function() {
        expect(CesiumMath.convertLongitudeRange(-Math.PI)).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON16);
    });

    it('convertLongitudeRange (3)', function() {
        expect(CesiumMath.convertLongitudeRange(Math.PI)).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON16);
    });

    it('negativePiToPi positive', function() {
        expect(CesiumMath.negativePiToPi((Math.PI / 2) * Math.PI)).toEqualEpsilon((Math.PI / 2) * Math.PI - CesiumMath.TWO_PI, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(Math.PI / 0.5)).toEqualEpsilon(0.0, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(Math.PI + CesiumMath.EPSILON10)).toEqualEpsilon(Math.PI, CesiumMath.EPSILON16);
    });

    it('negativePiToPi negative', function() {
        expect(CesiumMath.negativePiToPi(-Math.PI / 0.5)).toEqualEpsilon(0.0, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(-(Math.PI / 2) * Math.PI)).toEqualEpsilon(-(Math.PI / 2) * Math.PI + CesiumMath.TWO_PI, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(-(Math.PI + CesiumMath.EPSILON10))).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON16);
    });

    it('negativePiToPi should not change', function() {
        expect(CesiumMath.negativePiToPi(Math.PI - 1)).toEqualEpsilon(Math.PI - 1, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(-Math.PI + 1)).toEqualEpsilon(-Math.PI + 1, CesiumMath.EPSILON16);
    });
});
