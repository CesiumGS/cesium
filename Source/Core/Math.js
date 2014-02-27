/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        '../ThirdParty/mersenne-twister'
       ], function(
         defaultValue,
         defined,
         DeveloperError,
         MersenneTwister) {
    "use strict";

    /**
     * Math functions.
     * @exports CesiumMath
     */
    var CesiumMath = {};

    /**
     * 0.1
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON1 = 0.1;

    /**
     * 0.01
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON2 = 0.01;

    /**
     * 0.001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON3 = 0.001;

    /**
     * 0.0001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON4 = 0.0001;

    /**
     * 0.00001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON5 = 0.00001;

    /**
     * 0.000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON6 = 0.000001;

    /**
     * 0.0000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON7 = 0.0000001;

    /**
     * 0.00000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON8 = 0.00000001;

    /**
     * 0.000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON9 = 0.000000001;

    /**
     * 0.0000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON10 = 0.0000000001;

    /**
     * 0.00000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON11 = 0.00000000001;

    /**
     * 0.000000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON12 = 0.000000000001;

    /**
     * 0.0000000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON13 = 0.0000000000001;

    /**
     * 0.00000000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON14 = 0.00000000000001;

    /**
     * 0.000000000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON15 = 0.000000000000001;

    /**
     * 0.0000000000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON16 = 0.0000000000000001;

    /**
     * 0.00000000000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON17 = 0.00000000000000001;

    /**
     * 0.000000000000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON18 = 0.000000000000000001;

    /**
     * 0.0000000000000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON19 = 0.0000000000000000001;

    /**
     * 0.00000000000000000001
     * @type {Number}
     * @constant
     */
    CesiumMath.EPSILON20 = 0.00000000000000000001;

    /**
     * 3.986004418e14
     * @type {Number}
     * @constant
     */
    CesiumMath.GRAVITATIONALPARAMETER = 3.986004418e14;

    /**
     * Radius of the sun in meters: 6.955e8
     * @type {Number}
     * @constant
     */
    CesiumMath.SOLAR_RADIUS = 6.955e8;

    /**
     * The mean radius of the moon, according to the "Report of the IAU/IAG Working Group on
     * Cartographic Coordinates and Rotational Elements of the Planets and satellites: 2000",
     * Celestial Mechanics 82: 83-110, 2002.
     * @type {Number}
     * @constant
     */
    CesiumMath.LUNAR_RADIUS = 1737400.0;

    /**
     * 64 * 1024
     * @type {Number}
     * @constant
     */
    CesiumMath.SIXTY_FOUR_KILOBYTES = 64 * 1024;

    /**
     * Returns the sign of the value; 1 if the value is positive, -1 if the value is
     * negative, or 0 if the value is 0.
     *
     * @param {Number} value The value to return the sign of.
     *
     * @returns {Number} The sign of value.
     */
    CesiumMath.sign = function(value) {
        if (value > 0) {
            return 1;
        }
        if (value < 0) {
            return -1;
        }

        return 0;
    };

    /**
     * Returns the hyperbolic sine of a {@code Number}.
     * The hyperbolic sine of <em>value</em> is defined to be
     * (<em>e<sup>x</sup>&nbsp;-&nbsp;e<sup>-x</sup></em>)/2.0
     * where <i>e</i> is Euler's number, approximately 2.71828183.
     *
     * <p>Special cases:
     *   <ul>
     *     <li>If the argument is NaN, then the result is NaN.</li>
     *
     *     <li>If the argument is infinite, then the result is an infinity
     *     with the same sign as the argument.</li>
     *
     *     <li>If the argument is zero, then the result is a zero with the
     *     same sign as the argument.</li>
     *   </ul>
     *</p>
     *
     * @param value The number whose hyperbolic sine is to be returned.
     *
     * @returns The hyperbolic sine of {@code value}.
     */
    CesiumMath.sinh = function(value) {
        var part1 = Math.pow(Math.E, value);
        var part2 = Math.pow(Math.E, -1.0 * value);

        return (part1 - part2) * 0.5;
    };

    /**
     * Returns the hyperbolic cosine of a {@code Number}.
     * The hyperbolic cosine of <strong>value</strong> is defined to be
     * (<em>e<sup>x</sup>&nbsp;+&nbsp;e<sup>-x</sup></em>)/2.0
     * where <i>e</i> is Euler's number, approximately 2.71828183.
     *
     * <p>Special cases:
     *   <ul>
     *     <li>If the argument is NaN, then the result is NaN.</li>
     *
     *     <li>If the argument is infinite, then the result is positive infinity.</li>
     *
     *     <li>If the argument is zero, then the result is {@code 1.0}.</li>
     *   </ul>
     *</p>
     *
     * @param value The number whose hyperbolic cosine is to be returned.
     *
     * @returns The hyperbolic cosine of {@code value}.
     */
    CesiumMath.cosh = function(value) {
        var part1 = Math.pow(Math.E, value);
        var part2 = Math.pow(Math.E, -1.0 * value);

        return (part1 + part2) * 0.5;
    };

    /**
     * DOC_TBA
     */
    CesiumMath.lerp = function(p, q, time) {
        return ((1.0 - time) * p) + (time * q);
    };

    /**
     * pi
     *
     * @type {Number}
     * @constant
     * @see czm_pi
     */
    CesiumMath.PI = Math.PI;

    /**
     * 1/pi
     *
     * @type {Number}
     * @constant
     * @see czm_oneOverPi
     */
    CesiumMath.ONE_OVER_PI = 1.0 / Math.PI;

    /**
     * pi/2
     *
     * @type {Number}
     * @constant
     * @see czm_piOverTwo
     */
    CesiumMath.PI_OVER_TWO = Math.PI * 0.5;

    /**
     * pi/3
     *
     * @type {Number}
     * @constant
     * @see czm_piOverThree
     */
    CesiumMath.PI_OVER_THREE = Math.PI / 3.0;

    /**
     * pi/4
     *
     * @type {Number}
     * @constant
     * @see czm_piOverFour
     */
    CesiumMath.PI_OVER_FOUR = Math.PI / 4.0;

    /**
     * pi/6
     *
     * @type {Number}
     * @constant
     * @see czm_piOverSix
     */
    CesiumMath.PI_OVER_SIX = Math.PI / 6.0;

    /**
     * 3pi/2
     *
     * @type {Number}
     * @constant
     * @see czm_threePiOver2
     */
    CesiumMath.THREE_PI_OVER_TWO = (3.0 * Math.PI) * 0.5;

    /**
     * 2pi
     *
     * @type {Number}
     * @constant
     * @see czm_twoPi
     */
    CesiumMath.TWO_PI = 2.0 * Math.PI;

    /**
     * 1/2pi
     *
     * @type {Number}
     * @constant
     * @see czm_oneOverTwoPi
     */
    CesiumMath.ONE_OVER_TWO_PI = 1.0 / (2.0 * Math.PI);

    /**
     * The number of radians in a degree.
     *
     * @type {Number}
     * @constant
     * @default Math.PI / 180.0
     * @see czm_radiansPerDegree
     */
    CesiumMath.RADIANS_PER_DEGREE = Math.PI / 180.0;

    /**
     * The number of degrees in a radian.
     *
     * @type {Number}
     * @constant
     * @default 180.0 / Math.PI
     * @see czm_degreesPerRadian
     */
    CesiumMath.DEGREES_PER_RADIAN = 180.0 / Math.PI;

    /**
     * The number of radians in an arc second.
     *
     * @type {Number}
     * @constant
     * @default {@link CesiumMath.RADIANS_PER_DEGREE} / 3600.0
     * @see czm_radiansPerArcSecond
     */
    CesiumMath.RADIANS_PER_ARCSECOND = CesiumMath.RADIANS_PER_DEGREE / 3600.0;

    /**
     * Converts degrees to radians.
     * @param {Number} degrees The angle to convert in degrees.
     * @returns {Number} The corresponding angle in radians.
     */
    CesiumMath.toRadians = function(degrees) {
        return degrees * CesiumMath.RADIANS_PER_DEGREE;
    };

    /**
     * Converts radians to degrees.
     * @param {Number} radians The angle to convert in radians.
     * @returns {Number} The corresponding angle in degrees.
     */
    CesiumMath.toDegrees = function(radians) {
        return radians * CesiumMath.DEGREES_PER_RADIAN;
    };

    /**
     * Converts a longitude value, in radians, to the range [<code>-Math.PI</code>, <code>Math.PI</code>).
     *
     * @param {Number} angle The longitude value, in radians, to convert to the range [<code>-Math.PI</code>, <code>Math.PI</code>).
     *
     * @returns {Number} The equivalent longitude value in the range [<code>-Math.PI</code>, <code>Math.PI</code>).
     *
     * @example
     * // Convert 270 degrees to -90 degrees longitude
     * var longitude = Cesium.Math.convertLongitudeRange(Cesium.Math.toRadians(270.0));
     */
    CesiumMath.convertLongitudeRange = function(angle) {
        var twoPi = CesiumMath.TWO_PI;

        var simplified = angle - Math.floor(angle / twoPi) * twoPi;

        if (simplified < -Math.PI) {
            return simplified + twoPi;
        }
        if (simplified >= Math.PI) {
            return simplified - twoPi;
        }

        return simplified;
    };

    /**
     * Produces an angle in the range 0 <= angle <= 2Pi which is equivalent to the provided angle.
     * @param {Number} angle in radians
     * @returns {Number} The angle in the range ()<code>-CesiumMath.PI</code>, <code>CesiumMath.PI</code>).
     */
    CesiumMath.negativePiToPi = function(x) {
        var epsilon10 = CesiumMath.EPSILON10;
        var pi = CesiumMath.PI;
        var two_pi = CesiumMath.TWO_PI;
        while (x < -(pi + epsilon10)) {
            x += two_pi;
        }
        if (x < -pi) {
            return -pi;
        }
        while (x > pi + epsilon10) {
            x -= two_pi;
        }
        return x > pi ? pi : x;
    };

    /**
     * Produces an angle in the range -Pi <= angle <= Pi which is equivalent to the provided angle.
     * @param {Number} angle in radians
     * @returns {Number} The angle in the range (0 , <code>CesiumMath.TWO_PI</code>).
     */
    CesiumMath.zeroToTwoPi = function(x) {
        var value = x % CesiumMath.TWO_PI;
        // We do a second modules here if we add 2Pi to ensure that we don't have any numerical issues with very
        // small negative values.
        return (value < 0.0) ? (value + CesiumMath.TWO_PI) % CesiumMath.TWO_PI : value;
    };

    /**
     * DOC_TBA
     */
    CesiumMath.equalsEpsilon = function(left, right, epsilon) {
        epsilon = defaultValue(epsilon, 0.0);
        return Math.abs(left - right) <= epsilon;
    };

    var factorials = [1];

    /**
     * Computes the factorial of the provided number.
     *
     * @memberof CesiumMath
     *
     * @param {Number} n The number whose factorial is to be computed.
     *
     * @returns {Number} The factorial of the provided number or undefined if the number is less than 0.
     *
     * @see <a href='http://en.wikipedia.org/wiki/Factorial'>Factorial on Wikipedia</a>.
     *
     * @example
     * //Compute 7!, which is equal to 5040
     * var computedFactorial = Cesium.Math.factorial(7);
     *
     * @exception {DeveloperError} A number greater than or equal to 0 is required.
     */
    CesiumMath.factorial = function(n) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof n !== 'number' || n < 0) {
            throw new DeveloperError('A number greater than or equal to 0 is required.');
        }
        //>>includeEnd('debug');

        var length = factorials.length;
        if (n >= length) {
            var sum = factorials[length - 1];
            for ( var i = length; i <= n; i++) {
                factorials.push(sum * i);
            }
        }
        return factorials[n];
    };

    /**
     * Increments a number with a wrapping to a minimum value if the number exceeds the maximum value.
     *
     * @memberof CesiumMath
     *
     * @param {Number} [n] The number to be incremented.
     * @param {Number} [maximumValue] The maximum incremented value before rolling over to the minimum value.
     * @param {Number} [minimumValue=0.0] The number reset to after the maximum value has been exceeded.
     *
     * @returns {Number} The incremented number.
     *
     * @example
     * var n = Cesium.Math.incrementWrap(5, 10, 0); // returns 6
     * var n = Cesium.Math.incrementWrap(10, 10, 0); // returns 0
     *
     * @exception {DeveloperError} Maximum value must be greater than minimum value.
     */
    CesiumMath.incrementWrap = function(n, maximumValue, minimumValue) {
        minimumValue = defaultValue(minimumValue, 0.0);

        //>>includeStart('debug', pragmas.debug);
        if (maximumValue <= minimumValue) {
            throw new DeveloperError('Maximum value must be greater than minimum value.');
        }
        //>>includeEnd('debug');

        ++n;
        if (n > maximumValue) {
            n = minimumValue;
        }
        return n;
    };

    /**
     * Determines if a positive integer is a power of two.
     *
     * @memberof CesiumMath
     *
     * @param {Number} n The positive integer to test.
     *
     * @returns {Boolean} <code>true</code> if the number if a power of two; otherwise, <code>false</code>.
     *
     * @exception {DeveloperError} A number greater than or equal to 0 is required.
     *
     * @example
     * var t = Cesium.Math.isPowerOfTwo(16); // true
     * var f = Cesium.Math.isPowerOfTwo(20); // false
     */
    CesiumMath.isPowerOfTwo = function(n) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof n !== 'number' || n < 0) {
            throw new DeveloperError('A number greater than or equal to 0 is required.');
        }
        //>>includeEnd('debug');

        return (n !== 0) && ((n & (n - 1)) === 0);
    };

    /**
     * Computes the next power-of-two integer greater than or equal to the provided positive integer.
     *
     * @memberof CesiumMath
     *
     * @param {Number} n The positive integer to test.
     *
     * @returns {Number} The next power-of-two integer.
     *
     * @exception {DeveloperError} A number greater than or equal to 0 is required.
     *
     * @example
     * var n = Cesium.Math.nextPowerOfTwo(29); // 32
     * var m = Cesium.Math.nextPowerOfTwo(32); // 32
     */
    CesiumMath.nextPowerOfTwo = function(n) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof n !== 'number' || n < 0) {
            throw new DeveloperError('A number greater than or equal to 0 is required.');
        }
        //>>includeEnd('debug');

        // From http://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
        --n;
        n |= n >> 1;
        n |= n >> 2;
        n |= n >> 4;
        n |= n >> 8;
        n |= n >> 16;
        ++n;

        return n;
    };

    /**
     * Constraint a value to lie between two values.
     *
     * @memberof CesiumMath
     *
     * @param {Number} value The value to constrain.
     * @param {Number} min The minimum value.
     * @param {Number} max The maximum value.
     * @returns The value clamped so that min <= value <= max.
     */
    CesiumMath.clamp = function(value, min, max) {
        return value < min ? min : value > max ? max : value;
    };

    var randomNumberGenerator = new MersenneTwister();

    /**
     * Sets the seed used by the random number generator
     * in {@link CesiumMath#nextRandomNumber}.
     *
     * @memberof CesiumMath
     *
     * @param {Number} seed An integer used as the seed.
     */
    CesiumMath.setRandomNumberSeed = function(seed) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(seed)) {
            throw new DeveloperError('seed is required.');
        }
        //>>includeEnd('debug');

        randomNumberGenerator = new MersenneTwister(seed);
    };

    /**
     * Generates a random number in the range of [0.0, 1.0)
     * using a Mersenne twister.
     *
     * @memberof CesiumMath
     *
     * @returns A random number in the range of [0.0, 1.0).
     *
     * @see CesiumMath#setRandomNumberSeed
     * @see http://en.wikipedia.org/wiki/Mersenne_twister
     */
    CesiumMath.nextRandomNumber = function() {
        return randomNumberGenerator.random();
    };

    return CesiumMath;
});
