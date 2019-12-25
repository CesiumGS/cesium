import { Math as CesiumMath } from '../../Source/Cesium.js';

describe('Core/Math', function() {

    it('sign of -2', function() {
        expect(CesiumMath.sign(-2)).toEqual(-1);
    });

    it('sign of 2', function() {
        expect(CesiumMath.sign(2)).toEqual(1);
    });

    it('sign of 0', function() {
        expect(CesiumMath.sign(0)).toEqual(0);
    });

    it('sign of -0', function() {
        expect(CesiumMath.sign(-0)).toEqual(-0);
    });

    it('sign of NaN', function() {
        expect(CesiumMath.sign(NaN)).toBeNaN();
    });

    it('signNotZero of -2', function() {
        expect(CesiumMath.signNotZero(-2)).toEqual(-1);
    });

    it('signNotZero of 2', function() {
        expect(CesiumMath.signNotZero(2)).toEqual(1);
    });

    it('signNotZero of 0', function() {
        expect(CesiumMath.signNotZero(0)).toEqual(1);
    });

    //////////////////////////////////////////////////////////////////////
    it('toSNorm -1.0', function() {
        expect(CesiumMath.toSNorm(-1.0)).toEqual(0);
    });

    it('toSNorm 1.0', function() {
        expect(CesiumMath.toSNorm(1.0)).toEqual(255);
    });

    it('toSNorm -1.0001', function() {
        expect(CesiumMath.toSNorm(-1.0001)).toEqual(0);
    });

    it('toSNorm 1.0001', function() {
        expect(CesiumMath.toSNorm(1.0001)).toEqual(255);
    });

    it('toSNorm 0.0', function() {
        expect(CesiumMath.toSNorm(0.0)).toEqual(128);
    });

    it('fromSNorm 0', function() {
        expect(CesiumMath.fromSNorm(0)).toEqual(-1.0);
    });

    it('fromSNorm 255', function() {
        expect(CesiumMath.fromSNorm(255)).toEqual(1.0);
    });

    it('fromSNorm -0.0001', function() {
        expect(CesiumMath.fromSNorm(-0.0001)).toEqual(-1.0);
    });

    it('fromSNorm 255.00001', function() {
        expect(CesiumMath.fromSNorm(255.00001)).toEqual(1.0);
    });

    it('fromSNorm 128', function() {
        expect(CesiumMath.fromSNorm(255.0 / 2)).toEqual(0.0);
    });

    //////////////////////////////////////////////////////////////////////
    it('normalize 0 with max 10 min -10', function() {
        expect(CesiumMath.normalize(0, -10, 10)).toEqual(0.5);
    });

    it('normalize 10 with max 10 min -10', function() {
        expect(CesiumMath.normalize(10, -10, 10)).toEqual(1.0);
    });

    it('normalize -10 with max 10 min -10', function() {
        expect(CesiumMath.normalize(-10, -10, 10)).toEqual(0.0);
    });

    it('normalize -10.0001 with max 10 min -10', function() {
        expect(CesiumMath.normalize(-10.0001, -10, 10)).toEqual(0.0);
    });

    it('normalize 10.00001 with max 10 min -10', function() {
        expect(CesiumMath.normalize(10.00001, -10, 10)).toEqual(1.0);
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

    it('toRadians throws for undefined', function() {
        expect(function() {
            CesiumMath.toRadians();
        }).toThrowDeveloperError();
    });

    it('toDegrees', function() {
        expect(CesiumMath.toDegrees(Math.PI)).toEqual(180.0);
    });

    it('toDegrees throws for undefined', function() {
        expect(function() {
            CesiumMath.toDegrees();
        }).toThrowDeveloperError();
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

    it('convertLongitudeRange throws for undefined', function() {
        expect(function() {
            CesiumMath.convertLongitudeRange();
        }).toThrowDeveloperError();
    });

    it('clampToLatitudeRange (1)', function() {
        expect(CesiumMath.clampToLatitudeRange(Math.PI)).toEqual(CesiumMath.PI_OVER_TWO);
    });

    it('clampToLatitudeRange (2)', function() {
        expect(CesiumMath.clampToLatitudeRange(-Math.PI)).toEqual(-CesiumMath.PI_OVER_TWO);
    });

    it('clampToLatitudeRange throws for undefined', function() {
        expect(function() {
            CesiumMath.clampToLatitudeRange();
        }).toThrowDeveloperError();
    });

    it('negativePiToPi positive', function() {
        expect(CesiumMath.negativePiToPi((Math.PI / 2) * Math.PI)).toEqualEpsilon((Math.PI / 2) * Math.PI - CesiumMath.TWO_PI, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(Math.PI / 0.5)).toEqualEpsilon(0.0, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(Math.PI + CesiumMath.EPSILON10)).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON9);
        expect(CesiumMath.negativePiToPi(Math.PI)).toEqualEpsilon(Math.PI, CesiumMath.EPSILON9);
    });

    it('negativePiToPi negative', function() {
        expect(CesiumMath.negativePiToPi(-Math.PI / 0.5)).toEqualEpsilon(0.0, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(-(Math.PI / 2) * Math.PI)).toEqualEpsilon(-(Math.PI / 2) * Math.PI + CesiumMath.TWO_PI, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(-(Math.PI + CesiumMath.EPSILON10))).toEqualEpsilon(Math.PI, CesiumMath.EPSILON9);
        expect(CesiumMath.negativePiToPi(-Math.PI)).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON9);
    });

    it('negativePiToPi should not change', function() {
        expect(CesiumMath.negativePiToPi(Math.PI - 1)).toEqualEpsilon(Math.PI - 1, CesiumMath.EPSILON16);
        expect(CesiumMath.negativePiToPi(-Math.PI + 1)).toEqualEpsilon(-Math.PI + 1, CesiumMath.EPSILON16);
    });

    it('negativePiToPi throws for undefined', function() {
        expect(function() {
            CesiumMath.negativePiToPi();
        }).toThrowDeveloperError();
    });

    it('zeroToTwoPi', function() {
        expect(CesiumMath.zeroToTwoPi(0.0)).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(CesiumMath.zeroToTwoPi(Math.PI)).toEqualEpsilon(Math.PI, CesiumMath.EPSILON14);
        expect(CesiumMath.zeroToTwoPi(CesiumMath.TWO_PI)).toEqualEpsilon(CesiumMath.TWO_PI, CesiumMath.EPSILON14);
        expect(CesiumMath.zeroToTwoPi(3.0 * Math.PI)).toEqualEpsilon(Math.PI, CesiumMath.EPSILON14);
        expect(CesiumMath.zeroToTwoPi(2.0 * CesiumMath.TWO_PI)).toEqualEpsilon(CesiumMath.TWO_PI, CesiumMath.EPSILON14);
        expect(CesiumMath.zeroToTwoPi(-Math.PI)).toEqualEpsilon(Math.PI, CesiumMath.EPSILON14);
        expect(CesiumMath.zeroToTwoPi(-CesiumMath.TWO_PI)).toEqualEpsilon(CesiumMath.TWO_PI, CesiumMath.EPSILON14);
    });

    it('zeroToTwoPi throws for undefined', function() {
        expect(function() {
            CesiumMath.zeroToTwoPi();
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon', function() {
        expect(CesiumMath.equalsEpsilon(1.0, 1.0, 0.0)).toEqual(true);
        expect(CesiumMath.equalsEpsilon(1.0, 1.0, 1.0)).toEqual(true);
        expect(CesiumMath.equalsEpsilon(1.0, 1.0 + CesiumMath.EPSILON7, CesiumMath.EPSILON7)).toEqual(true);
        expect(CesiumMath.equalsEpsilon(1.0, 1.0 + CesiumMath.EPSILON7, CesiumMath.EPSILON9)).toEqual(false);

        expect(CesiumMath.equalsEpsilon(3000000.0, 3000000.0, 0.0)).toEqual(true);
        expect(CesiumMath.equalsEpsilon(3000000.0, 3000000.0, CesiumMath.EPSILON7)).toEqual(true);
        expect(CesiumMath.equalsEpsilon(3000000.0, 3000000.2, CesiumMath.EPSILON7)).toEqual(true);
        expect(CesiumMath.equalsEpsilon(3000000.0, 3000000.2, CesiumMath.EPSILON9)).toEqual(false);
    });

    it('equalsEpsilon throws for undefined left', function() {
        expect(function() {
            CesiumMath.equalsEpsilon(undefined, 5.0, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon throws for undefined right', function() {
        expect(function() {
            CesiumMath.equalsEpsilon(1.0, undefined, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon throws for undefined relativeEpsilon', function() {
        expect(function() {
            CesiumMath.equalsEpsilon(1.0, 5.0, undefined);
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon throws for undefined', function() {
        expect(function() {
            CesiumMath.equalsEpsilon();
        }).toThrowDeveloperError();
    });

    it('lessThan works', function() {
        expect(CesiumMath.lessThan(1.0, 2.0, 0.2)).toBe(true);
        expect(CesiumMath.lessThan(2.0, 1.0, 0.2)).toBe(false);
        expect(CesiumMath.lessThan(1.0, 1.0, 0.2)).toBe(false);
        expect(CesiumMath.lessThan(1.0, 1.2, 0.2)).toBe(false);
        expect(CesiumMath.lessThan(1.2, 1.0, 0.2)).toBe(false);
    });

    it('lessThan throws for undefined left', function() {
        expect(function() {
            CesiumMath.lessThan(undefined, 5.0, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('lessThan throws for undefined right', function() {
        expect(function() {
            CesiumMath.lessThan(1.0, undefined, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('lessThan throws for undefined absoluteEpsilon', function() {
        expect(function() {
            CesiumMath.lessThan(1.0, 5.0, undefined);
        }).toThrowDeveloperError();
    });

    it('lessThanOrEquals works', function() {
        expect(CesiumMath.lessThanOrEquals(1.0, 2.0, 0.2)).toBe(true);
        expect(CesiumMath.lessThanOrEquals(2.0, 1.0, 0.2)).toBe(false);
        expect(CesiumMath.lessThanOrEquals(1.0, 1.0, 0.2)).toBe(true);
        expect(CesiumMath.lessThanOrEquals(1.0, 1.2, 0.2)).toBe(true);
        expect(CesiumMath.lessThanOrEquals(1.2, 1.0, 0.2)).toBe(true);
    });

    it('lessThanOrEquals throws for undefined left', function() {
        expect(function() {
            CesiumMath.lessThanOrEquals(undefined, 5.0, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('lessThanOrEquals throws for undefined right', function() {
        expect(function() {
            CesiumMath.lessThanOrEquals(1.0, undefined, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('lessThanOrEquals throws for undefined absoluteEpsilon', function() {
        expect(function() {
            CesiumMath.lessThanOrEquals(1.0, 5.0, undefined);
        }).toThrowDeveloperError();
    });

    it('greaterThan works', function() {
        expect(CesiumMath.greaterThan(1.0, 2.0, 0.2)).toBe(false);
        expect(CesiumMath.greaterThan(2.0, 1.0, 0.2)).toBe(true);
        expect(CesiumMath.greaterThan(1.0, 1.0, 0.2)).toBe(false);
        expect(CesiumMath.greaterThan(1.0, 1.2, 0.2)).toBe(false);
        expect(CesiumMath.greaterThan(1.2, 1.0, 0.2)).toBe(false);
    });

    it('greaterThan throws for undefined left', function() {
        expect(function() {
            CesiumMath.greaterThan(undefined, 5.0, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('greaterThan throws for undefined right', function() {
        expect(function() {
            CesiumMath.greaterThan(1.0, undefined, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('greaterThan throws for undefined absoluteEpsilon', function() {
        expect(function() {
            CesiumMath.greaterThan(1.0, 5.0, undefined);
        }).toThrowDeveloperError();
    });

    it('greaterThanOrEquals works', function() {
        expect(CesiumMath.greaterThanOrEquals(1.0, 2.0, 0.2)).toBe(false);
        expect(CesiumMath.greaterThanOrEquals(2.0, 1.0, 0.2)).toBe(true);
        expect(CesiumMath.greaterThanOrEquals(1.0, 1.0, 0.2)).toBe(true);
        expect(CesiumMath.greaterThanOrEquals(1.0, 1.2, 0.2)).toBe(true);
        expect(CesiumMath.greaterThanOrEquals(1.2, 1.0, 0.2)).toBe(true);
    });

    it('greaterThanOrEquals throws for undefined left', function() {
        expect(function() {
            CesiumMath.greaterThanOrEquals(undefined, 5.0, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('greaterThanOrEquals throws for undefined right', function() {
        expect(function() {
            CesiumMath.greaterThanOrEquals(1.0, undefined, CesiumMath.EPSILON16);
        }).toThrowDeveloperError();
    });

    it('greaterThanOrEquals throws for undefined absoluteEpsilon', function() {
        expect(function() {
            CesiumMath.greaterThanOrEquals(1.0, 5.0, undefined);
        }).toThrowDeveloperError();
    });

    it('factorial produces the correct results', function() {
        var factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000, 6402373705728000,
                          121645100408832000, 2432902008176640000, 51090942171709440000, 1124000727777607680000, 25852016738884976640000, 620448401733239439360000];

        var length = factorials.length;
        var i;
        var indices = [];

        // Populate indices array
        for (i = 0; i < length; i++) {
            indices.push(i);
        }

        // Randomize the indices array
        for (i = 0; i < length; i++) {
            var tmp = indices[i];
            var randomIndex = Math.floor(Math.random() * length);
            indices[i] = indices[randomIndex];
            indices[randomIndex] = tmp;
        }

        for (i = 0; i < length; i++) {
            var index = indices[i];
            expect(CesiumMath.factorial(index)).toEqual(factorials[index]);
        }
    });

    it('incrementWrap correctly increments and wraps', function() {
        expect(CesiumMath.incrementWrap(5, 10, 0)).toEqual(6);
        expect(CesiumMath.incrementWrap(10, 10, 0)).toEqual(0);
        expect(CesiumMath.incrementWrap(10, 10)).toEqual(0);
    });

    it('incrementWrap throws for undefined', function() {
        expect(function() {
            CesiumMath.incrementWrap();
        }).toThrowDeveloperError();
    });

    it('isPowerOfTwo finds powers of two', function() {
        expect(CesiumMath.isPowerOfTwo(1)).toEqual(true);
        expect(CesiumMath.isPowerOfTwo(2)).toEqual(true);
        expect(CesiumMath.isPowerOfTwo(4)).toEqual(true);
        expect(CesiumMath.isPowerOfTwo(8)).toEqual(true);
        expect(CesiumMath.isPowerOfTwo(16)).toEqual(true);
        expect(CesiumMath.isPowerOfTwo(256)).toEqual(true);
        expect(CesiumMath.isPowerOfTwo(1024)).toEqual(true);
        expect(CesiumMath.isPowerOfTwo(16 * 1024)).toEqual(true);
    });

    it('isPowerOfTwo does not find powers of two', function() {
        expect(CesiumMath.isPowerOfTwo(0)).toEqual(false);
        expect(CesiumMath.isPowerOfTwo(3)).toEqual(false);
        expect(CesiumMath.isPowerOfTwo(5)).toEqual(false);
        expect(CesiumMath.isPowerOfTwo(12)).toEqual(false);
    });

    it('nextPowerOfTwo finds next power of two', function() {
        expect(CesiumMath.nextPowerOfTwo(0)).toEqual(0);
        expect(CesiumMath.nextPowerOfTwo(257)).toEqual(512);
        expect(CesiumMath.nextPowerOfTwo(512)).toEqual(512);
        expect(CesiumMath.nextPowerOfTwo(1023)).toEqual(1024);
    });

    it('factorial throws for non-numbers', function() {
        expect(function() {
            CesiumMath.factorial({});
        }).toThrowDeveloperError();
    });

    it('factorial throws for negative numbers', function() {
        expect(function() {
            CesiumMath.factorial(-1);
        }).toThrowDeveloperError();
    });

    it('factorial throws for undefined', function() {
        expect(function() {
            CesiumMath.factorial();
        }).toThrowDeveloperError();
    });

    it('incrementWrap throws for minimum value >= maximum value', function() {
        expect(function() {
            CesiumMath.incrementWrap(5, 0, 10);
        }).toThrowDeveloperError();
        expect(function() {
            CesiumMath.incrementWrap(5, 10, 10);
        }).toThrowDeveloperError();
    });

    it('isPowerOfTwo throws for non-numbers', function() {
        expect(function() {
            CesiumMath.isPowerOfTwo({});
        }).toThrowDeveloperError();
    });

    it('isPowerOfTwo throws for negative numbers', function() {
        expect(function() {
            CesiumMath.isPowerOfTwo(-1);
        }).toThrowDeveloperError();
    });

    it('isPowerOfTwo throws for undefined', function() {
        expect(function() {
            CesiumMath.isPowerOfTwo();
        }).toThrowDeveloperError();
    });

    it('nextPowerOfTwo throws for non-numbers', function() {
        expect(function() {
            CesiumMath.nextPowerOfTwo({});
        }).toThrowDeveloperError();
    });

    it('nextPowerOfTwo throws for negative numbers', function() {
        expect(function() {
            CesiumMath.nextPowerOfTwo(-1);
        }).toThrowDeveloperError();
    });

    it('nextPowerOfTwo throws for undefined', function() {
        expect(function() {
            CesiumMath.nextPowerOfTwo();
        }).toThrowDeveloperError();
    });

    it('clamp throws for undefined', function() {
        expect(function() {
            CesiumMath.clamp();
        }).toThrowDeveloperError();
    });

    it('acosClamped returns acos for normal values', function() {
        expect(CesiumMath.acosClamped(0.5)).toBe(Math.acos(0.5));
        expect(CesiumMath.acosClamped(0.123)).toBe(Math.acos(0.123));
        expect(CesiumMath.acosClamped(-0.123)).toBe(Math.acos(-0.123));
        expect(CesiumMath.acosClamped(-1.0)).toBe(Math.acos(-1.0));
        expect(CesiumMath.acosClamped(1.0)).toBe(Math.acos(1.0));
    });

    it('acosClamped returns acos of clamped value when value is outside the valid range', function() {
        expect(CesiumMath.acosClamped(-1.01)).toBe(Math.acos(-1.0));
        expect(CesiumMath.acosClamped(1.01)).toBe(Math.acos(1.0));
    });

    it('acosClamped throws without value', function() {
        expect(function() {
            CesiumMath.acosClamped();
        }).toThrowDeveloperError();
    });

    it('asinClamped returns asin for normal values', function() {
        expect(CesiumMath.asinClamped(0.5)).toBe(Math.asin(0.5));
        expect(CesiumMath.asinClamped(0.123)).toBe(Math.asin(0.123));
        expect(CesiumMath.asinClamped(-0.123)).toBe(Math.asin(-0.123));
        expect(CesiumMath.asinClamped(-1.0)).toBe(Math.asin(-1.0));
        expect(CesiumMath.asinClamped(1.0)).toBe(Math.asin(1.0));
    });

    it('asinClamped returns asin of clamped value when value is outside the valid range', function() {
        expect(CesiumMath.asinClamped(-1.01)).toBe(Math.asin(-1.0));
        expect(CesiumMath.asinClamped(1.01)).toBe(Math.asin(1.0));
    });

    it('asinClamped throws without value', function() {
        expect(function() {
            CesiumMath.asinClamped();
        }).toThrowDeveloperError();
    });

    it('chordLength finds the chord length', function() {
        expect(CesiumMath.chordLength(CesiumMath.PI_OVER_THREE, 1.0)).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(CesiumMath.chordLength(CesiumMath.PI_OVER_THREE, 5.0)).toEqualEpsilon(5.0, CesiumMath.EPSILON14);
        expect(CesiumMath.chordLength(2.0 * CesiumMath.PI_OVER_THREE, 1.0)).toEqualEpsilon(Math.sqrt(3.0), CesiumMath.EPSILON14);
        expect(CesiumMath.chordLength(2.0 * CesiumMath.PI_OVER_THREE, 5.0)).toEqualEpsilon(5.0 * Math.sqrt(3.0), CesiumMath.EPSILON14);
        expect(CesiumMath.chordLength(CesiumMath.PI, 10.0)).toEqualEpsilon(2.0 * 10.0, CesiumMath.EPSILON14);
    });

    it('chordLength throws without angle', function() {
        expect(function() {
            CesiumMath.chordLength(undefined, 1.0);
        }).toThrowDeveloperError();
    });

    it('chordLength throws without radius', function() {
        expect(function() {
            CesiumMath.chordLength(0.0, undefined);
        }).toThrowDeveloperError();
    });

    it('logBase', function() {
        expect(CesiumMath.logBase(64, 4)).toEqual(3);
    });

    it('logBase throws without number', function() {
        expect(function() {
            CesiumMath.logBase(undefined);
        }).toThrowDeveloperError();
    });

    it('logBase throws without base', function() {
        expect(function() {
            CesiumMath.logBase(64, undefined);
        }).toThrowDeveloperError();
    });

    it('cbrt', function() {
        expect(CesiumMath.cbrt(27.0)).toEqual(3.0);
        expect(CesiumMath.cbrt(-27.0)).toEqual(-3.0);
        expect(CesiumMath.cbrt(0.0)).toEqual(0.0);
        expect(CesiumMath.cbrt(1.0)).toEqual(1.0);
        expect(CesiumMath.cbrt()).toEqual(NaN);
    });

    it('fastApproximateAtan', function() {
        expect(CesiumMath.fastApproximateAtan(0.0)).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        expect(CesiumMath.fastApproximateAtan(1.0)).toEqualEpsilon(CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON3);
        expect(CesiumMath.fastApproximateAtan(-1.0)).toEqualEpsilon(-CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON3);
    });

    it('fastApproximateAtan2', function() {
        expect(CesiumMath.fastApproximateAtan2(1.0, 0.0)).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        expect(CesiumMath.fastApproximateAtan2(1.0, 1.0)).toEqualEpsilon(CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON3);
        expect(CesiumMath.fastApproximateAtan2(-1.0, 1.0)).toEqualEpsilon(CesiumMath.PI_OVER_FOUR + CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON3);
    });

    it('fastApproximateAtan2 throws if both arguments are zero', function() {
        expect(function() {
            CesiumMath.fastApproximateAtan2(0, 0);
        }).toThrowDeveloperError();
    });
});
