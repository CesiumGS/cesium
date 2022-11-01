import { Math as CesiumMath } from "../../index.js";

describe("Core/Math", function () {
  it("sign of -2", function () {
    expect(CesiumMath.sign(-2)).toEqual(-1);
  });

  it("sign of 2", function () {
    expect(CesiumMath.sign(2)).toEqual(1);
  });

  it("sign of 0", function () {
    expect(CesiumMath.sign(0)).toEqual(0);
  });

  it("sign of -0", function () {
    expect(CesiumMath.sign(-0)).toEqual(-0);
  });

  it("sign of NaN", function () {
    expect(CesiumMath.sign(NaN)).toBeNaN();
  });

  it("signNotZero of -2", function () {
    expect(CesiumMath.signNotZero(-2)).toEqual(-1);
  });

  it("signNotZero of 2", function () {
    expect(CesiumMath.signNotZero(2)).toEqual(1);
  });

  it("signNotZero of 0", function () {
    expect(CesiumMath.signNotZero(0)).toEqual(1);
  });

  //////////////////////////////////////////////////////////////////////
  it("toSNorm -1.0", function () {
    expect(CesiumMath.toSNorm(-1.0)).toEqual(0);
  });

  it("toSNorm 1.0", function () {
    expect(CesiumMath.toSNorm(1.0)).toEqual(255);
  });

  it("toSNorm -1.0001", function () {
    expect(CesiumMath.toSNorm(-1.0001)).toEqual(0);
  });

  it("toSNorm 1.0001", function () {
    expect(CesiumMath.toSNorm(1.0001)).toEqual(255);
  });

  it("toSNorm 0.0", function () {
    expect(CesiumMath.toSNorm(0.0)).toEqual(128);
  });

  it("fromSNorm 0", function () {
    expect(CesiumMath.fromSNorm(0)).toEqual(-1.0);
  });

  it("fromSNorm 255", function () {
    expect(CesiumMath.fromSNorm(255)).toEqual(1.0);
  });

  it("fromSNorm -0.0001", function () {
    expect(CesiumMath.fromSNorm(-0.0001)).toEqual(-1.0);
  });

  it("fromSNorm 255.00001", function () {
    expect(CesiumMath.fromSNorm(255.00001)).toEqual(1.0);
  });

  it("fromSNorm 128", function () {
    expect(CesiumMath.fromSNorm(255.0 / 2)).toEqual(0.0);
  });

  //////////////////////////////////////////////////////////////////////
  it("normalize 0 with max 10 min -10", function () {
    expect(CesiumMath.normalize(0, -10, 10)).toEqual(0.5);
  });

  it("normalize 10 with max 10 min -10", function () {
    expect(CesiumMath.normalize(10, -10, 10)).toEqual(1.0);
  });

  it("normalize -10 with max 10 min -10", function () {
    expect(CesiumMath.normalize(-10, -10, 10)).toEqual(0.0);
  });

  it("normalize -10.0001 with max 10 min -10", function () {
    expect(CesiumMath.normalize(-10.0001, -10, 10)).toEqual(0.0);
  });

  it("normalize 10.00001 with max 10 min -10", function () {
    expect(CesiumMath.normalize(10.00001, -10, 10)).toEqual(1.0);
  });

  //////////////////////////////////////////////////////////////////////

  it("cosh", function () {
    expect(CesiumMath.cosh(0.0)).toEqual(1.0);
    expect(CesiumMath.cosh(-1.0)).toBeGreaterThan(1.0);
    expect(CesiumMath.cosh(1.0)).toBeGreaterThan(1.0);
  });

  it("cosh NaN", function () {
    expect(isNaN(CesiumMath.cosh(NaN))).toEqual(true);
  });

  it("cosh infinity", function () {
    expect(CesiumMath.cosh(Infinity)).toEqual(Infinity);
    expect(CesiumMath.cosh(-Infinity)).toEqual(Infinity);
  });

  it("sinh", function () {
    expect(CesiumMath.sinh(0.0)).toEqual(0.0);
    expect(CesiumMath.sinh(-1.0)).toBeLessThan(1.0);
    expect(CesiumMath.sinh(1.0)).toBeGreaterThan(1.0);
  });

  it("sinh NaN", function () {
    expect(isNaN(CesiumMath.sinh(NaN))).toEqual(true);
  });

  it("sinh infinity", function () {
    expect(CesiumMath.sinh(Infinity)).toEqual(Infinity);
    expect(CesiumMath.sinh(-Infinity)).toEqual(-Infinity);
  });

  ///////////////////////////////////////////////////////////////////////

  it("lerps at time 0", function () {
    expect(CesiumMath.lerp(1.0, 2.0, 0.0)).toEqual(1.0);
  });

  it("lerps at time 0.5", function () {
    expect(CesiumMath.lerp(1.0, 2.0, 0.5)).toEqual(1.5);
  });

  it("lerps at time 1", function () {
    expect(CesiumMath.lerp(1.0, 2.0, 1.0)).toEqual(2.0);
  });

  ///////////////////////////////////////////////////////////////////////

  it("toRadians", function () {
    expect(CesiumMath.toRadians(360.0)).toEqual(2 * Math.PI);
  });

  it("toRadians throws for undefined", function () {
    expect(function () {
      CesiumMath.toRadians();
    }).toThrowDeveloperError();
  });

  it("toDegrees", function () {
    expect(CesiumMath.toDegrees(Math.PI)).toEqual(180.0);
  });

  it("toDegrees throws for undefined", function () {
    expect(function () {
      CesiumMath.toDegrees();
    }).toThrowDeveloperError();
  });

  it("convertLongitudeRange (1)", function () {
    expect(
      CesiumMath.convertLongitudeRange(CesiumMath.THREE_PI_OVER_TWO)
    ).toEqualEpsilon(-CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON16);
  });

  it("convertLongitudeRange (2)", function () {
    expect(CesiumMath.convertLongitudeRange(-Math.PI)).toEqualEpsilon(
      -Math.PI,
      CesiumMath.EPSILON16
    );
  });

  it("convertLongitudeRange (3)", function () {
    expect(CesiumMath.convertLongitudeRange(Math.PI)).toEqualEpsilon(
      -Math.PI,
      CesiumMath.EPSILON16
    );
  });

  it("convertLongitudeRange throws for undefined", function () {
    expect(function () {
      CesiumMath.convertLongitudeRange();
    }).toThrowDeveloperError();
  });

  it("clampToLatitudeRange (1)", function () {
    expect(CesiumMath.clampToLatitudeRange(Math.PI)).toEqual(
      CesiumMath.PI_OVER_TWO
    );
  });

  it("clampToLatitudeRange (2)", function () {
    expect(CesiumMath.clampToLatitudeRange(-Math.PI)).toEqual(
      -CesiumMath.PI_OVER_TWO
    );
  });

  it("clampToLatitudeRange throws for undefined", function () {
    expect(function () {
      CesiumMath.clampToLatitudeRange();
    }).toThrowDeveloperError();
  });

  it("negativePiToPi", function () {
    expect(CesiumMath.negativePiToPi(0.0)).toEqual(0.0);
    expect(CesiumMath.negativePiToPi(+Math.PI)).toEqual(+Math.PI);
    expect(CesiumMath.negativePiToPi(-Math.PI)).toEqual(-Math.PI);
    expect(CesiumMath.negativePiToPi(+Math.PI - 1.0)).toEqual(+Math.PI - 1.0);
    expect(CesiumMath.negativePiToPi(-Math.PI + 1.0)).toEqual(-Math.PI + 1.0);
    expect(CesiumMath.negativePiToPi(+Math.PI - 0.1)).toEqual(+Math.PI - 0.1);
    expect(CesiumMath.negativePiToPi(-Math.PI + 0.1)).toEqual(-Math.PI + 0.1);
    expect(CesiumMath.negativePiToPi(+Math.PI + 0.1)).toEqualEpsilon(
      -Math.PI + 0.1,
      CesiumMath.EPSILON15
    );
    expect(CesiumMath.negativePiToPi(-Math.PI - 0.1)).toEqualEpsilon(
      +Math.PI - 0.1,
      CesiumMath.EPSILON15
    );

    expect(CesiumMath.negativePiToPi(+2.0 * Math.PI)).toEqual(0.0);
    expect(CesiumMath.negativePiToPi(-2.0 * Math.PI)).toEqual(0.0);
    expect(CesiumMath.negativePiToPi(+3.0 * Math.PI)).toEqual(Math.PI);
    expect(CesiumMath.negativePiToPi(-3.0 * Math.PI)).toEqual(Math.PI);
    expect(CesiumMath.negativePiToPi(+4.0 * Math.PI)).toEqual(0.0);
    expect(CesiumMath.negativePiToPi(-4.0 * Math.PI)).toEqual(0.0);
    expect(CesiumMath.negativePiToPi(+5.0 * Math.PI)).toEqual(Math.PI);
    expect(CesiumMath.negativePiToPi(-5.0 * Math.PI)).toEqual(Math.PI);
    expect(CesiumMath.negativePiToPi(+6.0 * Math.PI)).toEqual(0.0);
    expect(CesiumMath.negativePiToPi(-6.0 * Math.PI)).toEqual(0.0);
  });

  it("negativePiToPi throws for undefined", function () {
    expect(function () {
      CesiumMath.negativePiToPi();
    }).toThrowDeveloperError();
  });

  it("zeroToTwoPi", function () {
    expect(CesiumMath.zeroToTwoPi(0.0)).toEqual(0.0);
    expect(CesiumMath.zeroToTwoPi(+Math.PI)).toEqual(+Math.PI);
    expect(CesiumMath.zeroToTwoPi(-Math.PI)).toEqual(+Math.PI);
    expect(CesiumMath.zeroToTwoPi(+Math.PI - 1.0)).toEqual(+Math.PI - 1.0);
    expect(CesiumMath.zeroToTwoPi(-Math.PI + 1.0)).toEqualEpsilon(
      +Math.PI + 1.0,
      CesiumMath.EPSILON15
    );
    expect(CesiumMath.zeroToTwoPi(+Math.PI - 0.1)).toEqual(+Math.PI - 0.1);
    expect(CesiumMath.zeroToTwoPi(-Math.PI + 0.1)).toEqualEpsilon(
      +Math.PI + 0.1,
      CesiumMath.EPSILON15
    );
    expect(CesiumMath.zeroToTwoPi(+Math.PI + 0.1)).toEqual(+Math.PI + 0.1);
    expect(CesiumMath.zeroToTwoPi(-Math.PI - 0.1)).toEqualEpsilon(
      +Math.PI - 0.1,
      CesiumMath.EPSILON15
    );

    expect(CesiumMath.zeroToTwoPi(+2.0 * Math.PI)).toEqual(2.0 * Math.PI);
    expect(CesiumMath.zeroToTwoPi(-2.0 * Math.PI)).toEqual(2.0 * Math.PI);
    expect(CesiumMath.zeroToTwoPi(+3.0 * Math.PI)).toEqual(Math.PI);
    expect(CesiumMath.zeroToTwoPi(-3.0 * Math.PI)).toEqual(Math.PI);
    expect(CesiumMath.zeroToTwoPi(+4.0 * Math.PI)).toEqual(2.0 * Math.PI);
    expect(CesiumMath.zeroToTwoPi(-4.0 * Math.PI)).toEqual(2.0 * Math.PI);
    expect(CesiumMath.zeroToTwoPi(+5.0 * Math.PI)).toEqual(Math.PI);
    expect(CesiumMath.zeroToTwoPi(-5.0 * Math.PI)).toEqual(Math.PI);
    expect(CesiumMath.zeroToTwoPi(+6.0 * Math.PI)).toEqual(2.0 * Math.PI);
    expect(CesiumMath.zeroToTwoPi(-6.0 * Math.PI)).toEqual(2.0 * Math.PI);
  });

  it("zeroToTwoPi throws for undefined", function () {
    expect(function () {
      CesiumMath.zeroToTwoPi();
    }).toThrowDeveloperError();
  });

  it("mod", function () {
    expect(CesiumMath.mod(0.0, 1.0)).toEqual(0.0);
    expect(CesiumMath.mod(0.1, 1.0)).toEqual(0.1);
    expect(CesiumMath.mod(0.5, 1.0)).toEqual(0.5);
    expect(CesiumMath.mod(1.0, 1.0)).toEqual(0.0);
    expect(CesiumMath.mod(1.1, 1.0)).toEqualEpsilon(0.1, CesiumMath.EPSILON15);

    expect(CesiumMath.mod(-0.0, 1.0)).toEqual(0.0);
    expect(CesiumMath.mod(-0.1, 1.0)).toEqual(0.9);
    expect(CesiumMath.mod(-0.5, 1.0)).toEqual(0.5);
    expect(CesiumMath.mod(-1.0, 1.0)).toEqual(0.0);
    expect(CesiumMath.mod(-1.1, 1.0)).toEqualEpsilon(0.9, CesiumMath.EPSILON15);

    expect(CesiumMath.mod(0.0, -1.0)).toEqual(-0.0);
    expect(CesiumMath.mod(0.1, -1.0)).toEqual(-0.9);
    expect(CesiumMath.mod(0.5, -1.0)).toEqual(-0.5);
    expect(CesiumMath.mod(1.0, -1.0)).toEqual(-0.0);
    expect(CesiumMath.mod(1.1, -1.0)).toEqualEpsilon(
      -0.9,
      CesiumMath.EPSILON15
    );

    expect(CesiumMath.mod(-0.0, -1.0)).toEqual(-0.0);
    expect(CesiumMath.mod(-0.1, -1.0)).toEqual(-0.1);
    expect(CesiumMath.mod(-0.5, -1.0)).toEqual(-0.5);
    expect(CesiumMath.mod(-1.0, -1.0)).toEqual(-0.0);
    expect(CesiumMath.mod(-1.1, -1.0)).toEqualEpsilon(
      -0.1,
      CesiumMath.EPSILON15
    );
  });

  it("mod throws for divisor of 0", function () {
    expect(function () {
      CesiumMath.mod(1.0, 0.0);
    }).toThrowDeveloperError();
  });

  it("equalsEpsilon", function () {
    expect(CesiumMath.equalsEpsilon(1.0, 1.0, 0.0)).toEqual(true);
    expect(CesiumMath.equalsEpsilon(1.0, 1.0, 1.0)).toEqual(true);
    expect(
      CesiumMath.equalsEpsilon(
        1.0,
        1.0 + CesiumMath.EPSILON7,
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      CesiumMath.equalsEpsilon(
        1.0,
        1.0 + CesiumMath.EPSILON7,
        CesiumMath.EPSILON9
      )
    ).toEqual(false);

    expect(CesiumMath.equalsEpsilon(3000000.0, 3000000.0, 0.0)).toEqual(true);
    expect(
      CesiumMath.equalsEpsilon(3000000.0, 3000000.0, CesiumMath.EPSILON7)
    ).toEqual(true);
    expect(
      CesiumMath.equalsEpsilon(3000000.0, 3000000.2, CesiumMath.EPSILON7)
    ).toEqual(true);
    expect(
      CesiumMath.equalsEpsilon(3000000.0, 3000000.2, CesiumMath.EPSILON9)
    ).toEqual(false);
  });

  it("equalsEpsilon throws for undefined left", function () {
    expect(function () {
      CesiumMath.equalsEpsilon(undefined, 5.0, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("equalsEpsilon throws for undefined right", function () {
    expect(function () {
      CesiumMath.equalsEpsilon(1.0, undefined, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("equalsEpsilon throws for undefined", function () {
    expect(function () {
      CesiumMath.equalsEpsilon();
    }).toThrowDeveloperError();
  });

  it("lessThan works", function () {
    expect(CesiumMath.lessThan(1.0, 2.0, 0.2)).toBe(true);
    expect(CesiumMath.lessThan(2.0, 1.0, 0.2)).toBe(false);
    expect(CesiumMath.lessThan(1.0, 1.0, 0.2)).toBe(false);
    expect(CesiumMath.lessThan(1.0, 1.2, 0.2)).toBe(false);
    expect(CesiumMath.lessThan(1.2, 1.0, 0.2)).toBe(false);
  });

  it("lessThan throws for undefined left", function () {
    expect(function () {
      CesiumMath.lessThan(undefined, 5.0, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("lessThan throws for undefined right", function () {
    expect(function () {
      CesiumMath.lessThan(1.0, undefined, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("lessThan throws for undefined absoluteEpsilon", function () {
    expect(function () {
      CesiumMath.lessThan(1.0, 5.0, undefined);
    }).toThrowDeveloperError();
  });

  it("lessThanOrEquals works", function () {
    expect(CesiumMath.lessThanOrEquals(1.0, 2.0, 0.2)).toBe(true);
    expect(CesiumMath.lessThanOrEquals(2.0, 1.0, 0.2)).toBe(false);
    expect(CesiumMath.lessThanOrEquals(1.0, 1.0, 0.2)).toBe(true);
    expect(CesiumMath.lessThanOrEquals(1.0, 1.2, 0.2)).toBe(true);
    expect(CesiumMath.lessThanOrEquals(1.2, 1.0, 0.2)).toBe(true);
  });

  it("lessThanOrEquals throws for undefined left", function () {
    expect(function () {
      CesiumMath.lessThanOrEquals(undefined, 5.0, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("lessThanOrEquals throws for undefined right", function () {
    expect(function () {
      CesiumMath.lessThanOrEquals(1.0, undefined, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("lessThanOrEquals throws for undefined absoluteEpsilon", function () {
    expect(function () {
      CesiumMath.lessThanOrEquals(1.0, 5.0, undefined);
    }).toThrowDeveloperError();
  });

  it("greaterThan works", function () {
    expect(CesiumMath.greaterThan(1.0, 2.0, 0.2)).toBe(false);
    expect(CesiumMath.greaterThan(2.0, 1.0, 0.2)).toBe(true);
    expect(CesiumMath.greaterThan(1.0, 1.0, 0.2)).toBe(false);
    expect(CesiumMath.greaterThan(1.0, 1.2, 0.2)).toBe(false);
    expect(CesiumMath.greaterThan(1.2, 1.0, 0.2)).toBe(false);
  });

  it("greaterThan throws for undefined left", function () {
    expect(function () {
      CesiumMath.greaterThan(undefined, 5.0, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("greaterThan throws for undefined right", function () {
    expect(function () {
      CesiumMath.greaterThan(1.0, undefined, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("greaterThan throws for undefined absoluteEpsilon", function () {
    expect(function () {
      CesiumMath.greaterThan(1.0, 5.0, undefined);
    }).toThrowDeveloperError();
  });

  it("greaterThanOrEquals works", function () {
    expect(CesiumMath.greaterThanOrEquals(1.0, 2.0, 0.2)).toBe(false);
    expect(CesiumMath.greaterThanOrEquals(2.0, 1.0, 0.2)).toBe(true);
    expect(CesiumMath.greaterThanOrEquals(1.0, 1.0, 0.2)).toBe(true);
    expect(CesiumMath.greaterThanOrEquals(1.0, 1.2, 0.2)).toBe(true);
    expect(CesiumMath.greaterThanOrEquals(1.2, 1.0, 0.2)).toBe(true);
  });

  it("greaterThanOrEquals throws for undefined left", function () {
    expect(function () {
      CesiumMath.greaterThanOrEquals(undefined, 5.0, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("greaterThanOrEquals throws for undefined right", function () {
    expect(function () {
      CesiumMath.greaterThanOrEquals(1.0, undefined, CesiumMath.EPSILON16);
    }).toThrowDeveloperError();
  });

  it("greaterThanOrEquals throws for undefined absoluteEpsilon", function () {
    expect(function () {
      CesiumMath.greaterThanOrEquals(1.0, 5.0, undefined);
    }).toThrowDeveloperError();
  });

  it("factorial produces the correct results", function () {
    const factorials = [
      1,
      1,
      2,
      6,
      24,
      120,
      720,
      5040,
      40320,
      362880,
      3628800,
      39916800,
      479001600,
      6227020800,
      87178291200,
      1307674368000,
      20922789888000,
      355687428096000,
      6402373705728000,
      121645100408832000,
      2432902008176640000,
      51090942171709440000,
      1124000727777607680000,
      // eslint-disable-next-line no-loss-of-precision
      25852016738884976640000,
      // eslint-disable-next-line no-loss-of-precision
      620448401733239439360000,
    ];

    const length = factorials.length;
    let i;
    const indices = [];

    // Populate indices array
    for (i = 0; i < length; i++) {
      indices.push(i);
    }

    // Randomize the indices array
    for (i = 0; i < length; i++) {
      const tmp = indices[i];
      const randomIndex = Math.floor(Math.random() * length);
      indices[i] = indices[randomIndex];
      indices[randomIndex] = tmp;
    }

    for (i = 0; i < length; i++) {
      const index = indices[i];
      expect(CesiumMath.factorial(index)).toEqual(factorials[index]);
    }
  });

  it("incrementWrap correctly increments and wraps", function () {
    expect(CesiumMath.incrementWrap(5, 10, 0)).toEqual(6);
    expect(CesiumMath.incrementWrap(10, 10, 0)).toEqual(0);
    expect(CesiumMath.incrementWrap(10, 10)).toEqual(0);
  });

  it("incrementWrap throws for undefined", function () {
    expect(function () {
      CesiumMath.incrementWrap();
    }).toThrowDeveloperError();
  });

  it("isPowerOfTwo finds powers of two", function () {
    // Test all power of twos from 1 to 2^31
    for (let i = 0; i < 32; i++) {
      const powerOfTwo = (1 << i) >>> 0; // `>>>` converts to unsigned
      expect(CesiumMath.isPowerOfTwo(powerOfTwo)).toEqual(true);
    }
  });

  it("isPowerOfTwo does not find powers of two", function () {
    expect(CesiumMath.isPowerOfTwo(0)).toEqual(false);
    expect(CesiumMath.isPowerOfTwo(3)).toEqual(false);
    expect(CesiumMath.isPowerOfTwo(5)).toEqual(false);
    expect(CesiumMath.isPowerOfTwo(12)).toEqual(false);
    expect(CesiumMath.isPowerOfTwo(4294967295)).toEqual(false); // (2^32)-1
  });

  it("nextPowerOfTwo finds next power of two", function () {
    expect(CesiumMath.nextPowerOfTwo(0)).toEqual(0);
    expect(CesiumMath.nextPowerOfTwo(1)).toEqual(1);
    expect(CesiumMath.nextPowerOfTwo(2)).toEqual(2);
    expect(CesiumMath.nextPowerOfTwo(3)).toEqual(4);
    expect(CesiumMath.nextPowerOfTwo(257)).toEqual(512);
    expect(CesiumMath.nextPowerOfTwo(512)).toEqual(512);
    expect(CesiumMath.nextPowerOfTwo(1023)).toEqual(1024);
    expect(CesiumMath.nextPowerOfTwo(1073741825)).toEqual(2147483648); // (2^30)+1 -> 2^31
    expect(CesiumMath.nextPowerOfTwo(2147483647)).toEqual(2147483648); // (2^31)-1 -> 2^31
    expect(CesiumMath.nextPowerOfTwo(2147483648)).toEqual(2147483648); // 2^31 -> 2^31
  });

  it("previousPowerOfTwo finds previous power of two", function () {
    expect(CesiumMath.previousPowerOfTwo(0)).toEqual(0);
    expect(CesiumMath.previousPowerOfTwo(1)).toEqual(1);
    expect(CesiumMath.previousPowerOfTwo(2)).toEqual(2);
    expect(CesiumMath.previousPowerOfTwo(3)).toEqual(2);
    expect(CesiumMath.previousPowerOfTwo(257)).toEqual(256);
    expect(CesiumMath.previousPowerOfTwo(512)).toEqual(512);
    expect(CesiumMath.previousPowerOfTwo(1023)).toEqual(512);
    expect(CesiumMath.previousPowerOfTwo(2147483648)).toEqual(2147483648); // 2^31 -> 2^31
    expect(CesiumMath.previousPowerOfTwo(2147483649)).toEqual(2147483648); // (2^31)+1 -> 2^31
    expect(CesiumMath.previousPowerOfTwo(4294967295)).toEqual(2147483648); // (2^32)-1 -> 2^31
  });

  it("factorial throws for non-numbers", function () {
    expect(function () {
      CesiumMath.factorial({});
    }).toThrowDeveloperError();
  });

  it("factorial throws for negative numbers", function () {
    expect(function () {
      CesiumMath.factorial(-1);
    }).toThrowDeveloperError();
  });

  it("factorial throws for undefined", function () {
    expect(function () {
      CesiumMath.factorial();
    }).toThrowDeveloperError();
  });

  it("incrementWrap throws for minimum value >= maximum value", function () {
    expect(function () {
      CesiumMath.incrementWrap(5, 0, 10);
    }).toThrowDeveloperError();
    expect(function () {
      CesiumMath.incrementWrap(5, 10, 10);
    }).toThrowDeveloperError();
  });

  it("isPowerOfTwo throws for non-numbers", function () {
    expect(function () {
      CesiumMath.isPowerOfTwo({});
    }).toThrowDeveloperError();
  });

  it("isPowerOfTwo throws for negative numbers", function () {
    expect(function () {
      CesiumMath.isPowerOfTwo(-1);
    }).toThrowDeveloperError();
  });

  it("isPowerOfTwo throws for numbers that exceed maximum 32-bit unsigned int", function () {
    expect(function () {
      return CesiumMath.isPowerOfTwo(4294967296); // 2^32
    }).toThrowDeveloperError();
  });

  it("isPowerOfTwo throws for undefined", function () {
    expect(function () {
      CesiumMath.isPowerOfTwo();
    }).toThrowDeveloperError();
  });

  it("nextPowerOfTwo throws for non-numbers", function () {
    expect(function () {
      CesiumMath.nextPowerOfTwo({});
    }).toThrowDeveloperError();
  });

  it("nextPowerOfTwo throws for negative numbers", function () {
    expect(function () {
      CesiumMath.nextPowerOfTwo(-1);
    }).toThrowDeveloperError();
  });

  it("nextPowerOfTwo throws for results that would exceed maximum 32-bit unsigned int", function () {
    expect(function () {
      return CesiumMath.nextPowerOfTwo(2147483649); // (2^31)+1
    }).toThrowDeveloperError();
  });

  it("nextPowerOfTwo throws for undefined", function () {
    expect(function () {
      CesiumMath.nextPowerOfTwo();
    }).toThrowDeveloperError();
  });

  it("previousPowerOfTwo throws for non-numbers", function () {
    expect(function () {
      CesiumMath.previousPowerOfTwo({});
    }).toThrowDeveloperError();
  });

  it("previousPowerOfTwo throws for negative numbers", function () {
    expect(function () {
      CesiumMath.previousPowerOfTwo(-1);
    }).toThrowDeveloperError();
  });

  it("previousPowerOfTwo throws for results that would exceed maximum 32-bit unsigned int", function () {
    expect(function () {
      return CesiumMath.previousPowerOfTwo(4294967296); // 2^32
    }).toThrowDeveloperError();
  });

  it("previousPowerOfTwo throws for undefined", function () {
    expect(function () {
      CesiumMath.previousPowerOfTwo();
    }).toThrowDeveloperError();
  });

  it("clamp throws for undefined", function () {
    expect(function () {
      CesiumMath.clamp();
    }).toThrowDeveloperError();
  });

  it("acosClamped returns acos for normal values", function () {
    expect(CesiumMath.acosClamped(0.5)).toBe(Math.acos(0.5));
    expect(CesiumMath.acosClamped(0.123)).toBe(Math.acos(0.123));
    expect(CesiumMath.acosClamped(-0.123)).toBe(Math.acos(-0.123));
    expect(CesiumMath.acosClamped(-1.0)).toBe(Math.acos(-1.0));
    expect(CesiumMath.acosClamped(1.0)).toBe(Math.acos(1.0));
  });

  it("acosClamped returns acos of clamped value when value is outside the valid range", function () {
    expect(CesiumMath.acosClamped(-1.01)).toBe(Math.acos(-1.0));
    expect(CesiumMath.acosClamped(1.01)).toBe(Math.acos(1.0));
  });

  it("acosClamped throws without value", function () {
    expect(function () {
      CesiumMath.acosClamped();
    }).toThrowDeveloperError();
  });

  it("asinClamped returns asin for normal values", function () {
    expect(CesiumMath.asinClamped(0.5)).toBe(Math.asin(0.5));
    expect(CesiumMath.asinClamped(0.123)).toBe(Math.asin(0.123));
    expect(CesiumMath.asinClamped(-0.123)).toBe(Math.asin(-0.123));
    expect(CesiumMath.asinClamped(-1.0)).toBe(Math.asin(-1.0));
    expect(CesiumMath.asinClamped(1.0)).toBe(Math.asin(1.0));
  });

  it("asinClamped returns asin of clamped value when value is outside the valid range", function () {
    expect(CesiumMath.asinClamped(-1.01)).toBe(Math.asin(-1.0));
    expect(CesiumMath.asinClamped(1.01)).toBe(Math.asin(1.0));
  });

  it("asinClamped throws without value", function () {
    expect(function () {
      CesiumMath.asinClamped();
    }).toThrowDeveloperError();
  });

  it("chordLength finds the chord length", function () {
    expect(
      CesiumMath.chordLength(CesiumMath.PI_OVER_THREE, 1.0)
    ).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
    expect(
      CesiumMath.chordLength(CesiumMath.PI_OVER_THREE, 5.0)
    ).toEqualEpsilon(5.0, CesiumMath.EPSILON14);
    expect(
      CesiumMath.chordLength(2.0 * CesiumMath.PI_OVER_THREE, 1.0)
    ).toEqualEpsilon(Math.sqrt(3.0), CesiumMath.EPSILON14);
    expect(
      CesiumMath.chordLength(2.0 * CesiumMath.PI_OVER_THREE, 5.0)
    ).toEqualEpsilon(5.0 * Math.sqrt(3.0), CesiumMath.EPSILON14);
    expect(CesiumMath.chordLength(CesiumMath.PI, 10.0)).toEqualEpsilon(
      2.0 * 10.0,
      CesiumMath.EPSILON14
    );
  });

  it("chordLength throws without angle", function () {
    expect(function () {
      CesiumMath.chordLength(undefined, 1.0);
    }).toThrowDeveloperError();
  });

  it("chordLength throws without radius", function () {
    expect(function () {
      CesiumMath.chordLength(0.0, undefined);
    }).toThrowDeveloperError();
  });

  it("logBase", function () {
    expect(CesiumMath.logBase(64, 4)).toEqual(3);
  });

  it("logBase throws without number", function () {
    expect(function () {
      CesiumMath.logBase(undefined);
    }).toThrowDeveloperError();
  });

  it("logBase throws without base", function () {
    expect(function () {
      CesiumMath.logBase(64, undefined);
    }).toThrowDeveloperError();
  });

  it("cbrt", function () {
    expect(CesiumMath.cbrt(27.0)).toEqual(3.0);
    expect(CesiumMath.cbrt(-27.0)).toEqual(-3.0);
    expect(CesiumMath.cbrt(0.0)).toEqual(0.0);
    expect(CesiumMath.cbrt(1.0)).toEqual(1.0);
    expect(CesiumMath.cbrt()).toEqual(NaN);
  });

  it("fastApproximateAtan", function () {
    expect(CesiumMath.fastApproximateAtan(0.0)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON3
    );
    expect(CesiumMath.fastApproximateAtan(1.0)).toEqualEpsilon(
      CesiumMath.PI_OVER_FOUR,
      CesiumMath.EPSILON3
    );
    expect(CesiumMath.fastApproximateAtan(-1.0)).toEqualEpsilon(
      -CesiumMath.PI_OVER_FOUR,
      CesiumMath.EPSILON3
    );
  });

  it("fastApproximateAtan2", function () {
    expect(CesiumMath.fastApproximateAtan2(1.0, 0.0)).toEqualEpsilon(
      0.0,
      CesiumMath.EPSILON3
    );
    expect(CesiumMath.fastApproximateAtan2(1.0, 1.0)).toEqualEpsilon(
      CesiumMath.PI_OVER_FOUR,
      CesiumMath.EPSILON3
    );
    expect(CesiumMath.fastApproximateAtan2(-1.0, 1.0)).toEqualEpsilon(
      CesiumMath.PI_OVER_FOUR + CesiumMath.PI_OVER_TWO,
      CesiumMath.EPSILON3
    );
  });

  it("fastApproximateAtan2 throws if both arguments are zero", function () {
    expect(function () {
      CesiumMath.fastApproximateAtan2(0, 0);
    }).toThrowDeveloperError();
  });
});
