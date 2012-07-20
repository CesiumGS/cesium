/*global defineSuite*/
defineSuite([
         'Core/Math',
         'Core/Cartesian3',
         'Core/Cartographic'
     ], function(
         CesiumMath,
         Cartesian3,
         Cartographic) {
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

    it('toDegrees', function() {
        expect(CesiumMath.toDegrees(Math.PI)).toEqual(180.0);
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

    var factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000, 6402373705728000,
            121645100408832000, 2432902008176640000, 51090942171709440000, 1124000727777607680000, 25852016738884976640000, 620448401733239439360000];

    it('factorial produces the correct results', function() {
        for ( var i = 0; i < factorials.length; i++) {
            expect(CesiumMath.factorial(i)).toEqual(factorials[i]);
        }
    });

    it('factorial throws for non-numbers', function() {
        expect(function() {
            CesiumMath.factorial({});
        }).toThrow();
    });

    it('factorial throws for negative numbers', function() {
        expect(function() {
            CesiumMath.factorial(-1);
        }).toThrow();
    });

    it('factorial throws for undefined', function() {
        expect(function() {
            CesiumMath.factorial();
        }).toThrow();
    });
});
