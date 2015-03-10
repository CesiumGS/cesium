/**
 * Cesium - https://github.com/AnalyticalGraphicsInc/cesium
 *
 * Copyright 2011-2015 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md for full licensing details.
 */
(function () {
/*global define*/
define('Core/defined',[],function() {
    "use strict";

    /**
     * Returns true if the object is defined, returns false otherwise.
     *
     * @exports defined
     *
     * @example
     * if (Cesium.defined(positions)) {
     *      doSomething();
     * } else {
     *      doSomethingElse();
     * }
     */
    var defined = function(value) {
        return value !== undefined;
    };

    return defined;
});

/*global define*/
define('Core/freezeObject',[
        './defined'
    ], function(
        defined) {
    "use strict";

    /**
     * Freezes an object, using Object.freeze if available, otherwise returns
     * the object unchanged.  This function should be used in setup code to prevent
     * errors from completely halting JavaScript execution in legacy browsers.
     *
     * @private
     *
     * @exports freezeObject
     */
    var freezeObject = Object.freeze;
    if (!defined(freezeObject)) {
        freezeObject = function(o) {
            return o;
        };
    }

    return freezeObject;
});
/*global define*/
define('Core/defaultValue',[
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * Returns the first parameter if not undefined, otherwise the second parameter.
     * Useful for setting a default value for a parameter.
     *
     * @exports defaultValue
     *
     * @example
     * param = Cesium.defaultValue(param, 'default');
     */
    var defaultValue = function(a, b) {
        if (a !== undefined) {
            return a;
        }
        return b;
    };

    /**
     * A frozen empty object that can be used as the default value for options passed as
     * an object literal.
     */
    defaultValue.EMPTY_OBJECT = freezeObject({});

    return defaultValue;
});
/*global define*/
define('Core/DeveloperError',[
        './defined'
    ], function(
        defined) {
    "use strict";

    /**
     * Constructs an exception object that is thrown due to a developer error, e.g., invalid argument,
     * argument out of range, etc.  This exception should only be thrown during development;
     * it usually indicates a bug in the calling code.  This exception should never be
     * caught; instead the calling code should strive not to generate it.
     * <br /><br />
     * On the other hand, a {@link RuntimeError} indicates an exception that may
     * be thrown at runtime, e.g., out of memory, that the calling code should be prepared
     * to catch.
     *
     * @alias DeveloperError
     * @constructor
     *
     * @param {String} [message] The error message for this exception.
     *
     * @see RuntimeError
     */
    var DeveloperError = function(message) {
        /**
         * 'DeveloperError' indicating that this exception was thrown due to a developer error.
         * @type {String}
         * @readonly
         */
        this.name = 'DeveloperError';

        /**
         * The explanation for why this exception was thrown.
         * @type {String}
         * @readonly
         */
        this.message = message;

        //Browsers such as IE don't have a stack property until you actually throw the error.
        var stack;
        try {
            throw new Error();
        } catch (e) {
            stack = e.stack;
        }

        /**
         * The stack trace of this exception, if available.
         * @type {String}
         * @readonly
         */
        this.stack = stack;
    };

    DeveloperError.prototype.toString = function() {
        var str = this.name + ': ' + this.message;

        if (defined(this.stack)) {
            str += '\n' + this.stack.toString();
        }

        return str;
    };

    /**
     * @private
     */
    DeveloperError.throwInstantiationError = function() {
        throw new DeveloperError('This function defines an interface and should not be called directly.');
    };

    return DeveloperError;
});

/*
  I've wrapped Makoto Matsumoto and Takuji Nishimura's code in a namespace
  so it's better encapsulated. Now you can have multiple random number generators
  and they won't stomp all over eachother's state.

  If you want to use this as a substitute for Math.random(), use the random()
  method like so:

  var m = new MersenneTwister();
  var randomNumber = m.random();

  You can also call the other genrand_{foo}() methods on the instance.

  If you want to use a specific seed in order to get a repeatable random
  sequence, pass an integer into the constructor:

  var m = new MersenneTwister(123);

  and that will always produce the same random sequence.

  Sean McCullough (banksean@gmail.com)
*/

/*
   A C-program for MT19937, with initialization improved 2002/1/26.
   Coded by Takuji Nishimura and Makoto Matsumoto.

   Before using, initialize the state by using init_genrand(seed)
   or init_by_array(init_key, key_length).
*/
/**
@license
mersenne-twister.js - https://gist.github.com/banksean/300494

   Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.

     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

     3. The names of its contributors may not be used to endorse or promote
        products derived from this software without specific prior written
        permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*
   Any feedback is very welcome.
   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
*/
define('ThirdParty/mersenne-twister',[],function() {
var MersenneTwister = function(seed) {
  if (seed == undefined) {
    seed = new Date().getTime();
  }
  /* Period parameters */
  this.N = 624;
  this.M = 397;
  this.MATRIX_A = 0x9908b0df;   /* constant vector a */
  this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
  this.LOWER_MASK = 0x7fffffff; /* least significant r bits */

  this.mt = new Array(this.N); /* the array for the state vector */
  this.mti=this.N+1; /* mti==N+1 means mt[N] is not initialized */

  this.init_genrand(seed);
}

/* initializes mt[N] with a seed */
MersenneTwister.prototype.init_genrand = function(s) {
  this.mt[0] = s >>> 0;
  for (this.mti=1; this.mti<this.N; this.mti++) {
      var s = this.mt[this.mti-1] ^ (this.mt[this.mti-1] >>> 30);
   this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253)
  + this.mti;
      /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
      /* In the previous versions, MSBs of the seed affect   */
      /* only MSBs of the array mt[].                        */
      /* 2002/01/09 modified by Makoto Matsumoto             */
      this.mt[this.mti] >>>= 0;
      /* for >32 bit machines */
  }
}

/* initialize by an array with array-length */
/* init_key is the array for initializing keys */
/* key_length is its length */
/* slight change for C++, 2004/2/26 */
//MersenneTwister.prototype.init_by_array = function(init_key, key_length) {
//  var i, j, k;
//  this.init_genrand(19650218);
//  i=1; j=0;
//  k = (this.N>key_length ? this.N : key_length);
//  for (; k; k--) {
//    var s = this.mt[i-1] ^ (this.mt[i-1] >>> 30)
//    this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525)))
//      + init_key[j] + j; /* non linear */
//    this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
//    i++; j++;
//    if (i>=this.N) { this.mt[0] = this.mt[this.N-1]; i=1; }
//    if (j>=key_length) j=0;
//  }
//  for (k=this.N-1; k; k--) {
//    var s = this.mt[i-1] ^ (this.mt[i-1] >>> 30);
//    this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941))
//      - i; /* non linear */
//    this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
//    i++;
//    if (i>=this.N) { this.mt[0] = this.mt[this.N-1]; i=1; }
//  }
//
//  this.mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */
//}

/* generates a random number on [0,0xffffffff]-interval */
MersenneTwister.prototype.genrand_int32 = function() {
  var y;
  var mag01 = new Array(0x0, this.MATRIX_A);
  /* mag01[x] = x * MATRIX_A  for x=0,1 */

  if (this.mti >= this.N) { /* generate N words at one time */
    var kk;

    if (this.mti == this.N+1)   /* if init_genrand() has not been called, */
      this.init_genrand(5489); /* a default initial seed is used */

    for (kk=0;kk<this.N-this.M;kk++) {
      y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
      this.mt[kk] = this.mt[kk+this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
    }
    for (;kk<this.N-1;kk++) {
      y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
      this.mt[kk] = this.mt[kk+(this.M-this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
    }
    y = (this.mt[this.N-1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
    this.mt[this.N-1] = this.mt[this.M-1] ^ (y >>> 1) ^ mag01[y & 0x1];

    this.mti = 0;
  }

  y = this.mt[this.mti++];

  /* Tempering */
  y ^= (y >>> 11);
  y ^= (y << 7) & 0x9d2c5680;
  y ^= (y << 15) & 0xefc60000;
  y ^= (y >>> 18);

  return y >>> 0;
}

/* generates a random number on [0,0x7fffffff]-interval */
//MersenneTwister.prototype.genrand_int31 = function() {
//  return (this.genrand_int32()>>>1);
//}

/* generates a random number on [0,1]-real-interval */
//MersenneTwister.prototype.genrand_real1 = function() {
//  return this.genrand_int32()*(1.0/4294967295.0);
//  /* divided by 2^32-1 */
//}

/* generates a random number on [0,1)-real-interval */
MersenneTwister.prototype.random = function() {
  return this.genrand_int32()*(1.0/4294967296.0);
  /* divided by 2^32 */
}

/* generates a random number on (0,1)-real-interval */
//MersenneTwister.prototype.genrand_real3 = function() {
//  return (this.genrand_int32() + 0.5)*(1.0/4294967296.0);
//  /* divided by 2^32 */
//}

/* generates a random number on [0,1) with 53-bit resolution*/
//MersenneTwister.prototype.genrand_res53 = function() {
//  var a=this.genrand_int32()>>>5, b=this.genrand_int32()>>>6;
//  return(a*67108864.0+b)*(1.0/9007199254740992.0);
//}

/* These real versions are due to Isaku Wada, 2002/01/09 added */

return MersenneTwister;
});
/*global define*/
define('Core/Math',[
        '../ThirdParty/mersenne-twister',
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        MersenneTwister,
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Math functions.
     *
     * @namespace
     * @alias CesiumMath
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
     * Returns 1.0 if the given value is positive or zero, and -1.0 if it is negative.
     * This is similar to {@link CesiumMath#sign} except that returns 1.0 instead of
     * 0.0 when the input value is 0.0.
     * @param {Number} value The value to return the sign of.
     * @returns {Number} The sign of value.
     */
    CesiumMath.signNotZero = function(value) {
        return value < 0.0 ? -1.0 : 1.0;
    };

    /**
     * Converts a scalar value in the range [-1.0, 1.0] to a 8-bit 2's complement number.
     * @param {Number} value The scalar value in the range [-1.0, 1.0]
     * @returns {Number} The 8-bit 2's complement number, where 0 maps to -1.0 and 255 maps to 1.0.
     *
     * @see CesiumMath.fromSNorm
     */
    CesiumMath.toSNorm = function(value) {
        return Math.round((CesiumMath.clamp(value, -1.0, 1.0) * 0.5 + 0.5) * 255.0);
    };

    /**
     * Converts a SNORM value in the range [0, 255] to a scalar in the range [-1.0, 1.0].
     * @param {Number} value SNORM value in the range [0, 255]
     * @returns {Number} Scalar in the range [-1.0, 1.0].
     *
     * @see CesiumMath.toSNorm
     */
    CesiumMath.fromSNorm = function(value) {
        return CesiumMath.clamp(value, 0.0, 255.0) / 255.0 * 2.0 - 1.0;
    };

    /**
     * Returns the hyperbolic sine of a number.
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
     * @param {Number} value The number whose hyperbolic sine is to be returned.
     * @returns The hyperbolic sine of <code>value</code>.
     */
    CesiumMath.sinh = function(value) {
        var part1 = Math.pow(Math.E, value);
        var part2 = Math.pow(Math.E, -1.0 * value);

        return (part1 - part2) * 0.5;
    };

    /**
     * Returns the hyperbolic cosine of a number.
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
     *     <li>If the argument is zero, then the result is 1.0.</li>
     *   </ul>
     *</p>
     *
     * @param {Number} value The number whose hyperbolic cosine is to be returned.
     * @returns The hyperbolic cosine of <code>value</code>.
     */
    CesiumMath.cosh = function(value) {
        var part1 = Math.pow(Math.E, value);
        var part2 = Math.pow(Math.E, -1.0 * value);

        return (part1 + part2) * 0.5;
    };

    /**
     * Computes the linear interpolation of two values.
     *
     * @param {Number} p The start value to interpolate.
     * @param {Number} q The end value to interpolate.
     * @param {Number} time The time of interpolation generally in the range <code>[0.0, 1.0]</code>.
     * @returns {Number} The linearly interpolated value.
     *
     * @example
     * var n = Cesium.Math.lerp(0.0, 2.0, 0.5); // returns 1.0
     */
    CesiumMath.lerp = function(p, q, time) {
        return ((1.0 - time) * p) + (time * q);
    };

    /**
     * pi
     *
     * @type {Number}
     * @constant
     */
    CesiumMath.PI = Math.PI;

    /**
     * 1/pi
     *
     * @type {Number}
     * @constant
     */
    CesiumMath.ONE_OVER_PI = 1.0 / Math.PI;

    /**
     * pi/2
     *
     * @type {Number}
     * @constant
     */
    CesiumMath.PI_OVER_TWO = Math.PI * 0.5;

    /**
     * pi/3
     *
     * @type {Number}
     * @constant
     */
    CesiumMath.PI_OVER_THREE = Math.PI / 3.0;

    /**
     * pi/4
     *
     * @type {Number}
     * @constant
     */
    CesiumMath.PI_OVER_FOUR = Math.PI / 4.0;

    /**
     * pi/6
     *
     * @type {Number}
     * @constant
     */
    CesiumMath.PI_OVER_SIX = Math.PI / 6.0;

    /**
     * 3pi/2
     *
     * @type {Number}
     * @constant
     */
    CesiumMath.THREE_PI_OVER_TWO = (3.0 * Math.PI) * 0.5;

    /**
     * 2pi
     *
     * @type {Number}
     * @constant
     */
    CesiumMath.TWO_PI = 2.0 * Math.PI;

    /**
     * 1/2pi
     *
     * @type {Number}
     * @constant
     */
    CesiumMath.ONE_OVER_TWO_PI = 1.0 / (2.0 * Math.PI);

    /**
     * The number of radians in a degree.
     *
     * @type {Number}
     * @constant
     * @default Math.PI / 180.0
     */
    CesiumMath.RADIANS_PER_DEGREE = Math.PI / 180.0;

    /**
     * The number of degrees in a radian.
     *
     * @type {Number}
     * @constant
     * @default 180.0 / Math.PI
     */
    CesiumMath.DEGREES_PER_RADIAN = 180.0 / Math.PI;

    /**
     * The number of radians in an arc second.
     *
     * @type {Number}
     * @constant
     * @default {@link CesiumMath.RADIANS_PER_DEGREE} / 3600.0
     */
    CesiumMath.RADIANS_PER_ARCSECOND = CesiumMath.RADIANS_PER_DEGREE / 3600.0;

    /**
     * Converts degrees to radians.
     * @param {Number} degrees The angle to convert in degrees.
     * @returns {Number} The corresponding angle in radians.
     */
    CesiumMath.toRadians = function(degrees) {
                if (!defined(degrees)) {
            throw new DeveloperError('degrees is required.');
        }
                return degrees * CesiumMath.RADIANS_PER_DEGREE;
    };

    /**
     * Converts radians to degrees.
     * @param {Number} radians The angle to convert in radians.
     * @returns {Number} The corresponding angle in degrees.
     */
    CesiumMath.toDegrees = function(radians) {
                if (!defined(radians)) {
            throw new DeveloperError('radians is required.');
        }
                return radians * CesiumMath.DEGREES_PER_RADIAN;
    };

    /**
     * Converts a longitude value, in radians, to the range [<code>-Math.PI</code>, <code>Math.PI</code>).
     *
     * @param {Number} angle The longitude value, in radians, to convert to the range [<code>-Math.PI</code>, <code>Math.PI</code>).
     * @returns {Number} The equivalent longitude value in the range [<code>-Math.PI</code>, <code>Math.PI</code>).
     *
     * @example
     * // Convert 270 degrees to -90 degrees longitude
     * var longitude = Cesium.Math.convertLongitudeRange(Cesium.Math.toRadians(270.0));
     */
    CesiumMath.convertLongitudeRange = function(angle) {
                if (!defined(angle)) {
            throw new DeveloperError('angle is required.');
        }
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
     * Produces an angle in the range -Pi <= angle <= Pi which is equivalent to the provided angle.
     *
     * @param {Number} angle in radians
     * @returns {Number} The angle in the range [<code>-CesiumMath.PI</code>, <code>CesiumMath.PI</code>].
     */
    CesiumMath.negativePiToPi = function(x) {
                if (!defined(x)) {
            throw new DeveloperError('x is required.');
        }
                return CesiumMath.zeroToTwoPi(x + CesiumMath.PI) - CesiumMath.PI;
    };

    /**
     * Produces an angle in the range 0 <= angle <= 2Pi which is equivalent to the provided angle.
     *
     * @param {Number} angle in radians
     * @returns {Number} The angle in the range [0, <code>CesiumMath.TWO_PI</code>].
     */
    CesiumMath.zeroToTwoPi = function(x) {
                if (!defined(x)) {
            throw new DeveloperError('x is required.');
        }
                var mod = CesiumMath.mod(x, CesiumMath.TWO_PI);
        if (Math.abs(mod) < CesiumMath.EPSILON14 && Math.abs(x) > CesiumMath.EPSILON14) {
            return CesiumMath.TWO_PI;
        }
        return mod;
    };

    /**
     * The modulo operation that also works for negative dividends.
     *
     * @param {Number} m The dividend.
     * @param {Number} n The divisor.
     * @returns {Number} The remainder.
     */
    CesiumMath.mod = function(m, n) {
                if (!defined(m)) {
            throw new DeveloperError('m is required.');
        }
        if (!defined(n)) {
            throw new DeveloperError('n is required.');
        }
                return ((m % n) + n) % n;
    };

    /**
     * Determines if two values are equal using an absolute or relative tolerance test. This is useful
     * to avoid problems due to roundoff error when comparing floating-point values directly. The values are
     * first compared using an absolute tolerance test. If that fails, a relative tolerance test is performed.
     * Use this test if you are unsure of the magnitudes of left and right.
     *
     * @param {Number} left The first value to compare.
     * @param {Number} right The other value to compare.
     * @param {Number} relativeEpsilon The maximum inclusive delta between <code>left</code> and <code>right</code> for the relative tolerance test.
     * @param {Number} [absoluteEpsilon=relativeEpsilon] The maximum inclusive delta between <code>left</code> and <code>right</code> for the absolute tolerance test.
     * @returns {Boolean} <code>true</code> if the values are equal within the epsilon; otherwise, <code>false</code>.
     *
     * @example
     * var a = Cesium.Math.equalsEpsilon(0.0, 0.01, Cesium.Math.EPSILON2); // true
     * var b = Cesium.Math.equalsEpsilon(0.0, 0.1, Cesium.Math.EPSILON2);  // false
     * var c = Cesium.Math.equalsEpsilon(3699175.1634344, 3699175.2, Cesium.Math.EPSILON7); // true
     * var d = Cesium.Math.equalsEpsilon(3699175.1634344, 3699175.2, Cesium.Math.EPSILON9); // false
     */
    CesiumMath.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
                if (!defined(left)) {
            throw new DeveloperError('left is required.');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required.');
        }
        if (!defined(relativeEpsilon)) {
            throw new DeveloperError('relativeEpsilon is required.');
        }
                absoluteEpsilon = defaultValue(absoluteEpsilon, relativeEpsilon);
        var absDiff = Math.abs(left - right);
        return absDiff <= absoluteEpsilon || absDiff <= relativeEpsilon * Math.max(Math.abs(left), Math.abs(right));
    };

    var factorials = [1];

    /**
     * Computes the factorial of the provided number.
     *
     * @param {Number} n The number whose factorial is to be computed.
     * @returns {Number} The factorial of the provided number or undefined if the number is less than 0.
     *
     * @exception {DeveloperError} A number greater than or equal to 0 is required.
     *
     * @see {@link http://en.wikipedia.org/wiki/Factorial|Factorial on Wikipedia}
     *
     * @example
     * //Compute 7!, which is equal to 5040
     * var computedFactorial = Cesium.Math.factorial(7);
     */
    CesiumMath.factorial = function(n) {
                if (typeof n !== 'number' || n < 0) {
            throw new DeveloperError('A number greater than or equal to 0 is required.');
        }
        
        var length = factorials.length;
        if (n >= length) {
            var sum = factorials[length - 1];
            for (var i = length; i <= n; i++) {
                factorials.push(sum * i);
            }
        }
        return factorials[n];
    };

    /**
     * Increments a number with a wrapping to a minimum value if the number exceeds the maximum value.
     *
     * @param {Number} [n] The number to be incremented.
     * @param {Number} [maximumValue] The maximum incremented value before rolling over to the minimum value.
     * @param {Number} [minimumValue=0.0] The number reset to after the maximum value has been exceeded.
     * @returns {Number} The incremented number.
     *
     * @exception {DeveloperError} Maximum value must be greater than minimum value.
     *
     * @example
     * var n = Cesium.Math.incrementWrap(5, 10, 0); // returns 6
     * var n = Cesium.Math.incrementWrap(10, 10, 0); // returns 0
     */
    CesiumMath.incrementWrap = function(n, maximumValue, minimumValue) {
        minimumValue = defaultValue(minimumValue, 0.0);

                if (!defined(n)) {
            throw new DeveloperError('n is required.');
        }
        if (maximumValue <= minimumValue) {
            throw new DeveloperError('maximumValue must be greater than minimumValue.');
        }
        
        ++n;
        if (n > maximumValue) {
            n = minimumValue;
        }
        return n;
    };

    /**
     * Determines if a positive integer is a power of two.
     *
     * @param {Number} n The positive integer to test.
     * @returns {Boolean} <code>true</code> if the number if a power of two; otherwise, <code>false</code>.
     *
     * @exception {DeveloperError} A number greater than or equal to 0 is required.
     *
     * @example
     * var t = Cesium.Math.isPowerOfTwo(16); // true
     * var f = Cesium.Math.isPowerOfTwo(20); // false
     */
    CesiumMath.isPowerOfTwo = function(n) {
                if (typeof n !== 'number' || n < 0) {
            throw new DeveloperError('A number greater than or equal to 0 is required.');
        }
        
        return (n !== 0) && ((n & (n - 1)) === 0);
    };

    /**
     * Computes the next power-of-two integer greater than or equal to the provided positive integer.
     *
     * @param {Number} n The positive integer to test.
     * @returns {Number} The next power-of-two integer.
     *
     * @exception {DeveloperError} A number greater than or equal to 0 is required.
     *
     * @example
     * var n = Cesium.Math.nextPowerOfTwo(29); // 32
     * var m = Cesium.Math.nextPowerOfTwo(32); // 32
     */
    CesiumMath.nextPowerOfTwo = function(n) {
                if (typeof n !== 'number' || n < 0) {
            throw new DeveloperError('A number greater than or equal to 0 is required.');
        }
        
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
     * @param {Number} value The value to constrain.
     * @param {Number} min The minimum value.
     * @param {Number} max The maximum value.
     * @returns {Number} The value clamped so that min <= value <= max.
     */
    CesiumMath.clamp = function(value, min, max) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(min)) {
            throw new DeveloperError('min is required.');
        }
        if (!defined(max)) {
            throw new DeveloperError('max is required.');
        }
                return value < min ? min : value > max ? max : value;
    };

    var randomNumberGenerator = new MersenneTwister();

    /**
     * Sets the seed used by the random number generator
     * in {@link CesiumMath#nextRandomNumber}.
     *
     * @param {Number} seed An integer used as the seed.
     */
    CesiumMath.setRandomNumberSeed = function(seed) {
                if (!defined(seed)) {
            throw new DeveloperError('seed is required.');
        }
        
        randomNumberGenerator = new MersenneTwister(seed);
    };

    /**
     * Generates a random number in the range of [0.0, 1.0)
     * using a Mersenne twister.
     *
     * @returns {Number} A random number in the range of [0.0, 1.0).
     *
     * @see CesiumMath.setRandomNumberSeed
     * @see {@link http://en.wikipedia.org/wiki/Mersenne_twister|Mersenne twister on Wikipedia}
     */
    CesiumMath.nextRandomNumber = function() {
        return randomNumberGenerator.random();
    };

    /**
     * Computes <code>Math.acos(value)</acode>, but first clamps <code>value</code> to the range [-1.0, 1.0]
     * so that the function will never return NaN.
     *
     * @param {Number} value The value for which to compute acos.
     * @returns {Number} The acos of the value if the value is in the range [-1.0, 1.0], or the acos of -1.0 or 1.0,
     *          whichever is closer, if the value is outside the range.
     */
    CesiumMath.acosClamped = function(value) {
                if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
                return Math.acos(CesiumMath.clamp(value, -1.0, 1.0));
    };

    /**
     * Computes <code>Math.asin(value)</acode>, but first clamps <code>value</code> to the range [-1.0, 1.0]
     * so that the function will never return NaN.
     *
     * @param {Number} value The value for which to compute asin.
     * @returns {Number} The asin of the value if the value is in the range [-1.0, 1.0], or the asin of -1.0 or 1.0,
     *          whichever is closer, if the value is outside the range.
     */
    CesiumMath.asinClamped = function(value) {
                if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
                return Math.asin(CesiumMath.clamp(value, -1.0, 1.0));
    };

    /**
     * Finds the chord length between two points given the circle's radius and the angle between the points.
     *
     * @param {Number} angle The angle between the two points.
     * @param {Number} radius The radius of the circle.
     * @returns {Number} The chord length.
     */
    CesiumMath.chordLength = function(angle, radius) {
                if (!defined(angle)) {
            throw new DeveloperError('angle is required.');
        }
        if (!defined(radius)) {
            throw new DeveloperError('radius is required.');
        }
                return 2.0 * radius * Math.sin(angle * 0.5);
    };

    return CesiumMath;
});

/*global define*/
define('Core/Cartesian3',[
        './defaultValue',
        './defined',
        './DeveloperError',
        './freezeObject',
        './Math'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        freezeObject,
        CesiumMath) {
    "use strict";

    /**
     * A 3D Cartesian point.
     * @alias Cartesian3
     * @constructor
     *
     * @param {Number} [x=0.0] The X component.
     * @param {Number} [y=0.0] The Y component.
     * @param {Number} [z=0.0] The Z component.
     *
     * @see Cartesian2
     * @see Cartesian4
     * @see Packable
     */
    var Cartesian3 = function(x, y, z) {
        /**
         * The X component.
         * @type {Number}
         * @default 0.0
         */
        this.x = defaultValue(x, 0.0);

        /**
         * The Y component.
         * @type {Number}
         * @default 0.0
         */
        this.y = defaultValue(y, 0.0);

        /**
         * The Z component.
         * @type {Number}
         * @default 0.0
         */
        this.z = defaultValue(z, 0.0);
    };

    /**
     * Converts the provided Spherical into Cartesian3 coordinates.
     *
     * @param {Spherical} spherical The Spherical to be converted to Cartesian3.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    Cartesian3.fromSpherical = function(spherical, result) {
                if (!defined(spherical)) {
            throw new DeveloperError('spherical is required');
        }
        
        if (!defined(result)) {
            result = new Cartesian3();
        }

        var clock = spherical.clock;
        var cone = spherical.cone;
        var magnitude = defaultValue(spherical.magnitude, 1.0);
        var radial = magnitude * Math.sin(cone);
        result.x = radial * Math.cos(clock);
        result.y = radial * Math.sin(clock);
        result.z = magnitude * Math.cos(cone);
        return result;
    };

    /**
     * Creates a Cartesian3 instance from x, y and z coordinates.
     *
     * @param {Number} x The x coordinate.
     * @param {Number} y The y coordinate.
     * @param {Number} z The z coordinate.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    Cartesian3.fromElements = function(x, y, z, result) {
        if (!defined(result)) {
            return new Cartesian3(x, y, z);
        }

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Duplicates a Cartesian3 instance.
     *
     * @param {Cartesian3} cartesian The Cartesian to duplicate.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided. (Returns undefined if cartesian is undefined)
     */
    Cartesian3.clone = function(cartesian, result) {
        if (!defined(cartesian)) {
            return undefined;
        }
        if (!defined(result)) {
            return new Cartesian3(cartesian.x, cartesian.y, cartesian.z);
        }

        result.x = cartesian.x;
        result.y = cartesian.y;
        result.z = cartesian.z;
        return result;
    };

    /**
     * Creates a Cartesian3 instance from an existing Cartesian4.  This simply takes the
     * x, y, and z properties of the Cartesian4 and drops w.
     * @function
     *
     * @param {Cartesian4} cartesian The Cartesian4 instance to create a Cartesian3 instance from.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    Cartesian3.fromCartesian4 = Cartesian3.clone;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Cartesian3.packedLength = 3;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Cartesian3} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Cartesian3.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }

        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.x;
        array[startingIndex++] = value.y;
        array[startingIndex] = value.z;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Cartesian3} [result] The object into which to store the result.
     */
    Cartesian3.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        result.x = array[startingIndex++];
        result.y = array[startingIndex++];
        result.z = array[startingIndex];
        return result;
    };

    /**
     * Creates a Cartesian3 from three consecutive elements in an array.
     * @function
     *
     * @param {Number[]} array The array whose three consecutive elements correspond to the x, y, and z components, respectively.
     * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to the x component.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @example
     * // Create a Cartesian3 with (1.0, 2.0, 3.0)
     * var v = [1.0, 2.0, 3.0];
     * var p = Cesium.Cartesian3.fromArray(v);
     *
     * // Create a Cartesian3 with (1.0, 2.0, 3.0) using an offset into an array
     * var v2 = [0.0, 0.0, 1.0, 2.0, 3.0];
     * var p2 = Cesium.Cartesian3.fromArray(v2, 2);
     */
    Cartesian3.fromArray = Cartesian3.unpack;

    /**
     * Computes the value of the maximum component for the supplied Cartesian.
     *
     * @param {Cartesian3} cartesian The cartesian to use.
     * @returns {Number} The value of the maximum component.
     */
    Cartesian3.maximumComponent = function(cartesian) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        return Math.max(cartesian.x, cartesian.y, cartesian.z);
    };

    /**
     * Computes the value of the minimum component for the supplied Cartesian.
     *
     * @param {Cartesian3} cartesian The cartesian to use.
     * @returns {Number} The value of the minimum component.
     */
    Cartesian3.minimumComponent = function(cartesian) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        return Math.min(cartesian.x, cartesian.y, cartesian.z);
    };

    /**
     * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
     *
     * @param {Cartesian3} first A cartesian to compare.
     * @param {Cartesian3} second A cartesian to compare.
     * @param {Cartesian3} result The object into which to store the result.
     * @returns {Cartesian3} A cartesian with the minimum components.
     */
    Cartesian3.minimumByComponent = function(first, second, result) {
                if (!defined(first)) {
            throw new DeveloperError('first is required.');
        }
        if (!defined(second)) {
            throw new DeveloperError('second is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        result.x = Math.min(first.x, second.x);
        result.y = Math.min(first.y, second.y);
        result.z = Math.min(first.z, second.z);

        return result;
    };

    /**
     * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
     *
     * @param {Cartesian3} first A cartesian to compare.
     * @param {Cartesian3} second A cartesian to compare.
     * @param {Cartesian3} result The object into which to store the result.
     * @returns {Cartesian3} A cartesian with the maximum components.
     */
    Cartesian3.maximumByComponent = function(first, second, result) {
                if (!defined(first)) {
            throw new DeveloperError('first is required.');
        }
        if (!defined(second)) {
            throw new DeveloperError('second is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        result.x = Math.max(first.x, second.x);
        result.y = Math.max(first.y, second.y);
        result.z = Math.max(first.z, second.z);
        return result;
    };

    /**
     * Computes the provided Cartesian's squared magnitude.
     *
     * @param {Cartesian3} cartesian The Cartesian instance whose squared magnitude is to be computed.
     * @returns {Number} The squared magnitude.
     */
    Cartesian3.magnitudeSquared = function(cartesian) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        return cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z;
    };

    /**
     * Computes the Cartesian's magnitude (length).
     *
     * @param {Cartesian3} cartesian The Cartesian instance whose magnitude is to be computed.
     * @returns {Number} The magnitude.
     */
    Cartesian3.magnitude = function(cartesian) {
        return Math.sqrt(Cartesian3.magnitudeSquared(cartesian));
    };

    var distanceScratch = new Cartesian3();

    /**
     * Computes the distance between two points.
     *
     * @param {Cartesian3} left The first point to compute the distance from.
     * @param {Cartesian3} right The second point to compute the distance to.
     * @returns {Number} The distance between two points.
     *
     * @example
     * // Returns 1.0
     * var d = Cesium.Cartesian3.distance(new Cesium.Cartesian3(1.0, 0.0, 0.0), new Cesium.Cartesian3(2.0, 0.0, 0.0));
     */
    Cartesian3.distance = function(left, right) {
                if (!defined(left) || !defined(right)) {
            throw new DeveloperError('left and right are required.');
        }
        
        Cartesian3.subtract(left, right, distanceScratch);
        return Cartesian3.magnitude(distanceScratch);
    };

    /**
     * Computes the squared distance between two points.  Comparing squared distances
     * using this function is more efficient than comparing distances using {@link Cartesian3#distance}.
     *
     * @param {Cartesian3} left The first point to compute the distance from.
     * @param {Cartesian3} right The second point to compute the distance to.
     * @returns {Number} The distance between two points.
     *
     * @example
     * // Returns 4.0, not 2.0
     * var d = Cesium.Cartesian3.distance(new Cesium.Cartesian3(1.0, 0.0, 0.0), new Cesium.Cartesian3(3.0, 0.0, 0.0));
     */
    Cartesian3.distanceSquared = function(left, right) {
                if (!defined(left) || !defined(right)) {
            throw new DeveloperError('left and right are required.');
        }
        
        Cartesian3.subtract(left, right, distanceScratch);
        return Cartesian3.magnitudeSquared(distanceScratch);
    };

    /**
     * Computes the normalized form of the supplied Cartesian.
     *
     * @param {Cartesian3} cartesian The Cartesian to be normalized.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Cartesian3.normalize = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var magnitude = Cartesian3.magnitude(cartesian);

        result.x = cartesian.x / magnitude;
        result.y = cartesian.y / magnitude;
        result.z = cartesian.z / magnitude;
        return result;
    };

    /**
     * Computes the dot (scalar) product of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @returns {Number} The dot product.
     */
    Cartesian3.dot = function(left, right) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        
        return left.x * right.x + left.y * right.y + left.z * right.z;
    };

    /**
     * Computes the componentwise product of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Cartesian3.multiplyComponents = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x * right.x;
        result.y = left.y * right.y;
        result.z = left.z * right.z;
        return result;
    };

    /**
     * Computes the componentwise sum of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Cartesian3.add = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x + right.x;
        result.y = left.y + right.y;
        result.z = left.z + right.z;
        return result;
    };

    /**
     * Computes the componentwise difference of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Cartesian3.subtract = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x - right.x;
        result.y = left.y - right.y;
        result.z = left.z - right.z;
        return result;
    };

    /**
     * Multiplies the provided Cartesian componentwise by the provided scalar.
     *
     * @param {Cartesian3} cartesian The Cartesian to be scaled.
     * @param {Number} scalar The scalar to multiply with.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Cartesian3.multiplyByScalar = function(cartesian, scalar, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = cartesian.x * scalar;
        result.y = cartesian.y * scalar;
        result.z = cartesian.z * scalar;
        return result;
    };

    /**
     * Divides the provided Cartesian componentwise by the provided scalar.
     *
     * @param {Cartesian3} cartesian The Cartesian to be divided.
     * @param {Number} scalar The scalar to divide by.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Cartesian3.divideByScalar = function(cartesian, scalar, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = cartesian.x / scalar;
        result.y = cartesian.y / scalar;
        result.z = cartesian.z / scalar;
        return result;
    };

    /**
     * Negates the provided Cartesian.
     *
     * @param {Cartesian3} cartesian The Cartesian to be negated.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Cartesian3.negate = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = -cartesian.x;
        result.y = -cartesian.y;
        result.z = -cartesian.z;
        return result;
    };

    /**
     * Computes the absolute value of the provided Cartesian.
     *
     * @param {Cartesian3} cartesian The Cartesian whose absolute value is to be computed.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Cartesian3.abs = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = Math.abs(cartesian.x);
        result.y = Math.abs(cartesian.y);
        result.z = Math.abs(cartesian.z);
        return result;
    };

    var lerpScratch = new Cartesian3();
    /**
     * Computes the linear interpolation or extrapolation at t using the provided cartesians.
     *
     * @param {Cartesian3} start The value corresponding to t at 0.0.
     * @param {Cartesian3} end The value corresponding to t at 1.0.
     * @param {Number} t The point along t at which to interpolate.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Cartesian3.lerp = function(start, end, t, result) {
                if (!defined(start)) {
            throw new DeveloperError('start is required.');
        }
        if (!defined(end)) {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        Cartesian3.multiplyByScalar(end, t, lerpScratch);
        result = Cartesian3.multiplyByScalar(start, 1.0 - t, result);
        return Cartesian3.add(lerpScratch, result, result);
    };

    var angleBetweenScratch = new Cartesian3();
    var angleBetweenScratch2 = new Cartesian3();
    /**
     * Returns the angle, in radians, between the provided Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @returns {Number} The angle between the Cartesians.
     */
    Cartesian3.angleBetween = function(left, right) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        
        Cartesian3.normalize(left, angleBetweenScratch);
        Cartesian3.normalize(right, angleBetweenScratch2);
        var cosine = Cartesian3.dot(angleBetweenScratch, angleBetweenScratch2);
        var sine = Cartesian3.magnitude(Cartesian3.cross(angleBetweenScratch, angleBetweenScratch2, angleBetweenScratch));
        return Math.atan2(sine, cosine);
    };

    var mostOrthogonalAxisScratch = new Cartesian3();
    /**
     * Returns the axis that is most orthogonal to the provided Cartesian.
     *
     * @param {Cartesian3} cartesian The Cartesian on which to find the most orthogonal axis.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The most orthogonal axis.
     */
    Cartesian3.mostOrthogonalAxis = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        var f = Cartesian3.normalize(cartesian, mostOrthogonalAxisScratch);
        Cartesian3.abs(f, f);

        if (f.x <= f.y) {
            if (f.x <= f.z) {
                result = Cartesian3.clone(Cartesian3.UNIT_X, result);
            } else {
                result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
            }
        } else {
            if (f.y <= f.z) {
                result = Cartesian3.clone(Cartesian3.UNIT_Y, result);
            } else {
                result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
            }
        }

        return result;
    };

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartesian3} [left] The first Cartesian.
     * @param {Cartesian3} [right] The second Cartesian.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Cartesian3.equals = function(left, right) {
            return (left === right) ||
              ((defined(left)) &&
               (defined(right)) &&
               (left.x === right.x) &&
               (left.y === right.y) &&
               (left.z === right.z));
    };

    /**
     * @private
     */
    Cartesian3.equalsArray = function(cartesian, array, offset) {
        return cartesian.x === array[offset] &&
               cartesian.y === array[offset + 1] &&
               cartesian.z === array[offset + 2];
    };

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they pass an absolute or relative tolerance test,
     * <code>false</code> otherwise.
     *
     * @param {Cartesian3} [left] The first Cartesian.
     * @param {Cartesian3} [right] The second Cartesian.
     * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
     * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    Cartesian3.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
        return (left === right) ||
               (defined(left) &&
                defined(right) &&
                CesiumMath.equalsEpsilon(left.x, right.x, relativeEpsilon, absoluteEpsilon) &&
                CesiumMath.equalsEpsilon(left.y, right.y, relativeEpsilon, absoluteEpsilon) &&
                CesiumMath.equalsEpsilon(left.z, right.z, relativeEpsilon, absoluteEpsilon));
    };

    /**
     * Computes the cross (outer) product of two Cartesians.
     *
     * @param {Cartesian3} left The first Cartesian.
     * @param {Cartesian3} right The second Cartesian.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The cross product.
     */
    Cartesian3.cross = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var leftX = left.x;
        var leftY = left.y;
        var leftZ = left.z;
        var rightX = right.x;
        var rightY = right.y;
        var rightZ = right.z;

        var x = leftY * rightZ - leftZ * rightY;
        var y = leftZ * rightX - leftX * rightZ;
        var z = leftX * rightY - leftY * rightX;

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Returns a Cartesian3 position from longitude and latitude values given in degrees.
     *
     * @param {Number} longitude The longitude, in degrees
     * @param {Number} latitude The latitude, in degrees
     * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The position
     *
     * @example
     * var position = Cesium.Cartesian3.fromDegrees(-115.0, 37.0);
     */
    Cartesian3.fromDegrees = function(longitude, latitude, height, ellipsoid, result) {
                if (!defined(longitude)) {
            throw new DeveloperError('longitude is required');
        }
        if (!defined(latitude)) {
            throw new DeveloperError('latitude is required');
        }
        
        var lon = CesiumMath.toRadians(longitude);
        var lat = CesiumMath.toRadians(latitude);
        return Cartesian3.fromRadians(lon, lat, height, ellipsoid, result);
    };

    var scratchN = new Cartesian3();
    var scratchK = new Cartesian3();
    var wgs84RadiiSquared = new Cartesian3(6378137.0 * 6378137.0, 6378137.0 * 6378137.0, 6356752.3142451793 * 6356752.3142451793);

    /**
     * Returns a Cartesian3 position from longitude and latitude values given in radians.
     *
     * @param {Number} longitude The longitude, in radians
     * @param {Number} latitude The latitude, in radians
     * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The position
     *
     * @example
     * var position = Cesium.Cartesian3.fromRadians(-2.007, 0.645);
     */
    Cartesian3.fromRadians = function(longitude, latitude, height, ellipsoid, result) {
                if (!defined(longitude)) {
            throw new DeveloperError('longitude is required');
        }
        if (!defined(latitude)) {
            throw new DeveloperError('latitude is required');
        }
        
        height = defaultValue(height, 0.0);
        var radiiSquared = defined(ellipsoid) ? ellipsoid.radiiSquared : wgs84RadiiSquared;

        var cosLatitude = Math.cos(latitude);
        scratchN.x = cosLatitude * Math.cos(longitude);
        scratchN.y = cosLatitude * Math.sin(longitude);
        scratchN.z = Math.sin(latitude);
        scratchN = Cartesian3.normalize(scratchN, scratchN);

        Cartesian3.multiplyComponents(radiiSquared, scratchN, scratchK);
        var gamma = Math.sqrt(Cartesian3.dot(scratchN, scratchK));
        scratchK = Cartesian3.divideByScalar(scratchK, gamma, scratchK);
        scratchN = Cartesian3.multiplyByScalar(scratchN, height, scratchN);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        return Cartesian3.add(scratchK, scratchN, result);
    };

    /**
     * Returns an array of Cartesian3 positions given an array of longitude and latitude values given in degrees.
     *
     * @param {Number[]} coordinates A list of longitude and latitude values. Values alternate [longitude, latitude, longitude, latitude...].
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the coordinates lie.
     * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
     * @returns {Cartesian3[]} The array of positions.
     *
     * @example
     * var positions = Cesium.Cartesian3.fromDegreesArray([-115.0, 37.0, -107.0, 33.0]);
     */
    Cartesian3.fromDegreesArray = function(coordinates, ellipsoid, result) {
                if (!defined(coordinates)) {
            throw new DeveloperError('positions is required.');
        }
        
        var pos = new Array(coordinates.length);
        for (var i = 0; i < coordinates.length; i++) {
            pos[i] = CesiumMath.toRadians(coordinates[i]);
        }

        return Cartesian3.fromRadiansArray(pos, ellipsoid, result);
    };

    /**
     * Returns an array of Cartesian3 positions given an array of longitude and latitude values given in radians.
     *
     * @param {Number[]} coordinates A list of longitude and latitude values. Values alternate [longitude, latitude, longitude, latitude...].
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the coordinates lie.
     * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
     * @returns {Cartesian3[]} The array of positions.
     *
     * @example
     * var positions = Cesium.Cartesian3.fromRadiansArray([-2.007, 0.645, -1.867, .575]);
     */
    Cartesian3.fromRadiansArray = function(coordinates, ellipsoid, result) {
                if (!defined(coordinates)) {
            throw new DeveloperError('positions is required.');
        }
        if (coordinates.length < 2) {
            throw new DeveloperError('positions length cannot be less than 2.');
        }
        if (coordinates.length % 2 !== 0) {
            throw new DeveloperError('positions length must be a multiple of 2.');
        }
        
        var length = coordinates.length;
        if (!defined(result)) {
            result = new Array(length/2);
        } else {
            result.length = length/2;
        }

        for ( var i = 0; i < length; i+=2) {
            var lon = coordinates[i];
            var lat = coordinates[i+1];
            result[i/2] = Cartesian3.fromRadians(lon, lat, 0, ellipsoid, result[i/2]);
        }

        return result;
    };

    /**
     * Returns an array of Cartesian3 positions given an array of longitude, latitude and height values where longitude and latitude are given in degrees.
     *
     * @param {Number[]} coordinates A list of longitude, latitude and height values. Values alternate [longitude, latitude, height,, longitude, latitude, height...].
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
     * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
     * @returns {Cartesian3[]} The array of positions.
     *
     * @example
     * var positions = Cesium.Cartesian3.fromDegreesArrayHeights([-115.0, 37.0, 100000.0, -107.0, 33.0, 150000.0]);
     */
    Cartesian3.fromDegreesArrayHeights = function(coordinates, ellipsoid, result) {
                if (!defined(coordinates)) {
            throw new DeveloperError('positions is required.');
        }
        if (coordinates.length < 3) {
            throw new DeveloperError('positions length cannot be less than 3.');
        }
        if (coordinates.length % 3 !== 0) {
            throw new DeveloperError('positions length must be a multiple of 3.');
        }
        
        var pos = new Array(coordinates.length);
        for (var i = 0; i < coordinates.length; i+=3) {
            pos[i] = CesiumMath.toRadians(coordinates[i]);
            pos[i+1] = CesiumMath.toRadians(coordinates[i+1]);
            pos[i+2] = coordinates[i+2];
        }

        return Cartesian3.fromRadiansArrayHeights(pos, ellipsoid, result);
    };

    /**
     * Returns an array of Cartesian3 positions given an array of longitude, latitude and height values where longitude and latitude are given in radians.
     *
     * @param {Number[]} coordinates A list of longitude, latitude and height values. Values alternate [longitude, latitude, height,, longitude, latitude, height...].
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
     * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
     * @returns {Cartesian3[]} The array of positions.
     *
     * @example
     * var positions = Cesium.Cartesian3.fromRadiansArrayHeights([-2.007, 0.645, 100000.0, -1.867, .575, 150000.0]);
     */
    Cartesian3.fromRadiansArrayHeights = function(coordinates, ellipsoid, result) {
                if (!defined(coordinates)) {
            throw new DeveloperError('positions is required.');
        }
        if (coordinates.length < 3) {
            throw new DeveloperError('positions length cannot be less than 3.');
        }
        if (coordinates.length % 3 !== 0) {
            throw new DeveloperError('positions length must be a multiple of 3.');
        }
        
        var length = coordinates.length;
        if (!defined(result)) {
            result = new Array(length/3);
        } else {
            result.length = length/3;
        }

        for ( var i = 0; i < length; i+=3) {
            var lon = coordinates[i];
            var lat = coordinates[i+1];
            var alt = coordinates[i+2];
            result[i/3] = Cartesian3.fromRadians(lon, lat, alt, ellipsoid, result[i/3]);
        }

        return result;
    };

    /**
     * An immutable Cartesian3 instance initialized to (0.0, 0.0, 0.0).
     *
     * @type {Cartesian3}
     * @constant
     */
    Cartesian3.ZERO = freezeObject(new Cartesian3(0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian3 instance initialized to (1.0, 0.0, 0.0).
     *
     * @type {Cartesian3}
     * @constant
     */
    Cartesian3.UNIT_X = freezeObject(new Cartesian3(1.0, 0.0, 0.0));

    /**
     * An immutable Cartesian3 instance initialized to (0.0, 1.0, 0.0).
     *
     * @type {Cartesian3}
     * @constant
     */
    Cartesian3.UNIT_Y = freezeObject(new Cartesian3(0.0, 1.0, 0.0));

    /**
     * An immutable Cartesian3 instance initialized to (0.0, 0.0, 1.0).
     *
     * @type {Cartesian3}
     * @constant
     */
    Cartesian3.UNIT_Z = freezeObject(new Cartesian3(0.0, 0.0, 1.0));

    /**
     * Duplicates this Cartesian3 instance.
     *
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    Cartesian3.prototype.clone = function(result) {
        return Cartesian3.clone(this, result);
    };

    /**
     * Compares this Cartesian against the provided Cartesian componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartesian3} [right] The right hand side Cartesian.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Cartesian3.prototype.equals = function(right) {
        return Cartesian3.equals(this, right);
    };

    /**
     * Compares this Cartesian against the provided Cartesian componentwise and returns
     * <code>true</code> if they pass an absolute or relative tolerance test,
     * <code>false</code> otherwise.
     *
     * @param {Cartesian3} [right] The right hand side Cartesian.
     * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
     * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
     * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     */
    Cartesian3.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
        return Cartesian3.equalsEpsilon(this, right, relativeEpsilon, absoluteEpsilon);
    };

    /**
     * Creates a string representing this Cartesian in the format '(x, y, z)'.
     *
     * @returns {String} A string representing this Cartesian in the format '(x, y, z)'.
     */
    Cartesian3.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ', ' + this.z + ')';
    };

    return Cartesian3;
});

/*global define*/
define('Core/Cartographic',[
        './defaultValue',
        './defined',
        './DeveloperError',
        './freezeObject',
        './Math'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        freezeObject,
        CesiumMath) {
    "use strict";

    /**
     * A position defined by longitude, latitude, and height.
     * @alias Cartographic
     * @constructor
     *
     * @param {Number} [longitude=0.0] The longitude, in radians.
     * @param {Number} [latitude=0.0] The latitude, in radians.
     * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
     *
     * @see Ellipsoid
     */
    var Cartographic = function(longitude, latitude, height) {
        /**
         * The longitude, in radians.
         * @type {Number}
         * @default 0.0
         */
        this.longitude = defaultValue(longitude, 0.0);

        /**
         * The latitude, in radians.
         * @type {Number}
         * @default 0.0
         */
        this.latitude = defaultValue(latitude, 0.0);

        /**
         * The height, in meters, above the ellipsoid.
         * @type {Number}
         * @default 0.0
         */
        this.height = defaultValue(height, 0.0);
    };

    /**
     * Creates a new Cartographic instance from longitude and latitude
     * specified in radians.
     *
     * @param {Number} longitude The longitude, in radians.
     * @param {Number} latitude The latitude, in radians.
     * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
     */
    Cartographic.fromRadians = function(longitude, latitude, height, result) {
                if (!defined(longitude)) {
            throw new DeveloperError('longitude is required.');
        }
        if (!defined(latitude)) {
            throw new DeveloperError('latitude is required.');
        }
        
        height = defaultValue(height, 0.0);

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }

        result.longitude = longitude;
        result.latitude = latitude;
        result.height = height;
        return result;
    };

    /**
     * Creates a new Cartographic instance from longitude and latitude
     * specified in degrees.  The values in the resulting object will
     * be in radians.
     *
     * @param {Number} longitude The longitude, in degrees.
     * @param {Number} latitude The latitude, in degrees.
     * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
     */
    Cartographic.fromDegrees = function(longitude, latitude, height, result) {
                if (!defined(longitude)) {
            throw new DeveloperError('longitude is required.');
        }
        if (!defined(latitude)) {
            throw new DeveloperError('latitude is required.');
        }
                longitude = CesiumMath.toRadians(longitude);
        latitude = CesiumMath.toRadians(latitude);

        return Cartographic.fromRadians(longitude, latitude, height, result);
    };

    /**
     * Duplicates a Cartographic instance.
     *
     * @param {Cartographic} cartographic The cartographic to duplicate.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided. (Returns undefined if cartographic is undefined)
     */
    Cartographic.clone = function(cartographic, result) {
        if (!defined(cartographic)) {
            return undefined;
        }
        if (!defined(result)) {
            return new Cartographic(cartographic.longitude, cartographic.latitude, cartographic.height);
        }
        result.longitude = cartographic.longitude;
        result.latitude = cartographic.latitude;
        result.height = cartographic.height;
        return result;
    };

    /**
     * Compares the provided cartographics componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartographic} [left] The first cartographic.
     * @param {Cartographic} [right] The second cartographic.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Cartographic.equals = function(left, right) {
        return (left === right) ||
                ((defined(left)) &&
                 (defined(right)) &&
                 (left.longitude === right.longitude) &&
                 (left.latitude === right.latitude) &&
                 (left.height === right.height));
    };

    /**
     * Compares the provided cartographics componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {Cartographic} [left] The first cartographic.
     * @param {Cartographic} [right] The second cartographic.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    Cartographic.equalsEpsilon = function(left, right, epsilon) {
                if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number.');
        }
        
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                (Math.abs(left.longitude - right.longitude) <= epsilon) &&
                (Math.abs(left.latitude - right.latitude) <= epsilon) &&
                (Math.abs(left.height - right.height) <= epsilon));
    };

    /**
     * An immutable Cartographic instance initialized to (0.0, 0.0, 0.0).
     *
     * @type {Cartographic}
     * @constant
     */
    Cartographic.ZERO = freezeObject(new Cartographic(0.0, 0.0, 0.0));

    /**
     * Duplicates this instance.
     *
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
     */
    Cartographic.prototype.clone = function(result) {
        return Cartographic.clone(this, result);
    };

    /**
     * Compares the provided against this cartographic componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartographic} [right] The second cartographic.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Cartographic.prototype.equals = function(right) {
        return Cartographic.equals(this, right);
    };

    /**
     * Compares the provided against this cartographic componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {Cartographic} [right] The second cartographic.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    Cartographic.prototype.equalsEpsilon = function(right, epsilon) {
        return Cartographic.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Creates a string representing this cartographic in the format '(longitude, latitude, height)'.
     *
     * @returns {String} A string representing the provided cartographic in the format '(longitude, latitude, height)'.
     */
    Cartographic.prototype.toString = function() {
        return '(' + this.longitude + ', ' + this.latitude + ', ' + this.height + ')';
    };

    return Cartographic;
});

/*global define*/
define('Core/defineProperties',[
        './defined'
    ], function(
        defined) {
    "use strict";

    var definePropertyWorks = (function() {
        try {
            return 'x' in Object.defineProperty({}, 'x', {});
        } catch (e) {
            return false;
        }
    })();

    /**
     * Defines properties on an object, using Object.defineProperties if available,
     * otherwise returns the object unchanged.  This function should be used in
     * setup code to prevent errors from completely halting JavaScript execution
     * in legacy browsers.
     *
     * @private
     *
     * @exports defineProperties
     */
    var defineProperties = Object.defineProperties;
    if (!definePropertyWorks || !defined(defineProperties)) {
        defineProperties = function(o) {
            return o;
        };
    }

    return defineProperties;
});
/*global define*/
define('Core/Ellipsoid',[
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './freezeObject',
        './Math'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        freezeObject,
        CesiumMath) {
    "use strict";

    function initialize(ellipsoid, x, y, z) {
        x = defaultValue(x, 0.0);
        y = defaultValue(y, 0.0);
        z = defaultValue(z, 0.0);

                if (x < 0.0 || y < 0.0 || z < 0.0) {
            throw new DeveloperError('All radii components must be greater than or equal to zero.');
        }
        
        ellipsoid._radii = new Cartesian3(x, y, z);

        ellipsoid._radiiSquared = new Cartesian3(x * x,
                                            y * y,
                                            z * z);

        ellipsoid._radiiToTheFourth = new Cartesian3(x * x * x * x,
                                                y * y * y * y,
                                                z * z * z * z);

        ellipsoid._oneOverRadii = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / x,
                                            y === 0.0 ? 0.0 : 1.0 / y,
                                            z === 0.0 ? 0.0 : 1.0 / z);

        ellipsoid._oneOverRadiiSquared = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / (x * x),
                                                   y === 0.0 ? 0.0 : 1.0 / (y * y),
                                                   z === 0.0 ? 0.0 : 1.0 / (z * z));

        ellipsoid._minimumRadius = Math.min(x, y, z);

        ellipsoid._maximumRadius = Math.max(x, y, z);

        ellipsoid._centerToleranceSquared = CesiumMath.EPSILON1;
    }

    /**
     * A quadratic surface defined in Cartesian coordinates by the equation
     * <code>(x / a)^2 + (y / b)^2 + (z / c)^2 = 1</code>.  Primarily used
     * by Cesium to represent the shape of planetary bodies.
     *
     * Rather than constructing this object directly, one of the provided
     * constants is normally used.
     * @alias Ellipsoid
     * @constructor
     *
     * @param {Number} [x=0] The radius in the x direction.
     * @param {Number} [y=0] The radius in the y direction.
     * @param {Number} [z=0] The radius in the z direction.
     *
     * @exception {DeveloperError} All radii components must be greater than or equal to zero.
     *
     * @see Ellipsoid.fromCartesian3
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    var Ellipsoid = function(x, y, z) {
        this._radii = undefined;
        this._radiiSquared = undefined;
        this._radiiToTheFourth = undefined;
        this._oneOverRadii = undefined;
        this._oneOverRadiiSquared = undefined;
        this._minimumRadius = undefined;
        this._maximumRadius = undefined;
        this._centerToleranceSquared = undefined;

        initialize(this, x, y, z);
    };

    defineProperties(Ellipsoid.prototype, {
        /**
         * Gets the radii of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        radii : {
            get: function() {
                return this._radii;
            }
        },
        /**
         * Gets the squared radii of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        radiiSquared : {
            get : function() {
                return this._radiiSquared;
            }
        },
        /**
         * Gets the radii of the ellipsoid raise to the fourth power.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        radiiToTheFourth : {
            get : function() {
                return this._radiiToTheFourth;
            }
        },
        /**
         * Gets one over the radii of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        oneOverRadii : {
            get : function() {
                return this._oneOverRadii;
            }
        },
        /**
         * Gets one over the squared radii of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        oneOverRadiiSquared : {
            get : function() {
                return this._oneOverRadiiSquared;
            }
        },
        /**
         * Gets the minimum radius of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Number}
         */
        minimumRadius : {
            get : function() {
                return this._minimumRadius;
            }
        },
        /**
         * Gets the maximum radius of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Number}
         */
        maximumRadius : {
            get : function() {
                return this._maximumRadius;
            }
        }
    });

    /**
     * Duplicates an Ellipsoid instance.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to duplicate.
     * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
     *                    instance should be created.
     * @returns {Ellipsoid} The cloned Ellipsoid. (Returns undefined if ellipsoid is undefined)
     */
    Ellipsoid.clone = function(ellipsoid, result) {
        if (!defined(ellipsoid)) {
            return undefined;
        }
        var radii = ellipsoid._radii;

        if (!defined(result)) {
            return new Ellipsoid(radii.x, radii.y, radii.z);
        }

        Cartesian3.clone(radii, result._radii);
        Cartesian3.clone(ellipsoid._radiiSquared, result._radiiSquared);
        Cartesian3.clone(ellipsoid._radiiToTheFourth, result._radiiToTheFourth);
        Cartesian3.clone(ellipsoid._oneOverRadii, result._oneOverRadii);
        Cartesian3.clone(ellipsoid._oneOverRadiiSquared, result._oneOverRadiiSquared);
        result._minimumRadius = ellipsoid._minimumRadius;
        result._maximumRadius = ellipsoid._maximumRadius;
        result._centerToleranceSquared = ellipsoid._centerToleranceSquared;

        return result;
    };

    /**
     * Computes an Ellipsoid from a Cartesian specifying the radii in x, y, and z directions.
     *
     * @param {Cartesian3} [radii=Cartesian3.ZERO] The ellipsoid's radius in the x, y, and z directions.
     * @returns {Ellipsoid} A new Ellipsoid instance.
     *
     * @exception {DeveloperError} All radii components must be greater than or equal to zero.
     *
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    Ellipsoid.fromCartesian3 = function(cartesian, result) {
        if (!defined(result)) {
            result = new Ellipsoid();
        }

        if (!defined(cartesian)) {
            return result;
        }

        initialize(result, cartesian.x, cartesian.y, cartesian.z);
        return result;
    };

    /**
     * An Ellipsoid instance initialized to the WGS84 standard.
     *
     * @type {Ellipsoid}
     * @constant
     */
    Ellipsoid.WGS84 = freezeObject(new Ellipsoid(6378137.0, 6378137.0, 6356752.3142451793));

    /**
     * An Ellipsoid instance initialized to radii of (1.0, 1.0, 1.0).
     *
     * @type {Ellipsoid}
     * @constant
     */
    Ellipsoid.UNIT_SPHERE = freezeObject(new Ellipsoid(1.0, 1.0, 1.0));

    /**
     * An Ellipsoid instance initialized to a sphere with the lunar radius.
     *
     * @type {Ellipsoid}
     * @constant
     */
    Ellipsoid.MOON = freezeObject(new Ellipsoid(CesiumMath.LUNAR_RADIUS, CesiumMath.LUNAR_RADIUS, CesiumMath.LUNAR_RADIUS));

    /**
     * Duplicates an Ellipsoid instance.
     *
     * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
     *                    instance should be created.
     * @returns {Ellipsoid} The cloned Ellipsoid.
     */
    Ellipsoid.prototype.clone = function(result) {
        return Ellipsoid.clone(this, result);
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Ellipsoid.packedLength = Cartesian3.packedLength;

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Ellipsoid.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        Cartesian3.pack(value._radii, array, startingIndex);
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Ellipsoid} [result] The object into which to store the result.
     */
    Ellipsoid.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        var radii = Cartesian3.unpack(array, startingIndex);
        return Ellipsoid.fromCartesian3(radii, result);
    };

    /**
     * Computes the unit vector directed from the center of this ellipsoid toward the provided Cartesian position.
     * @function
     *
     * @param {Cartesian3} cartesian The Cartesian for which to to determine the geocentric normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    Ellipsoid.prototype.geocentricSurfaceNormal = Cartesian3.normalize;

    /**
     * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
     *
     * @param {Cartographic} cartographic The cartographic position for which to to determine the geodetic normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function(cartographic, result) {
                if (!defined(cartographic)) {
            throw new DeveloperError('cartographic is required.');
        }
        
        var longitude = cartographic.longitude;
        var latitude = cartographic.latitude;
        var cosLatitude = Math.cos(latitude);

        var x = cosLatitude * Math.cos(longitude);
        var y = cosLatitude * Math.sin(longitude);
        var z = Math.sin(latitude);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        result.x = x;
        result.y = y;
        result.z = z;
        return Cartesian3.normalize(result, result);
    };

    /**
     * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
     *
     * @param {Cartesian3} cartesian The Cartesian position for which to to determine the surface normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    Ellipsoid.prototype.geodeticSurfaceNormal = function(cartesian, result) {
        if (!defined(result)) {
            result = new Cartesian3();
        }
        result = Cartesian3.multiplyComponents(cartesian, this._oneOverRadiiSquared, result);
        return Cartesian3.normalize(result, result);
    };

    var cartographicToCartesianNormal = new Cartesian3();
    var cartographicToCartesianK = new Cartesian3();

    /**
     * Converts the provided cartographic to Cartesian representation.
     *
     * @param {Cartographic} cartographic The cartographic position.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @example
     * //Create a Cartographic and determine it's Cartesian representation on a WGS84 ellipsoid.
     * var position = new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 5000);
     * var cartesianPosition = Cesium.Ellipsoid.WGS84.cartographicToCartesian(position);
     */
    Ellipsoid.prototype.cartographicToCartesian = function(cartographic, result) {
        //`cartographic is required` is thrown from geodeticSurfaceNormalCartographic.
        var n = cartographicToCartesianNormal;
        var k = cartographicToCartesianK;
        this.geodeticSurfaceNormalCartographic(cartographic, n);
        Cartesian3.multiplyComponents(this._radiiSquared, n, k);
        var gamma = Math.sqrt(Cartesian3.dot(n, k));
        Cartesian3.divideByScalar(k, gamma, k);
        Cartesian3.multiplyByScalar(n, cartographic.height, n);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        return Cartesian3.add(k, n, result);
    };

    /**
     * Converts the provided array of cartographics to an array of Cartesians.
     *
     * @param {Cartographic[]} cartographics An array of cartographic positions.
     * @param {Cartesian3[]} [result] The object onto which to store the result.
     * @returns {Cartesian3[]} The modified result parameter or a new Array instance if none was provided.
     *
     * @example
     * //Convert an array of Cartographics and determine their Cartesian representation on a WGS84 ellipsoid.
     * var positions = [new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 0),
     *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.321), Cesium.Math.toRadians(78.123), 100),
     *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.645), Cesium.Math.toRadians(78.456), 250)
     * var cartesianPositions = Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions);
     */
    Ellipsoid.prototype.cartographicArrayToCartesianArray = function(cartographics, result) {
                if (!defined(cartographics)) {
            throw new DeveloperError('cartographics is required.');
        }
        
        var length = cartographics.length;
        if (!defined(result)) {
            result = new Array(length);
        } else {
            result.length = length;
        }
        for ( var i = 0; i < length; i++) {
            result[i] = this.cartographicToCartesian(cartographics[i], result[i]);
        }
        return result;
    };

    var cartesianToCartographicN = new Cartesian3();
    var cartesianToCartographicP = new Cartesian3();
    var cartesianToCartographicH = new Cartesian3();

    /**
     * Converts the provided cartesian to cartographic representation.
     * The cartesian is undefined at the center of the ellipsoid.
     *
     * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
     *
     * @example
     * //Create a Cartesian and determine it's Cartographic representation on a WGS84 ellipsoid.
     * var position = new Cesium.Cartesian(17832.12, 83234.52, 952313.73);
     * var cartographicPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
     */
    Ellipsoid.prototype.cartesianToCartographic = function(cartesian, result) {
        //`cartesian is required.` is thrown from scaleToGeodeticSurface
        var p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP);

        if (!defined(p)) {
            return undefined;
        }

        var n = this.geodeticSurfaceNormal(p, cartesianToCartographicN);
        var h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH);

        var longitude = Math.atan2(n.y, n.x);
        var latitude = Math.asin(n.z);
        var height = CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }
        result.longitude = longitude;
        result.latitude = latitude;
        result.height = height;
        return result;
    };

    /**
     * Converts the provided array of cartesians to an array of cartographics.
     *
     * @param {Cartesian3[]} cartesians An array of Cartesian positions.
     * @param {Cartographic[]} [result] The object onto which to store the result.
     * @returns {Cartographic[]} The modified result parameter or a new Array instance if none was provided.
     *
     * @example
     * //Create an array of Cartesians and determine their Cartographic representation on a WGS84 ellipsoid.
     * var positions = [new Cesium.Cartesian3(17832.12, 83234.52, 952313.73),
     *                  new Cesium.Cartesian3(17832.13, 83234.53, 952313.73),
     *                  new Cesium.Cartesian3(17832.14, 83234.54, 952313.73)]
     * var cartographicPositions = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(positions);
     */
    Ellipsoid.prototype.cartesianArrayToCartographicArray = function(cartesians, result) {
                if (!defined(cartesians)) {
            throw new DeveloperError('cartesians is required.');
        }
        
        var length = cartesians.length;
        if (!defined(result)) {
            result = new Array(length);
        } else {
            result.length = length;
        }
        for ( var i = 0; i < length; ++i) {
            result[i] = this.cartesianToCartographic(cartesians[i], result[i]);
        }
        return result;
    };

    var scaleToGeodeticSurfaceIntersection = new Cartesian3();
    var scaleToGeodeticSurfaceGradient = new Cartesian3();

    /**
     * Scales the provided Cartesian position along the geodetic surface normal
     * so that it is on the surface of this ellipsoid.  If the position is
     * at the center of the ellipsoid, this function returns undefined.
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter, a new Cartesian3 instance if none was provided, or undefined if the position is at the center.
     */
    Ellipsoid.prototype.scaleToGeodeticSurface = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        
        var positionX = cartesian.x;
        var positionY = cartesian.y;
        var positionZ = cartesian.z;

        var oneOverRadii = this._oneOverRadii;
        var oneOverRadiiX = oneOverRadii.x;
        var oneOverRadiiY = oneOverRadii.y;
        var oneOverRadiiZ = oneOverRadii.z;

        var x2 = positionX * positionX * oneOverRadiiX * oneOverRadiiX;
        var y2 = positionY * positionY * oneOverRadiiY * oneOverRadiiY;
        var z2 = positionZ * positionZ * oneOverRadiiZ * oneOverRadiiZ;

        // Compute the squared ellipsoid norm.
        var squaredNorm = x2 + y2 + z2;
        var ratio = Math.sqrt(1.0 / squaredNorm);

        // As an initial approximation, assume that the radial intersection is the projection point.
        var intersection = Cartesian3.multiplyByScalar(cartesian, ratio, scaleToGeodeticSurfaceIntersection);

        //* If the position is near the center, the iteration will not converge.
        if (squaredNorm < this._centerToleranceSquared) {
            return !isFinite(ratio) ? undefined : Cartesian3.clone(intersection, result);
        }

        var oneOverRadiiSquared = this._oneOverRadiiSquared;
        var oneOverRadiiSquaredX = oneOverRadiiSquared.x;
        var oneOverRadiiSquaredY = oneOverRadiiSquared.y;
        var oneOverRadiiSquaredZ = oneOverRadiiSquared.z;

        // Use the gradient at the intersection point in place of the true unit normal.
        // The difference in magnitude will be absorbed in the multiplier.
        var gradient = scaleToGeodeticSurfaceGradient;
        gradient.x = intersection.x * oneOverRadiiSquaredX * 2.0;
        gradient.y = intersection.y * oneOverRadiiSquaredY * 2.0;
        gradient.z = intersection.z * oneOverRadiiSquaredZ * 2.0;

        // Compute the initial guess at the normal vector multiplier, lambda.
        var lambda = (1.0 - ratio) * Cartesian3.magnitude(cartesian) / (0.5 * Cartesian3.magnitude(gradient));
        var correction = 0.0;

        var func;
        var denominator;
        var xMultiplier;
        var yMultiplier;
        var zMultiplier;
        var xMultiplier2;
        var yMultiplier2;
        var zMultiplier2;
        var xMultiplier3;
        var yMultiplier3;
        var zMultiplier3;

        do {
            lambda -= correction;

            xMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredX);
            yMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredY);
            zMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredZ);

            xMultiplier2 = xMultiplier * xMultiplier;
            yMultiplier2 = yMultiplier * yMultiplier;
            zMultiplier2 = zMultiplier * zMultiplier;

            xMultiplier3 = xMultiplier2 * xMultiplier;
            yMultiplier3 = yMultiplier2 * yMultiplier;
            zMultiplier3 = zMultiplier2 * zMultiplier;

            func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0;

            // "denominator" here refers to the use of this expression in the velocity and acceleration
            // computations in the sections to follow.
            denominator = x2 * xMultiplier3 * oneOverRadiiSquaredX + y2 * yMultiplier3 * oneOverRadiiSquaredY + z2 * zMultiplier3 * oneOverRadiiSquaredZ;

            var derivative = -2.0 * denominator;

            correction = func / derivative;
        } while (Math.abs(func) > CesiumMath.EPSILON12);

        if (!defined(result)) {
            return new Cartesian3(positionX * xMultiplier, positionY * yMultiplier, positionZ * zMultiplier);
        }
        result.x = positionX * xMultiplier;
        result.y = positionY * yMultiplier;
        result.z = positionZ * zMultiplier;
        return result;
    };

    /**
     * Scales the provided Cartesian position along the geocentric surface normal
     * so that it is on the surface of this ellipsoid.
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    Ellipsoid.prototype.scaleToGeocentricSurface = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        
        if (!defined(result)) {
            result = new Cartesian3();
        }

        var positionX = cartesian.x;
        var positionY = cartesian.y;
        var positionZ = cartesian.z;
        var oneOverRadiiSquared = this._oneOverRadiiSquared;

        var beta = 1.0 / Math.sqrt((positionX * positionX) * oneOverRadiiSquared.x +
                                   (positionY * positionY) * oneOverRadiiSquared.y +
                                   (positionZ * positionZ) * oneOverRadiiSquared.z);

        return Cartesian3.multiplyByScalar(cartesian, beta, result);
    };

    /**
     * Transforms a Cartesian X, Y, Z position to the ellipsoid-scaled space by multiplying
     * its components by the result of {@link Ellipsoid#oneOverRadii}.
     *
     * @param {Cartesian3} position The position to transform.
     * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3} The position expressed in the scaled space.  The returned instance is the
     *          one passed as the result parameter if it is not undefined, or a new instance of it is.
     */
    Ellipsoid.prototype.transformPositionToScaledSpace = function(position, result) {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        return Cartesian3.multiplyComponents(position, this._oneOverRadii, result);
    };

    /**
     * Transforms a Cartesian X, Y, Z position from the ellipsoid-scaled space by multiplying
     * its components by the result of {@link Ellipsoid#radii}.
     *
     * @param {Cartesian3} position The position to transform.
     * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3} The position expressed in the unscaled space.  The returned instance is the
     *          one passed as the result parameter if it is not undefined, or a new instance of it is.
     */
    Ellipsoid.prototype.transformPositionFromScaledSpace = function(position, result) {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        return Cartesian3.multiplyComponents(position, this._radii, result);
    };

    /**
     * Compares this Ellipsoid against the provided Ellipsoid componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Ellipsoid} [right] The other Ellipsoid.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Ellipsoid.prototype.equals = function(right) {
        return (this === right) ||
               (defined(right) &&
                Cartesian3.equals(this._radii, right._radii));
    };

    /**
     * Creates a string representing this Ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     *
     * @returns {String} A string representing this ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     */
    Ellipsoid.prototype.toString = function() {
        return this._radii.toString();
    };

    return Ellipsoid;
});

/*global define*/
define('Core/GeographicProjection',[
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Ellipsoid'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid) {
    "use strict";

    /**
     * A simple map projection where longitude and latitude are linearly mapped to X and Y by multiplying
     * them by the {@link Ellipsoid#maximumRadius}.  This projection
     * is commonly known as geographic, equirectangular, equidistant cylindrical, or plate carrée.  It
     * is also known as EPSG:4326.
     *
     * @alias GeographicProjection
     * @constructor
     *
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid.
     *
     * @see WebMercatorProjection
     */
    var GeographicProjection = function(ellipsoid) {
        this._ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        this._semimajorAxis = this._ellipsoid.maximumRadius;
        this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;
    };

    defineProperties(GeographicProjection.prototype, {
        /**
         * Gets the {@link Ellipsoid}.
         *
         * @memberof GeographicProjection.prototype
         *
         * @type {Ellipsoid}
         * @readonly
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        }
    });

    /**
     * Projects a set of {@link Cartographic} coordinates, in radians, to map coordinates, in meters.
     * X and Y are the longitude and latitude, respectively, multiplied by the maximum radius of the
     * ellipsoid.  Z is the unmodified height.
     *
     * @param {Cartographic} cartographic The coordinates to project.
     * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
     *        undefined, a new instance is created and returned.
     * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
     *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
     *          created and returned.
     */
    GeographicProjection.prototype.project = function(cartographic, result) {
        // Actually this is the special case of equidistant cylindrical called the plate carree
        var semimajorAxis = this._semimajorAxis;
        var x = cartographic.longitude * semimajorAxis;
        var y = cartographic.latitude * semimajorAxis;
        var z = cartographic.height;

        if (!defined(result)) {
            return new Cartesian3(x, y, z);
        }

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Unprojects a set of projected {@link Cartesian3} coordinates, in meters, to {@link Cartographic}
     * coordinates, in radians.  Longitude and Latitude are the X and Y coordinates, respectively,
     * divided by the maximum radius of the ellipsoid.  Height is the unmodified Z coordinate.
     *
     * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
     * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
     *        undefined, a new instance is created and returned.
     * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
     *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
     *          created and returned.
     */
    GeographicProjection.prototype.unproject = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        var oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
        var longitude = cartesian.x * oneOverEarthSemimajorAxis;
        var latitude = cartesian.y * oneOverEarthSemimajorAxis;
        var height = cartesian.z;

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }

        result.longitude = longitude;
        result.latitude = latitude;
        result.height = height;
        return result;
    };

    return GeographicProjection;
});

/*global define*/
define('Core/Intersect',[
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * This enumerated type is used in determining where, relative to the frustum, an
     * object is located. The object can either be fully contained within the frustum (INSIDE),
     * partially inside the frustum and partially outside (INTERSECTING), or somwhere entirely
     * outside of the frustum's 6 planes (OUTSIDE).
     *
     * @namespace
     * @alias Intersect
     */
    var Intersect = {
        /**
         * Represents that an object is not contained within the frustum.
         *
         * @type {Number}
         * @constant
         */
        OUTSIDE : -1,

        /**
         * Represents that an object intersects one of the frustum's planes.
         *
         * @type {Number}
         * @constant
         */
        INTERSECTING : 0,

        /**
         * Represents that an object is fully within the frustum.
         *
         * @type {Number}
         * @constant
         */
        INSIDE : 1
    };

    return freezeObject(Intersect);
});
/*global define*/
define('Core/Interval',[
        './defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * Represents the closed interval [start, stop].
     * @alias Interval
     * @constructor
     *
     * @param {Number} [start=0.0] The beginning of the interval.
     * @param {Number} [stop=0.0] The end of the interval.
     */
    var Interval = function(start, stop) {
        /**
         * The beginning of the interval.
         * @type {Number}
         * @default 0.0
         */
        this.start = defaultValue(start, 0.0);
        /**
         * The end of the interval.
         * @type {Number}
         * @default 0.0
         */
        this.stop = defaultValue(stop, 0.0);
    };

    return Interval;
});

/*global define*/
define('Core/Cartesian4',[
        './defaultValue',
        './defined',
        './DeveloperError',
        './freezeObject',
        './Math'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        freezeObject,
        CesiumMath) {
    "use strict";

    /**
     * A 4D Cartesian point.
     * @alias Cartesian4
     * @constructor
     *
     * @param {Number} [x=0.0] The X component.
     * @param {Number} [y=0.0] The Y component.
     * @param {Number} [z=0.0] The Z component.
     * @param {Number} [w=0.0] The W component.
     *
     * @see Cartesian2
     * @see Cartesian3
     * @see Packable
     */
    var Cartesian4 = function(x, y, z, w) {
        /**
         * The X component.
         * @type {Number}
         * @default 0.0
         */
        this.x = defaultValue(x, 0.0);

        /**
         * The Y component.
         * @type {Number}
         * @default 0.0
         */
        this.y = defaultValue(y, 0.0);

        /**
         * The Z component.
         * @type {Number}
         * @default 0.0
         */
        this.z = defaultValue(z, 0.0);

        /**
         * The W component.
         * @type {Number}
         * @default 0.0
         */
        this.w = defaultValue(w, 0.0);
    };

    /**
     * Creates a Cartesian4 instance from x, y, z and w coordinates.
     *
     * @param {Number} x The x coordinate.
     * @param {Number} y The y coordinate.
     * @param {Number} z The z coordinate.
     * @param {Number} w The w coordinate.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     */
    Cartesian4.fromElements = function(x, y, z, w, result) {
        if (!defined(result)) {
            return new Cartesian4(x, y, z, w);
        }

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Creates a Cartesian4 instance from a {@link Color}. <code>red</code>, <code>green</code>, <code>blue</code>,
     * and <code>alpha</code> map to <code>x</code>, <code>y</code>, <code>z</code>, and <code>w</code>, respectively.
     *
     * @param {Color} color The source color.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     */
    Cartesian4.fromColor = function(color, result) {
                if (!defined(color)) {
            throw new DeveloperError('color is required');
        }
                if (!defined(result)) {
            return new Cartesian4(color.red, color.green, color.blue, color.alpha);
        }

        result.x = color.red;
        result.y = color.green;
        result.z = color.blue;
        result.w = color.alpha;
        return result;
    };

    /**
     * Duplicates a Cartesian4 instance.
     *
     * @param {Cartesian4} cartesian The Cartesian to duplicate.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided. (Returns undefined if cartesian is undefined)
     */
    Cartesian4.clone = function(cartesian, result) {
        if (!defined(cartesian)) {
            return undefined;
        }

        if (!defined(result)) {
            return new Cartesian4(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
        }

        result.x = cartesian.x;
        result.y = cartesian.y;
        result.z = cartesian.z;
        result.w = cartesian.w;
        return result;
    };


    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Cartesian4.packedLength = 4;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Cartesian4} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Cartesian4.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.x;
        array[startingIndex++] = value.y;
        array[startingIndex++] = value.z;
        array[startingIndex] = value.w;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Cartesian4} [result] The object into which to store the result.
     * @returns {Cartesian4}  The modified result parameter or a new Cartesian4 instance if one was not provided.
     */
    Cartesian4.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Cartesian4();
        }
        result.x = array[startingIndex++];
        result.y = array[startingIndex++];
        result.z = array[startingIndex++];
        result.w = array[startingIndex];
        return result;
    };

    /**
     * Creates a Cartesian4 from four consecutive elements in an array.
     * @function
     *
     * @param {Number[]} array The array whose four consecutive elements correspond to the x, y, z, and w components, respectively.
     * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to the x component.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4}  The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @example
     * // Create a Cartesian4 with (1.0, 2.0, 3.0, 4.0)
     * var v = [1.0, 2.0, 3.0, 4.0];
     * var p = Cesium.Cartesian4.fromArray(v);
     *
     * // Create a Cartesian4 with (1.0, 2.0, 3.0, 4.0) using an offset into an array
     * var v2 = [0.0, 0.0, 1.0, 2.0, 3.0, 4.0];
     * var p2 = Cesium.Cartesian4.fromArray(v2, 2);
     */
    Cartesian4.fromArray = Cartesian4.unpack;

    /**
     * Computes the value of the maximum component for the supplied Cartesian.
     *
     * @param {Cartesian4} cartesian The cartesian to use.
     * @returns {Number} The value of the maximum component.
     */
    Cartesian4.maximumComponent = function(cartesian) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        return Math.max(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
    };

    /**
     * Computes the value of the minimum component for the supplied Cartesian.
     *
     * @param {Cartesian4} cartesian The cartesian to use.
     * @returns {Number} The value of the minimum component.
     */
    Cartesian4.minimumComponent = function(cartesian) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        return Math.min(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
    };

    /**
     * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
     *
     * @param {Cartesian4} first A cartesian to compare.
     * @param {Cartesian4} second A cartesian to compare.
     * @param {Cartesian4} result The object into which to store the result.
     * @returns {Cartesian4} A cartesian with the minimum components.
     */
    Cartesian4.minimumByComponent = function(first, second, result) {
                if (!defined(first)) {
            throw new DeveloperError('first is required.');
        }
        if (!defined(second)) {
            throw new DeveloperError('second is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        result.x = Math.min(first.x, second.x);
        result.y = Math.min(first.y, second.y);
        result.z = Math.min(first.z, second.z);
        result.w = Math.min(first.w, second.w);

        return result;
    };

    /**
     * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
     *
     * @param {Cartesian4} first A cartesian to compare.
     * @param {Cartesian4} second A cartesian to compare.
     * @param {Cartesian4} result The object into which to store the result.
     * @returns {Cartesian4} A cartesian with the maximum components.
     */
    Cartesian4.maximumByComponent = function(first, second, result) {
                if (!defined(first)) {
            throw new DeveloperError('first is required.');
        }
        if (!defined(second)) {
            throw new DeveloperError('second is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        result.x = Math.max(first.x, second.x);
        result.y = Math.max(first.y, second.y);
        result.z = Math.max(first.z, second.z);
        result.w = Math.max(first.w, second.w);

        return result;
    };

    /**
     * Computes the provided Cartesian's squared magnitude.
     *
     * @param {Cartesian4} cartesian The Cartesian instance whose squared magnitude is to be computed.
     * @returns {Number} The squared magnitude.
     */
    Cartesian4.magnitudeSquared = function(cartesian) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        return cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z + cartesian.w * cartesian.w;
    };

    /**
     * Computes the Cartesian's magnitude (length).
     *
     * @param {Cartesian4} cartesian The Cartesian instance whose magnitude is to be computed.
     * @returns {Number} The magnitude.
     */
    Cartesian4.magnitude = function(cartesian) {
        return Math.sqrt(Cartesian4.magnitudeSquared(cartesian));
    };

    var distanceScratch = new Cartesian4();

    /**
     * Computes the 4-space distance between two points.
     *
     * @param {Cartesian4} left The first point to compute the distance from.
     * @param {Cartesian4} right The second point to compute the distance to.
     * @returns {Number} The distance between two points.
     *
     * @example
     * // Returns 1.0
     * var d = Cesium.Cartesian4.distance(
     *   new Cesium.Cartesian4(1.0, 0.0, 0.0, 0.0),
     *   new Cesium.Cartesian4(2.0, 0.0, 0.0, 0.0));
     */
    Cartesian4.distance = function(left, right) {
                if (!defined(left) || !defined(right)) {
            throw new DeveloperError('left and right are required.');
        }
        
        Cartesian4.subtract(left, right, distanceScratch);
        return Cartesian4.magnitude(distanceScratch);
    };

    /**
     * Computes the squared distance between two points.  Comparing squared distances
     * using this function is more efficient than comparing distances using {@link Cartesian4#distance}.
     *
     * @param {Cartesian4} left The first point to compute the distance from.
     * @param {Cartesian4} right The second point to compute the distance to.
     * @returns {Number} The distance between two points.
     *
     * @example
     * // Returns 4.0, not 2.0
     * var d = Cesium.Cartesian4.distance(
     *   new Cesium.Cartesian4(1.0, 0.0, 0.0, 0.0),
     *   new Cesium.Cartesian4(3.0, 0.0, 0.0, 0.0));
     */
    Cartesian4.distanceSquared = function(left, right) {
                if (!defined(left) || !defined(right)) {
            throw new DeveloperError('left and right are required.');
        }
        
        Cartesian4.subtract(left, right, distanceScratch);
        return Cartesian4.magnitudeSquared(distanceScratch);
    };

    /**
     * Computes the normalized form of the supplied Cartesian.
     *
     * @param {Cartesian4} cartesian The Cartesian to be normalized.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Cartesian4.normalize = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var magnitude = Cartesian4.magnitude(cartesian);

        result.x = cartesian.x / magnitude;
        result.y = cartesian.y / magnitude;
        result.z = cartesian.z / magnitude;
        result.w = cartesian.w / magnitude;
        return result;
    };

    /**
     * Computes the dot (scalar) product of two Cartesians.
     *
     * @param {Cartesian4} left The first Cartesian.
     * @param {Cartesian4} right The second Cartesian.
     * @returns {Number} The dot product.
     */
    Cartesian4.dot = function(left, right) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        
        return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
    };

    /**
     * Computes the componentwise product of two Cartesians.
     *
     * @param {Cartesian4} left The first Cartesian.
     * @param {Cartesian4} right The second Cartesian.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Cartesian4.multiplyComponents = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x * right.x;
        result.y = left.y * right.y;
        result.z = left.z * right.z;
        result.w = left.w * right.w;
        return result;
    };

    /**
     * Computes the componentwise sum of two Cartesians.
     *
     * @param {Cartesian4} left The first Cartesian.
     * @param {Cartesian4} right The second Cartesian.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Cartesian4.add = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x + right.x;
        result.y = left.y + right.y;
        result.z = left.z + right.z;
        result.w = left.w + right.w;
        return result;
    };

    /**
     * Computes the componentwise difference of two Cartesians.
     *
     * @param {Cartesian4} left The first Cartesian.
     * @param {Cartesian4} right The second Cartesian.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Cartesian4.subtract = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x - right.x;
        result.y = left.y - right.y;
        result.z = left.z - right.z;
        result.w = left.w - right.w;
        return result;
    };

    /**
     * Multiplies the provided Cartesian componentwise by the provided scalar.
     *
     * @param {Cartesian4} cartesian The Cartesian to be scaled.
     * @param {Number} scalar The scalar to multiply with.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Cartesian4.multiplyByScalar = function(cartesian, scalar, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = cartesian.x * scalar;
        result.y = cartesian.y * scalar;
        result.z = cartesian.z * scalar;
        result.w = cartesian.w * scalar;
        return result;
    };

    /**
     * Divides the provided Cartesian componentwise by the provided scalar.
     *
     * @param {Cartesian4} cartesian The Cartesian to be divided.
     * @param {Number} scalar The scalar to divide by.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Cartesian4.divideByScalar = function(cartesian, scalar, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = cartesian.x / scalar;
        result.y = cartesian.y / scalar;
        result.z = cartesian.z / scalar;
        result.w = cartesian.w / scalar;
        return result;
    };

    /**
     * Negates the provided Cartesian.
     *
     * @param {Cartesian4} cartesian The Cartesian to be negated.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Cartesian4.negate = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = -cartesian.x;
        result.y = -cartesian.y;
        result.z = -cartesian.z;
        result.w = -cartesian.w;
        return result;
    };

    /**
     * Computes the absolute value of the provided Cartesian.
     *
     * @param {Cartesian4} cartesian The Cartesian whose absolute value is to be computed.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Cartesian4.abs = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = Math.abs(cartesian.x);
        result.y = Math.abs(cartesian.y);
        result.z = Math.abs(cartesian.z);
        result.w = Math.abs(cartesian.w);
        return result;
    };

    var lerpScratch = new Cartesian4();
    /**
     * Computes the linear interpolation or extrapolation at t using the provided cartesians.
     *
     * @param {Cartesian4} start The value corresponding to t at 0.0.
     * @param {Cartesian4}end The value corresponding to t at 1.0.
     * @param {Number} t The point along t at which to interpolate.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Cartesian4.lerp = function(start, end, t, result) {
                if (!defined(start)) {
            throw new DeveloperError('start is required.');
        }
        if (!defined(end)) {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        Cartesian4.multiplyByScalar(end, t, lerpScratch);
        result = Cartesian4.multiplyByScalar(start, 1.0 - t, result);
        return Cartesian4.add(lerpScratch, result, result);
    };

    var mostOrthogonalAxisScratch = new Cartesian4();
    /**
     * Returns the axis that is most orthogonal to the provided Cartesian.
     *
     * @param {Cartesian4} cartesian The Cartesian on which to find the most orthogonal axis.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The most orthogonal axis.
     */
    Cartesian4.mostOrthogonalAxis = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        var f = Cartesian4.normalize(cartesian, mostOrthogonalAxisScratch);
        Cartesian4.abs(f, f);

        if (f.x <= f.y) {
            if (f.x <= f.z) {
                if (f.x <= f.w) {
                    result = Cartesian4.clone(Cartesian4.UNIT_X, result);
                } else {
                    result = Cartesian4.clone(Cartesian4.UNIT_W, result);
                }
            } else if (f.z <= f.w) {
                result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
            } else {
                result = Cartesian4.clone(Cartesian4.UNIT_W, result);
            }
        } else if (f.y <= f.z) {
            if (f.y <= f.w) {
                result = Cartesian4.clone(Cartesian4.UNIT_Y, result);
            } else {
                result = Cartesian4.clone(Cartesian4.UNIT_W, result);
            }
        } else if (f.z <= f.w) {
            result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
        } else {
            result = Cartesian4.clone(Cartesian4.UNIT_W, result);
        }

        return result;
    };

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartesian4} [left] The first Cartesian.
     * @param {Cartesian4} [right] The second Cartesian.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Cartesian4.equals = function(left, right) {
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                (left.x === right.x) &&
                (left.y === right.y) &&
                (left.z === right.z) &&
                (left.w === right.w));
    };

    /**
     * @private
     */
    Cartesian4.equalsArray = function(cartesian, array, offset) {
        return cartesian.x === array[offset] &&
               cartesian.y === array[offset + 1] &&
               cartesian.z === array[offset + 2] &&
               cartesian.w === array[offset + 3];
    };

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they pass an absolute or relative tolerance test,
     * <code>false</code> otherwise.
     *
     * @param {Cartesian4} [left] The first Cartesian.
     * @param {Cartesian4} [right] The second Cartesian.
     * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
     * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    Cartesian4.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
        return (left === right) ||
               (defined(left) &&
                defined(right) &&
                CesiumMath.equalsEpsilon(left.x, right.x, relativeEpsilon, absoluteEpsilon) &&
                CesiumMath.equalsEpsilon(left.y, right.y, relativeEpsilon, absoluteEpsilon) &&
                CesiumMath.equalsEpsilon(left.z, right.z, relativeEpsilon, absoluteEpsilon) &&
                CesiumMath.equalsEpsilon(left.w, right.w, relativeEpsilon, absoluteEpsilon));
    };

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 0.0).
     *
     * @type {Cartesian4}
     * @constant
     */
    Cartesian4.ZERO = freezeObject(new Cartesian4(0.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (1.0, 0.0, 0.0, 0.0).
     *
     * @type {Cartesian4}
     * @constant
     */
    Cartesian4.UNIT_X = freezeObject(new Cartesian4(1.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 1.0, 0.0, 0.0).
     *
     * @type {Cartesian4}
     * @constant
     */
    Cartesian4.UNIT_Y = freezeObject(new Cartesian4(0.0, 1.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 1.0, 0.0).
     *
     * @type {Cartesian4}
     * @constant
     */
    Cartesian4.UNIT_Z = freezeObject(new Cartesian4(0.0, 0.0, 1.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 1.0).
     *
     * @type {Cartesian4}
     * @constant
     */
    Cartesian4.UNIT_W = freezeObject(new Cartesian4(0.0, 0.0, 0.0, 1.0));

    /**
     * Duplicates this Cartesian4 instance.
     *
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     */
    Cartesian4.prototype.clone = function(result) {
        return Cartesian4.clone(this, result);
    };

    /**
     * Compares this Cartesian against the provided Cartesian componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartesian4} [right] The right hand side Cartesian.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Cartesian4.prototype.equals = function(right) {
        return Cartesian4.equals(this, right);
    };

    /**
     * Compares this Cartesian against the provided Cartesian componentwise and returns
     * <code>true</code> if they pass an absolute or relative tolerance test,
     * <code>false</code> otherwise.
     *
     * @param {Cartesian4} [right] The right hand side Cartesian.
     * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
     * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
     * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     */
    Cartesian4.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
        return Cartesian4.equalsEpsilon(this, right, relativeEpsilon, absoluteEpsilon);
    };

    /**
     * Creates a string representing this Cartesian in the format '(x, y)'.
     *
     * @returns {String} A string representing the provided Cartesian in the format '(x, y)'.
     */
    Cartesian4.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
    };

    return Cartesian4;
});

/*global define*/
define('Core/Matrix3',[
        './Cartesian3',
        './defaultValue',
        './defined',
        './DeveloperError',
        './freezeObject',
        './Math'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        freezeObject,
        CesiumMath) {
    "use strict";

    /**
     * A 3x3 matrix, indexable as a column-major order array.
     * Constructor parameters are in row-major order for code readability.
     * @alias Matrix3
     * @constructor
     *
     * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
     * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
     * @param {Number} [column2Row0=0.0] The value for column 2, row 0.
     * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
     * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
     * @param {Number} [column2Row1=0.0] The value for column 2, row 1.
     * @param {Number} [column0Row2=0.0] The value for column 0, row 2.
     * @param {Number} [column1Row2=0.0] The value for column 1, row 2.
     * @param {Number} [column2Row2=0.0] The value for column 2, row 2.
     *
     * @see Matrix3.fromColumnMajorArray
     * @see Matrix3.fromRowMajorArray
     * @see Matrix3.fromQuaternion
     * @see Matrix3.fromScale
     * @see Matrix3.fromUniformScale
     * @see Matrix2
     * @see Matrix4
     */
    var Matrix3 = function(column0Row0, column1Row0, column2Row0,
                           column0Row1, column1Row1, column2Row1,
                           column0Row2, column1Row2, column2Row2) {
        this[0] = defaultValue(column0Row0, 0.0);
        this[1] = defaultValue(column0Row1, 0.0);
        this[2] = defaultValue(column0Row2, 0.0);
        this[3] = defaultValue(column1Row0, 0.0);
        this[4] = defaultValue(column1Row1, 0.0);
        this[5] = defaultValue(column1Row2, 0.0);
        this[6] = defaultValue(column2Row0, 0.0);
        this[7] = defaultValue(column2Row1, 0.0);
        this[8] = defaultValue(column2Row2, 0.0);
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Matrix3.packedLength = 9;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Matrix3} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Matrix3.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }

        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value[0];
        array[startingIndex++] = value[1];
        array[startingIndex++] = value[2];
        array[startingIndex++] = value[3];
        array[startingIndex++] = value[4];
        array[startingIndex++] = value[5];
        array[startingIndex++] = value[6];
        array[startingIndex++] = value[7];
        array[startingIndex++] = value[8];
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Matrix3} [result] The object into which to store the result.
     */
    Matrix3.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Matrix3();
        }

        result[0] = array[startingIndex++];
        result[1] = array[startingIndex++];
        result[2] = array[startingIndex++];
        result[3] = array[startingIndex++];
        result[4] = array[startingIndex++];
        result[5] = array[startingIndex++];
        result[6] = array[startingIndex++];
        result[7] = array[startingIndex++];
        result[8] = array[startingIndex++];
        return result;
    };

    /**
     * Duplicates a Matrix3 instance.
     *
     * @param {Matrix3} matrix The matrix to duplicate.
     * @param {Matrix3} [result] The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided. (Returns undefined if matrix is undefined)
     */
    Matrix3.clone = function(values, result) {
        if (!defined(values)) {
            return undefined;
        }
        if (!defined(result)) {
            return new Matrix3(values[0], values[3], values[6],
                               values[1], values[4], values[7],
                               values[2], values[5], values[8]);
        }
        result[0] = values[0];
        result[1] = values[1];
        result[2] = values[2];
        result[3] = values[3];
        result[4] = values[4];
        result[5] = values[5];
        result[6] = values[6];
        result[7] = values[7];
        result[8] = values[8];
        return result;
    };

    /**
     * Creates a Matrix3 from 9 consecutive elements in an array.
     *
     * @param {Number[]} array The array whose 9 consecutive elements correspond to the positions of the matrix.  Assumes column-major order.
     * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to first column first row position in the matrix.
     * @param {Matrix3} [result] The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Create the Matrix3:
     * // [1.0, 2.0, 3.0]
     * // [1.0, 2.0, 3.0]
     * // [1.0, 2.0, 3.0]
     *
     * var v = [1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0];
     * var m = Cesium.Matrix3.fromArray(v);
     *
     * // Create same Matrix3 with using an offset into an array
     * var v2 = [0.0, 0.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0];
     * var m2 = Cesium.Matrix3.fromArray(v2, 2);
     */
    Matrix3.fromArray = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Matrix3();
        }

        result[0] = array[startingIndex];
        result[1] = array[startingIndex + 1];
        result[2] = array[startingIndex + 2];
        result[3] = array[startingIndex + 3];
        result[4] = array[startingIndex + 4];
        result[5] = array[startingIndex + 5];
        result[6] = array[startingIndex + 6];
        result[7] = array[startingIndex + 7];
        result[8] = array[startingIndex + 8];
        return result;
    };

    /**
     * Creates a Matrix3 instance from a column-major order array.
     *
     * @param {Number[]} values The column-major order array.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
     */
    Matrix3.fromColumnMajorArray = function(values, result) {
                if (!defined(values)) {
            throw new DeveloperError('values parameter is required');
        }
        
        return Matrix3.clone(values, result);
    };

    /**
     * Creates a Matrix3 instance from a row-major order array.
     * The resulting matrix will be in column-major order.
     *
     * @param {Number[]} values The row-major order array.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
     */
    Matrix3.fromRowMajorArray = function(values, result) {
                if (!defined(values)) {
            throw new DeveloperError('values is required.');
        }
        
        if (!defined(result)) {
            return new Matrix3(values[0], values[1], values[2],
                               values[3], values[4], values[5],
                               values[6], values[7], values[8]);
        }
        result[0] = values[0];
        result[1] = values[3];
        result[2] = values[6];
        result[3] = values[1];
        result[4] = values[4];
        result[5] = values[7];
        result[6] = values[2];
        result[7] = values[5];
        result[8] = values[8];
        return result;
    };

    /**
     * Computes a 3x3 rotation matrix from the provided quaternion.
     *
     * @param {Quaternion} quaternion the quaternion to use.
     * @returns {Matrix3} The 3x3 rotation matrix from this quaternion.
     */
    Matrix3.fromQuaternion = function(quaternion, result) {
                if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        
        var x2 = quaternion.x * quaternion.x;
        var xy = quaternion.x * quaternion.y;
        var xz = quaternion.x * quaternion.z;
        var xw = quaternion.x * quaternion.w;
        var y2 = quaternion.y * quaternion.y;
        var yz = quaternion.y * quaternion.z;
        var yw = quaternion.y * quaternion.w;
        var z2 = quaternion.z * quaternion.z;
        var zw = quaternion.z * quaternion.w;
        var w2 = quaternion.w * quaternion.w;

        var m00 = x2 - y2 - z2 + w2;
        var m01 = 2.0 * (xy - zw);
        var m02 = 2.0 * (xz + yw);

        var m10 = 2.0 * (xy + zw);
        var m11 = -x2 + y2 - z2 + w2;
        var m12 = 2.0 * (yz - xw);

        var m20 = 2.0 * (xz - yw);
        var m21 = 2.0 * (yz + xw);
        var m22 = -x2 - y2 + z2 + w2;

        if (!defined(result)) {
            return new Matrix3(m00, m01, m02,
                               m10, m11, m12,
                               m20, m21, m22);
        }
        result[0] = m00;
        result[1] = m10;
        result[2] = m20;
        result[3] = m01;
        result[4] = m11;
        result[5] = m21;
        result[6] = m02;
        result[7] = m12;
        result[8] = m22;
        return result;
    };

    /**
     * Computes a Matrix3 instance representing a non-uniform scale.
     *
     * @param {Cartesian3} scale The x, y, and z scale factors.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Creates
     * //   [7.0, 0.0, 0.0]
     * //   [0.0, 8.0, 0.0]
     * //   [0.0, 0.0, 9.0]
     * var m = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
     */
    Matrix3.fromScale = function(scale, result) {
                if (!defined(scale)) {
            throw new DeveloperError('scale is required.');
        }
        
        if (!defined(result)) {
            return new Matrix3(
                scale.x, 0.0,     0.0,
                0.0,     scale.y, 0.0,
                0.0,     0.0,     scale.z);
        }

        result[0] = scale.x;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = scale.y;
        result[5] = 0.0;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = scale.z;
        return result;
    };

    /**
     * Computes a Matrix3 instance representing a uniform scale.
     *
     * @param {Number} scale The uniform scale factor.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Creates
     * //   [2.0, 0.0, 0.0]
     * //   [0.0, 2.0, 0.0]
     * //   [0.0, 0.0, 2.0]
     * var m = Cesium.Matrix3.fromUniformScale(2.0);
     */
    Matrix3.fromUniformScale = function(scale, result) {
                if (typeof scale !== 'number') {
            throw new DeveloperError('scale is required.');
        }
        
        if (!defined(result)) {
            return new Matrix3(
                scale, 0.0,   0.0,
                0.0,   scale, 0.0,
                0.0,   0.0,   scale);
        }

        result[0] = scale;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = scale;
        result[5] = 0.0;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = scale;
        return result;
    };

    /**
     * Computes a Matrix3 instance representing the cross product equivalent matrix of a Cartesian3 vector.
     *
     * @param {Cartesian3} the vector on the left hand side of the cross product operation.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Creates
     * //   [0.0, -9.0,  8.0]
     * //   [9.0,  0.0, -7.0]
     * //   [-8.0, 7.0,  0.0]
     * var m = Cesium.Matrix3.fromCrossProduct(new Cesium.Cartesian3(7.0, 8.0, 9.0));
     */
    Matrix3.fromCrossProduct = function(vector, result) {
                if (!defined(vector)) {
            throw new DeveloperError('vector is required.');
        }
        
        if (!defined(result)) {
            return new Matrix3(
                      0.0, -vector.z,  vector.y,
                 vector.z,       0.0, -vector.x,
                -vector.y,  vector.x,       0.0);
        }

        result[0] = 0.0;
        result[1] = vector.z;
        result[2] = -vector.y;
        result[3] = -vector.z;
        result[4] = 0.0;
        result[5] = vector.x;
        result[6] = vector.y;
        result[7] = -vector.x;
        result[8] = 0.0;
        return result;
    };

    /**
     * Creates a rotation matrix around the x-axis.
     *
     * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Rotate a point 45 degrees counterclockwise around the x-axis.
     * var p = new Cesium.Cartesian3(5, 6, 7);
     * var m = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(45.0));
     * var rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
     */
    Matrix3.fromRotationX = function(angle, result) {
                if (!defined(angle)) {
            throw new DeveloperError('angle is required.');
        }
        
        var cosAngle = Math.cos(angle);
        var sinAngle = Math.sin(angle);

        if (!defined(result)) {
            return new Matrix3(
                1.0, 0.0, 0.0,
                0.0, cosAngle, -sinAngle,
                0.0, sinAngle, cosAngle);
        }

        result[0] = 1.0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = cosAngle;
        result[5] = sinAngle;
        result[6] = 0.0;
        result[7] = -sinAngle;
        result[8] = cosAngle;

        return result;
    };

    /**
     * Creates a rotation matrix around the y-axis.
     *
     * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Rotate a point 45 degrees counterclockwise around the y-axis.
     * var p = new Cesium.Cartesian3(5, 6, 7);
     * var m = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(45.0));
     * var rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
     */
    Matrix3.fromRotationY = function(angle, result) {
                if (!defined(angle)) {
            throw new DeveloperError('angle is required.');
        }
        
        var cosAngle = Math.cos(angle);
        var sinAngle = Math.sin(angle);

        if (!defined(result)) {
            return new Matrix3(
                cosAngle, 0.0, sinAngle,
                0.0, 1.0, 0.0,
                -sinAngle, 0.0, cosAngle);
        }

        result[0] = cosAngle;
        result[1] = 0.0;
        result[2] = -sinAngle;
        result[3] = 0.0;
        result[4] = 1.0;
        result[5] = 0.0;
        result[6] = sinAngle;
        result[7] = 0.0;
        result[8] = cosAngle;

        return result;
    };

    /**
     * Creates a rotation matrix around the z-axis.
     *
     * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
     * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix3 instance if one was not provided.
     *
     * @example
     * // Rotate a point 45 degrees counterclockwise around the z-axis.
     * var p = new Cesium.Cartesian3(5, 6, 7);
     * var m = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(45.0));
     * var rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
     */
    Matrix3.fromRotationZ = function(angle, result) {
                if (!defined(angle)) {
            throw new DeveloperError('angle is required.');
        }
        
        var cosAngle = Math.cos(angle);
        var sinAngle = Math.sin(angle);

        if (!defined(result)) {
            return new Matrix3(
                cosAngle, -sinAngle, 0.0,
                sinAngle, cosAngle, 0.0,
                0.0, 0.0, 1.0);
        }

        result[0] = cosAngle;
        result[1] = sinAngle;
        result[2] = 0.0;
        result[3] = -sinAngle;
        result[4] = cosAngle;
        result[5] = 0.0;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 1.0;

        return result;
    };

    /**
     * Creates an Array from the provided Matrix3 instance.
     * The array will be in column-major order.
     *
     * @param {Matrix3} matrix The matrix to use..
     * @param {Number[]} [result] The Array onto which to store the result.
     * @returns {Number[]} The modified Array parameter or a new Array instance if one was not provided.
     */
    Matrix3.toArray = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        
        if (!defined(result)) {
            return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5], matrix[6], matrix[7], matrix[8]];
        }
        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[3];
        result[4] = matrix[4];
        result[5] = matrix[5];
        result[6] = matrix[6];
        result[7] = matrix[7];
        result[8] = matrix[8];
        return result;
    };

    /**
     * Computes the array index of the element at the provided row and column.
     *
     * @param {Number} row The zero-based index of the row.
     * @param {Number} column The zero-based index of the column.
     * @returns {Number} The index of the element at the provided row and column.
     *
     * @exception {DeveloperError} row must be 0, 1, or 2.
     * @exception {DeveloperError} column must be 0, 1, or 2.
     *
     * @example
     * var myMatrix = new Cesium.Matrix3();
     * var column1Row0Index = Cesium.Matrix3.getElementIndex(1, 0);
     * var column1Row0 = myMatrix[column1Row0Index]
     * myMatrix[column1Row0Index] = 10.0;
     */
    Matrix3.getElementIndex = function(column, row) {
                if (typeof row !== 'number' || row < 0 || row > 2) {
            throw new DeveloperError('row must be 0, 1, or 2.');
        }
        if (typeof column !== 'number' || column < 0 || column > 2) {
            throw new DeveloperError('column must be 0, 1, or 2.');
        }
        
        return column * 3 + row;
    };

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian3 instance.
     *
     * @param {Matrix3} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, or 2.
     */
    Matrix3.getColumn = function(matrix, index, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required.');
        }

        if (typeof index !== 'number' || index < 0 || index > 2) {
            throw new DeveloperError('index must be 0, 1, or 2.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var startIndex = index * 3;
        var x = matrix[startIndex];
        var y = matrix[startIndex + 1];
        var z = matrix[startIndex + 2];

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian3 instance.
     *
     * @param {Matrix3} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to set.
     * @param {Cartesian3} cartesian The Cartesian whose values will be assigned to the specified column.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, or 2.
     */
    Matrix3.setColumn = function(matrix, index, cartesian, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 2) {
            throw new DeveloperError('index must be 0, 1, or 2.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result = Matrix3.clone(matrix, result);
        var startIndex = index * 3;
        result[startIndex] = cartesian.x;
        result[startIndex + 1] = cartesian.y;
        result[startIndex + 2] = cartesian.z;
        return result;
    };

    /**
     * Retrieves a copy of the matrix row at the provided index as a Cartesian3 instance.
     *
     * @param {Matrix3} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to retrieve.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, or 2.
     */
    Matrix3.getRow = function(matrix, index, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required.');
        }
        if (typeof index !== 'number' || index < 0 || index > 2) {
            throw new DeveloperError('index must be 0, 1, or 2.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var x = matrix[index];
        var y = matrix[index + 3];
        var z = matrix[index + 6];

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian3 instance.
     *
     * @param {Matrix3} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to set.
     * @param {Cartesian3} cartesian The Cartesian whose values will be assigned to the specified row.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, or 2.
     */
    Matrix3.setRow = function(matrix, index, cartesian, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 2) {
            throw new DeveloperError('index must be 0, 1, or 2.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result = Matrix3.clone(matrix, result);
        result[index] = cartesian.x;
        result[index + 3] = cartesian.y;
        result[index + 6] = cartesian.z;
        return result;
    };

    var scratchColumn = new Cartesian3();

    /**
     * Extracts the non-uniform scale assuming the matrix is an affine transformation.
     *
     * @param {Matrix3} matrix The matrix.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Matrix3.getScale = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result.x = Cartesian3.magnitude(Cartesian3.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn));
        result.y = Cartesian3.magnitude(Cartesian3.fromElements(matrix[3], matrix[4], matrix[5], scratchColumn));
        result.z = Cartesian3.magnitude(Cartesian3.fromElements(matrix[6], matrix[7], matrix[8], scratchColumn));
        return result;
    };

    var scratchScale = new Cartesian3();

    /**
     * Computes the maximum scale assuming the matrix is an affine transformation.
     * The maximum scale is the maximum length of the column vectors.
     *
     * @param {Matrix3} matrix The matrix.
     * @returns {Number} The maximum scale.
     */
    Matrix3.getMaximumScale = function(matrix) {
        Matrix3.getScale(matrix, scratchScale);
        return Cartesian3.maximumComponent(scratchScale);
    };

    /**
     * Computes the product of two matrices.
     *
     * @param {Matrix3} left The first matrix.
     * @param {Matrix3} right The second matrix.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     */
    Matrix3.multiply = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var column0Row0 = left[0] * right[0] + left[3] * right[1] + left[6] * right[2];
        var column0Row1 = left[1] * right[0] + left[4] * right[1] + left[7] * right[2];
        var column0Row2 = left[2] * right[0] + left[5] * right[1] + left[8] * right[2];

        var column1Row0 = left[0] * right[3] + left[3] * right[4] + left[6] * right[5];
        var column1Row1 = left[1] * right[3] + left[4] * right[4] + left[7] * right[5];
        var column1Row2 = left[2] * right[3] + left[5] * right[4] + left[8] * right[5];

        var column2Row0 = left[0] * right[6] + left[3] * right[7] + left[6] * right[8];
        var column2Row1 = left[1] * right[6] + left[4] * right[7] + left[7] * right[8];
        var column2Row2 = left[2] * right[6] + left[5] * right[7] + left[8] * right[8];

        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = column1Row0;
        result[4] = column1Row1;
        result[5] = column1Row2;
        result[6] = column2Row0;
        result[7] = column2Row1;
        result[8] = column2Row2;
        return result;
    };

    /**
     * Computes the sum of two matrices.
     *
     * @param {Matrix3} left The first matrix.
     * @param {Matrix3} right The second matrix.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     */
    Matrix3.add = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = left[0] + right[0];
        result[1] = left[1] + right[1];
        result[2] = left[2] + right[2];
        result[3] = left[3] + right[3];
        result[4] = left[4] + right[4];
        result[5] = left[5] + right[5];
        result[6] = left[6] + right[6];
        result[7] = left[7] + right[7];
        result[8] = left[8] + right[8];
        return result;
    };

    /**
     * Computes the difference of two matrices.
     *
     * @param {Matrix3} left The first matrix.
     * @param {Matrix3} right The second matrix.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     */
    Matrix3.subtract = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = left[0] - right[0];
        result[1] = left[1] - right[1];
        result[2] = left[2] - right[2];
        result[3] = left[3] - right[3];
        result[4] = left[4] - right[4];
        result[5] = left[5] - right[5];
        result[6] = left[6] - right[6];
        result[7] = left[7] - right[7];
        result[8] = left[8] - right[8];
        return result;
    };

    /**
     * Computes the product of a matrix and a column vector.
     *
     * @param {Matrix3} matrix The matrix.
     * @param {Cartesian3} cartesian The column.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Matrix3.multiplyByVector = function(matrix, cartesian, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var vX = cartesian.x;
        var vY = cartesian.y;
        var vZ = cartesian.z;

        var x = matrix[0] * vX + matrix[3] * vY + matrix[6] * vZ;
        var y = matrix[1] * vX + matrix[4] * vY + matrix[7] * vZ;
        var z = matrix[2] * vX + matrix[5] * vY + matrix[8] * vZ;

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Computes the product of a matrix and a scalar.
     *
     * @param {Matrix3} matrix The matrix.
     * @param {Number} scalar The number to multiply by.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     */
    Matrix3.multiplyByScalar = function(matrix, scalar, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar must be a number');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = matrix[0] * scalar;
        result[1] = matrix[1] * scalar;
        result[2] = matrix[2] * scalar;
        result[3] = matrix[3] * scalar;
        result[4] = matrix[4] * scalar;
        result[5] = matrix[5] * scalar;
        result[6] = matrix[6] * scalar;
        result[7] = matrix[7] * scalar;
        result[8] = matrix[8] * scalar;
        return result;
    };

    /**
     * Creates a negated copy of the provided matrix.
     *
     * @param {Matrix3} matrix The matrix to negate.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     */
    Matrix3.negate = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = -matrix[0];
        result[1] = -matrix[1];
        result[2] = -matrix[2];
        result[3] = -matrix[3];
        result[4] = -matrix[4];
        result[5] = -matrix[5];
        result[6] = -matrix[6];
        result[7] = -matrix[7];
        result[8] = -matrix[8];
        return result;
    };

    /**
     * Computes the transpose of the provided matrix.
     *
     * @param {Matrix3} matrix The matrix to transpose.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     */
    Matrix3.transpose = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var column0Row0 = matrix[0];
        var column0Row1 = matrix[3];
        var column0Row2 = matrix[6];
        var column1Row0 = matrix[1];
        var column1Row1 = matrix[4];
        var column1Row2 = matrix[7];
        var column2Row0 = matrix[2];
        var column2Row1 = matrix[5];
        var column2Row2 = matrix[8];

        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = column1Row0;
        result[4] = column1Row1;
        result[5] = column1Row2;
        result[6] = column2Row0;
        result[7] = column2Row1;
        result[8] = column2Row2;
        return result;
    };

    function computeFrobeniusNorm(matrix) {
        var norm = 0.0;
        for (var i = 0; i < 9; ++i) {
            var temp = matrix[i];
            norm += temp * temp;
        }

        return Math.sqrt(norm);
    }

    var rowVal = [1, 0, 0];
    var colVal = [2, 2, 1];

    function offDiagonalFrobeniusNorm(matrix) {
        // Computes the "off-diagonal" Frobenius norm.
        // Assumes matrix is symmetric.

        var norm = 0.0;
        for (var i = 0; i < 3; ++i) {
            var temp = matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])];
            norm += 2.0 * temp * temp;
        }

        return Math.sqrt(norm);
    }

    function shurDecomposition(matrix, result) {
        // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
        // section 8.4.2 The 2by2 Symmetric Schur Decomposition.
        //
        // The routine takes a matrix, which is assumed to be symmetric, and
        // finds the largest off-diagonal term, and then creates
        // a matrix (result) which can be used to help reduce it

        var tolerance = CesiumMath.EPSILON15;

        var maxDiagonal = 0.0;
        var rotAxis = 1;

        // find pivot (rotAxis) based on max diagonal of matrix
        for (var i = 0; i < 3; ++i) {
            var temp = Math.abs(matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])]);
            if (temp > maxDiagonal) {
                rotAxis = i;
                maxDiagonal = temp;
            }
        }

        var c = 1.0;
        var s = 0.0;

        var p = rowVal[rotAxis];
        var q = colVal[rotAxis];

        if (Math.abs(matrix[Matrix3.getElementIndex(q, p)]) > tolerance) {
            var qq = matrix[Matrix3.getElementIndex(q, q)];
            var pp = matrix[Matrix3.getElementIndex(p, p)];
            var qp = matrix[Matrix3.getElementIndex(q, p)];

            var tau = (qq - pp) / 2.0 / qp;
            var t;

            if (tau < 0.0) {
                t = -1.0 / (-tau + Math.sqrt(1.0 + tau * tau));
            } else {
                t = 1.0 / (tau + Math.sqrt(1.0 + tau * tau));
            }

            c = 1.0 / Math.sqrt(1.0 + t * t);
            s = t * c;
        }

        result = Matrix3.clone(Matrix3.IDENTITY, result);

        result[Matrix3.getElementIndex(p, p)] = result[Matrix3.getElementIndex(q, q)] = c;
        result[Matrix3.getElementIndex(q, p)] = s;
        result[Matrix3.getElementIndex(p, q)] = -s;

        return result;
    }

    var jMatrix = new Matrix3();
    var jMatrixTranspose = new Matrix3();

    /**
     * Computes the eigenvectors and eigenvalues of a symmetric matrix.
     * <p>
     * Returns a diagonal matrix and unitary matrix such that:
     * <code>matrix = unitary matrix * diagonal matrix * transpose(unitary matrix)</code>
     * </p>
     * <p>
     * The values along the diagonal of the diagonal matrix are the eigenvalues. The columns
     * of the unitary matrix are the corresponding eigenvectors.
     * </p>
     *
     * @param {Matrix3} matrix The matrix to decompose into diagonal and unitary matrix. Expected to be symmetric.
     * @param {Object} [result] An object with unitary and diagonal properties which are matrices onto which to store the result.
     * @returns {Object} An object with unitary and diagonal properties which are the unitary and diagonal matrices, respectively.
     *
     * @example
     * var a = //... symetric matrix
     * var result = {
     *     unitary : new Cesium.Matrix3(),
     *     diagonal : new Cesium.Matrix3()
     * };
     * Cesium.Matrix3.computeEigenDecomposition(a, result);
     *
     * var unitaryTranspose = Cesium.Matrix3.transpose(result.unitary, new Cesium.Matrix3());
     * var b = Cesium.Matrix3.multiply(result.unitary, result.diagonal, new Cesium.Matrix3());
     * Cesium.Matrix3.multiply(b, unitaryTranspose, b); // b is now equal to a
     *
     * var lambda = Cesium.Matrix3.getColumn(result.diagonal, 0, new Cesium.Cartesian3()).x;  // first eigenvalue
     * var v = Cesium.Matrix3.getColumn(result.unitary, 0, new Cesium.Cartesian3());          // first eigenvector
     * var c = Cesium.Cartesian3.multiplyByScalar(v, lambda, new Cesium.Cartesian3());        // equal to Cesium.Matrix3.multiplyByVector(a, v)
     */
    Matrix3.computeEigenDecomposition = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required.');
        }
        
        // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
        // section 8.4.3 The Classical Jacobi Algorithm

        var tolerance = CesiumMath.EPSILON20;
        var maxSweeps = 10;

        var count = 0;
        var sweep = 0;

        if (!defined(result)) {
            result = {};
        }

        var unitaryMatrix = result.unitary = Matrix3.clone(Matrix3.IDENTITY, result.unitary);
        var diagMatrix = result.diagonal = Matrix3.clone(matrix, result.diagonal);

        var epsilon = tolerance * computeFrobeniusNorm(diagMatrix);

        while (sweep < maxSweeps && offDiagonalFrobeniusNorm(diagMatrix) > epsilon) {
            shurDecomposition(diagMatrix, jMatrix);
            Matrix3.transpose(jMatrix, jMatrixTranspose);
            Matrix3.multiply(diagMatrix, jMatrix, diagMatrix);
            Matrix3.multiply(jMatrixTranspose, diagMatrix, diagMatrix);
            Matrix3.multiply(unitaryMatrix, jMatrix, unitaryMatrix);

            if (++count > 2) {
                ++sweep;
                count = 0;
            }
        }

        return result;
    };

    /**
     * Computes a matrix, which contains the absolute (unsigned) values of the provided matrix's elements.
     *
     * @param {Matrix3} matrix The matrix with signed elements.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     */
    Matrix3.abs = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = Math.abs(matrix[0]);
        result[1] = Math.abs(matrix[1]);
        result[2] = Math.abs(matrix[2]);
        result[3] = Math.abs(matrix[3]);
        result[4] = Math.abs(matrix[4]);
        result[5] = Math.abs(matrix[5]);
        result[6] = Math.abs(matrix[6]);
        result[7] = Math.abs(matrix[7]);
        result[8] = Math.abs(matrix[8]);

        return result;
    };

    /**
     * Computes the determinant of the provided matrix.
     *
     * @param {Matrix3} matrix The matrix to use.
     * @returns {Number} The value of the determinant of the matrix.
     */
    Matrix3.determinant = function(matrix) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        
        var m11 = matrix[0];
        var m21 = matrix[3];
        var m31 = matrix[6];
        var m12 = matrix[1];
        var m22 = matrix[4];
        var m32 = matrix[7];
        var m13 = matrix[2];
        var m23 = matrix[5];
        var m33 = matrix[8];

        return m11 * (m22 * m33 - m23 * m32) + m12 * (m23 * m31 - m21 * m33) + m13 * (m21 * m32 - m22 * m31);
    };

    /**
     * Computes the inverse of the provided matrix.
     *
     * @param {Matrix3} matrix The matrix to invert.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     *
     * @exception {DeveloperError} matrix is not invertible.
     */
    Matrix3.inverse = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var m11 = matrix[0];
        var m21 = matrix[1];
        var m31 = matrix[2];
        var m12 = matrix[3];
        var m22 = matrix[4];
        var m32 = matrix[5];
        var m13 = matrix[6];
        var m23 = matrix[7];
        var m33 = matrix[8];

        var determinant = Matrix3.determinant(matrix);

        if (Math.abs(determinant) <= CesiumMath.EPSILON15) {
            throw new DeveloperError('matrix is not invertible');
        }

        result[0] = m22 * m33 - m23 * m32;
        result[1] = m23 * m31 - m21 * m33;
        result[2] = m21 * m32 - m22 * m31;
        result[3] = m13 * m32 - m12 * m33;
        result[4] = m11 * m33 - m13 * m31;
        result[5] = m12 * m31 - m11 * m32;
        result[6] = m12 * m23 - m13 * m22;
        result[7] = m13 * m21 - m11 * m23;
        result[8] = m11 * m22 - m12 * m21;

       var scale = 1.0 / determinant;
       return Matrix3.multiplyByScalar(result, scale, result);
    };

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Matrix3} [left] The first matrix.
     * @param {Matrix3} [right] The second matrix.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Matrix3.equals = function(left, right) {
        return (left === right) ||
               (defined(left) &&
                defined(right) &&
                left[0] === right[0] &&
                left[1] === right[1] &&
                left[2] === right[2] &&
                left[3] === right[3] &&
                left[4] === right[4] &&
                left[5] === right[5] &&
                left[6] === right[6] &&
                left[7] === right[7] &&
                left[8] === right[8]);
    };

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {Matrix3} [left] The first matrix.
     * @param {Matrix3} [right] The second matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    Matrix3.equalsEpsilon = function(left, right, epsilon) {
                if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon must be a number');
        }
        
        return (left === right) ||
                (defined(left) &&
                defined(right) &&
                Math.abs(left[0] - right[0]) <= epsilon &&
                Math.abs(left[1] - right[1]) <= epsilon &&
                Math.abs(left[2] - right[2]) <= epsilon &&
                Math.abs(left[3] - right[3]) <= epsilon &&
                Math.abs(left[4] - right[4]) <= epsilon &&
                Math.abs(left[5] - right[5]) <= epsilon &&
                Math.abs(left[6] - right[6]) <= epsilon &&
                Math.abs(left[7] - right[7]) <= epsilon &&
                Math.abs(left[8] - right[8]) <= epsilon);
    };

    /**
     * An immutable Matrix3 instance initialized to the identity matrix.
     *
     * @type {Matrix3}
     * @constant
     */
    Matrix3.IDENTITY = freezeObject(new Matrix3(1.0, 0.0, 0.0,
                                                0.0, 1.0, 0.0,
                                                0.0, 0.0, 1.0));

    /**
     * The index into Matrix3 for column 0, row 0.
     *
     * @type {Number}
     * @constant
     */
    Matrix3.COLUMN0ROW0 = 0;

    /**
     * The index into Matrix3 for column 0, row 1.
     *
     * @type {Number}
     * @constant
     */
    Matrix3.COLUMN0ROW1 = 1;

    /**
     * The index into Matrix3 for column 0, row 2.
     *
     * @type {Number}
     * @constant
     */
    Matrix3.COLUMN0ROW2 = 2;

    /**
     * The index into Matrix3 for column 1, row 0.
     *
     * @type {Number}
     * @constant
     */
    Matrix3.COLUMN1ROW0 = 3;

    /**
     * The index into Matrix3 for column 1, row 1.
     *
     * @type {Number}
     * @constant
     */
    Matrix3.COLUMN1ROW1 = 4;

    /**
     * The index into Matrix3 for column 1, row 2.
     *
     * @type {Number}
     * @constant
     */
    Matrix3.COLUMN1ROW2 = 5;

    /**
     * The index into Matrix3 for column 2, row 0.
     *
     * @type {Number}
     * @constant
     */
    Matrix3.COLUMN2ROW0 = 6;

    /**
     * The index into Matrix3 for column 2, row 1.
     *
     * @type {Number}
     * @constant
     */
    Matrix3.COLUMN2ROW1 = 7;

    /**
     * The index into Matrix3 for column 2, row 2.
     *
     * @type {Number}
     * @constant
     */
    Matrix3.COLUMN2ROW2 = 8;

    /**
     * Duplicates the provided Matrix3 instance.
     *
     * @param {Matrix3} [result] The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
     */
    Matrix3.prototype.clone = function(result) {
        return Matrix3.clone(this, result);
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Matrix3} [right] The right hand side matrix.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Matrix3.prototype.equals = function(right) {
        return Matrix3.equals(this, right);
    };

    /**
     * @private
     */
    Matrix3.equalsArray = function(matrix, array, offset) {
        return matrix[0] === array[offset] &&
               matrix[1] === array[offset + 1] &&
               matrix[2] === array[offset + 2] &&
               matrix[3] === array[offset + 3] &&
               matrix[4] === array[offset + 4] &&
               matrix[5] === array[offset + 5] &&
               matrix[6] === array[offset + 6] &&
               matrix[7] === array[offset + 7] &&
               matrix[8] === array[offset + 8];
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {Matrix3} [right] The right hand side matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     */
    Matrix3.prototype.equalsEpsilon = function(right, epsilon) {
        return Matrix3.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Creates a string representing this Matrix with each row being
     * on a separate line and in the format '(column0, column1, column2)'.
     *
     * @returns {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2)'.
     */
    Matrix3.prototype.toString = function() {
        return '(' + this[0] + ', ' + this[3] + ', ' + this[6] + ')\n' +
               '(' + this[1] + ', ' + this[4] + ', ' + this[7] + ')\n' +
               '(' + this[2] + ', ' + this[5] + ', ' + this[8] + ')';
    };

    return Matrix3;
});

/*global define*/
define('Core/RuntimeError',[
        './defined'
    ], function(
        defined) {
    "use strict";

    /**
     * Constructs an exception object that is thrown due to an error that can occur at runtime, e.g.,
     * out of memory, could not compile shader, etc.  If a function may throw this
     * exception, the calling code should be prepared to catch it.
     * <br /><br />
     * On the other hand, a {@link DeveloperError} indicates an exception due
     * to a developer error, e.g., invalid argument, that usually indicates a bug in the
     * calling code.
     *
     * @alias RuntimeError
     * @constructor
     *
     * @param {String} [message] The error message for this exception.
     *
     * @see DeveloperError
     */
    var RuntimeError = function(message) {
        /**
         * 'RuntimeError' indicating that this exception was thrown due to a runtime error.
         * @type {String}
         * @readonly
         */
        this.name = 'RuntimeError';

        /**
         * The explanation for why this exception was thrown.
         * @type {String}
         * @readonly
         */
        this.message = message;

        //Browsers such as IE don't have a stack property until you actually throw the error.
        var stack;
        try {
            throw new Error();
        } catch (e) {
            stack = e.stack;
        }

        /**
         * The stack trace of this exception, if available.
         * @type {String}
         * @readonly
         */
        this.stack = stack;
    };

    RuntimeError.prototype.toString = function() {
        var str = this.name + ': ' + this.message;

        if (defined(this.stack)) {
            str += '\n' + this.stack.toString();
        }

        return str;
    };

    return RuntimeError;
});

/*global define*/
define('Core/Matrix4',[
        './Cartesian3',
        './Cartesian4',
        './defaultValue',
        './defined',
        './DeveloperError',
        './freezeObject',
        './Math',
        './Matrix3',
        './RuntimeError'
    ], function(
        Cartesian3,
        Cartesian4,
        defaultValue,
        defined,
        DeveloperError,
        freezeObject,
        CesiumMath,
        Matrix3,
        RuntimeError) {
    "use strict";

    /**
     * A 4x4 matrix, indexable as a column-major order array.
     * Constructor parameters are in row-major order for code readability.
     * @alias Matrix4
     * @constructor
     *
     * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
     * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
     * @param {Number} [column2Row0=0.0] The value for column 2, row 0.
     * @param {Number} [column3Row0=0.0] The value for column 3, row 0.
     * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
     * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
     * @param {Number} [column2Row1=0.0] The value for column 2, row 1.
     * @param {Number} [column3Row1=0.0] The value for column 3, row 1.
     * @param {Number} [column0Row2=0.0] The value for column 0, row 2.
     * @param {Number} [column1Row2=0.0] The value for column 1, row 2.
     * @param {Number} [column2Row2=0.0] The value for column 2, row 2.
     * @param {Number} [column3Row2=0.0] The value for column 3, row 2.
     * @param {Number} [column0Row3=0.0] The value for column 0, row 3.
     * @param {Number} [column1Row3=0.0] The value for column 1, row 3.
     * @param {Number} [column2Row3=0.0] The value for column 2, row 3.
     * @param {Number} [column3Row3=0.0] The value for column 3, row 3.
     *
     * @see Matrix4.fromColumnMajorArray
     * @see Matrix4.fromRowMajorArray
     * @see Matrix4.fromRotationTranslation
     * @see Matrix4.fromTranslationQuaternionRotationScale
     * @see Matrix4.fromTranslation
     * @see Matrix4.fromScale
     * @see Matrix4.fromUniformScale
     * @see Matrix4.fromCamera
     * @see Matrix4.computePerspectiveFieldOfView
     * @see Matrix4.computeOrthographicOffCenter
     * @see Matrix4.computePerspectiveOffCenter
     * @see Matrix4.computeInfinitePerspectiveOffCenter
     * @see Matrix4.computeViewportTransformation
     * @see Matrix2
     * @see Matrix3
     * @see Packable
     */
    var Matrix4 = function(column0Row0, column1Row0, column2Row0, column3Row0,
                           column0Row1, column1Row1, column2Row1, column3Row1,
                           column0Row2, column1Row2, column2Row2, column3Row2,
                           column0Row3, column1Row3, column2Row3, column3Row3) {
        this[0] = defaultValue(column0Row0, 0.0);
        this[1] = defaultValue(column0Row1, 0.0);
        this[2] = defaultValue(column0Row2, 0.0);
        this[3] = defaultValue(column0Row3, 0.0);
        this[4] = defaultValue(column1Row0, 0.0);
        this[5] = defaultValue(column1Row1, 0.0);
        this[6] = defaultValue(column1Row2, 0.0);
        this[7] = defaultValue(column1Row3, 0.0);
        this[8] = defaultValue(column2Row0, 0.0);
        this[9] = defaultValue(column2Row1, 0.0);
        this[10] = defaultValue(column2Row2, 0.0);
        this[11] = defaultValue(column2Row3, 0.0);
        this[12] = defaultValue(column3Row0, 0.0);
        this[13] = defaultValue(column3Row1, 0.0);
        this[14] = defaultValue(column3Row2, 0.0);
        this[15] = defaultValue(column3Row3, 0.0);
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Matrix4.packedLength = 16;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Matrix4} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Matrix4.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }

        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value[0];
        array[startingIndex++] = value[1];
        array[startingIndex++] = value[2];
        array[startingIndex++] = value[3];
        array[startingIndex++] = value[4];
        array[startingIndex++] = value[5];
        array[startingIndex++] = value[6];
        array[startingIndex++] = value[7];
        array[startingIndex++] = value[8];
        array[startingIndex++] = value[9];
        array[startingIndex++] = value[10];
        array[startingIndex++] = value[11];
        array[startingIndex++] = value[12];
        array[startingIndex++] = value[13];
        array[startingIndex++] = value[14];
        array[startingIndex] = value[15];
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Matrix4} [result] The object into which to store the result.
     */
    Matrix4.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Matrix4();
        }

        result[0] = array[startingIndex++];
        result[1] = array[startingIndex++];
        result[2] = array[startingIndex++];
        result[3] = array[startingIndex++];
        result[4] = array[startingIndex++];
        result[5] = array[startingIndex++];
        result[6] = array[startingIndex++];
        result[7] = array[startingIndex++];
        result[8] = array[startingIndex++];
        result[9] = array[startingIndex++];
        result[10] = array[startingIndex++];
        result[11] = array[startingIndex++];
        result[12] = array[startingIndex++];
        result[13] = array[startingIndex++];
        result[14] = array[startingIndex++];
        result[15] = array[startingIndex];
        return result;
    };

    /**
     * Duplicates a Matrix4 instance.
     *
     * @param {Matrix4} matrix The matrix to duplicate.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided. (Returns undefined if matrix is undefined)
     */
    Matrix4.clone = function(matrix, result) {
        if (!defined(matrix)) {
            return undefined;
        }
        if (!defined(result)) {
            return new Matrix4(matrix[0], matrix[4], matrix[8], matrix[12],
                               matrix[1], matrix[5], matrix[9], matrix[13],
                               matrix[2], matrix[6], matrix[10], matrix[14],
                               matrix[3], matrix[7], matrix[11], matrix[15]);
        }
        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[3];
        result[4] = matrix[4];
        result[5] = matrix[5];
        result[6] = matrix[6];
        result[7] = matrix[7];
        result[8] = matrix[8];
        result[9] = matrix[9];
        result[10] = matrix[10];
        result[11] = matrix[11];
        result[12] = matrix[12];
        result[13] = matrix[13];
        result[14] = matrix[14];
        result[15] = matrix[15];
        return result;
    };

    /**
     * Creates a Matrix4 from 16 consecutive elements in an array.
     * @function
     *
     * @param {Number[]} array The array whose 16 consecutive elements correspond to the positions of the matrix.  Assumes column-major order.
     * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to first column first row position in the matrix.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @example
     * // Create the Matrix4:
     * // [1.0, 2.0, 3.0, 4.0]
     * // [1.0, 2.0, 3.0, 4.0]
     * // [1.0, 2.0, 3.0, 4.0]
     * // [1.0, 2.0, 3.0, 4.0]
     *
     * var v = [1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0];
     * var m = Cesium.Matrix4.fromArray(v);
     *
     * // Create same Matrix4 with using an offset into an array
     * var v2 = [0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0];
     * var m2 = Cesium.Matrix4.fromArray(v2, 2);
     */
    Matrix4.fromArray = Matrix4.unpack;

    /**
     * Computes a Matrix4 instance from a column-major order array.
     *
     * @param {Number[]} values The column-major order array.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     */
    Matrix4.fromColumnMajorArray = function(values, result) {
                if (!defined(values)) {
            throw new DeveloperError('values is required');
        }
        
        return Matrix4.clone(values, result);
    };

    /**
     * Computes a Matrix4 instance from a row-major order array.
     * The resulting matrix will be in column-major order.
     *
     * @param {Number[]} values The row-major order array.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     */
    Matrix4.fromRowMajorArray = function(values, result) {
                if (!defined(values)) {
            throw new DeveloperError('values is required.');
        }
        
        if (!defined(result)) {
            return new Matrix4(values[0], values[1], values[2], values[3],
                               values[4], values[5], values[6], values[7],
                               values[8], values[9], values[10], values[11],
                               values[12], values[13], values[14], values[15]);
        }
        result[0] = values[0];
        result[1] = values[4];
        result[2] = values[8];
        result[3] = values[12];
        result[4] = values[1];
        result[5] = values[5];
        result[6] = values[9];
        result[7] = values[13];
        result[8] = values[2];
        result[9] = values[6];
        result[10] = values[10];
        result[11] = values[14];
        result[12] = values[3];
        result[13] = values[7];
        result[14] = values[11];
        result[15] = values[15];
        return result;
    };

    /**
     * Computes a Matrix4 instance from a Matrix3 representing the rotation
     * and a Cartesian3 representing the translation.
     *
     * @param {Matrix3} rotation The upper left portion of the matrix representing the rotation.
     * @param {Cartesian3} [translation=Cartesian3.ZERO] The upper right portion of the matrix representing the translation.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     */
    Matrix4.fromRotationTranslation = function(rotation, translation, result) {
                if (!defined(rotation)) {
            throw new DeveloperError('rotation is required.');
        }
        
        translation = defaultValue(translation, Cartesian3.ZERO);

        if (!defined(result)) {
            return new Matrix4(rotation[0], rotation[3], rotation[6], translation.x,
                               rotation[1], rotation[4], rotation[7], translation.y,
                               rotation[2], rotation[5], rotation[8], translation.z,
                                       0.0,         0.0,         0.0,           1.0);
        }

        result[0] = rotation[0];
        result[1] = rotation[1];
        result[2] = rotation[2];
        result[3] = 0.0;
        result[4] = rotation[3];
        result[5] = rotation[4];
        result[6] = rotation[5];
        result[7] = 0.0;
        result[8] = rotation[6];
        result[9] = rotation[7];
        result[10] = rotation[8];
        result[11] = 0.0;
        result[12] = translation.x;
        result[13] = translation.y;
        result[14] = translation.z;
        result[15] = 1.0;
        return result;
    };

    /**
     * Computes a Matrix4 instance from a translation, rotation, and scale (TRS)
     * representation with the rotation represented as a quaternion.
     *
     * @param {Cartesian3} translation The translation transformation.
     * @param {Quaternion} rotation The rotation transformation.
     * @param {Cartesian3} scale The non-uniform scale transformation.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @example
     * var result = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
     *   new Cesium.Cartesian3(1.0, 2.0, 3.0), // translation
     *   Cesium.Quaternion.IDENTITY,           // rotation
     *   new Cesium.Cartesian3(7.0, 8.0, 9.0), // scale
     *   result);
     */
    Matrix4.fromTranslationQuaternionRotationScale = function(translation, rotation, scale, result) {
                if (!defined(translation)) {
            throw new DeveloperError('translation is required.');
        }
        if (!defined(rotation)) {
            throw new DeveloperError('rotation is required.');
        }
        if (!defined(scale)) {
            throw new DeveloperError('scale is required.');
        }
        
        if (!defined(result)) {
            result = new Matrix4();
        }

        var scaleX = scale.x;
        var scaleY = scale.y;
        var scaleZ = scale.z;

        var x2 = rotation.x * rotation.x;
        var xy = rotation.x * rotation.y;
        var xz = rotation.x * rotation.z;
        var xw = rotation.x * rotation.w;
        var y2 = rotation.y * rotation.y;
        var yz = rotation.y * rotation.z;
        var yw = rotation.y * rotation.w;
        var z2 = rotation.z * rotation.z;
        var zw = rotation.z * rotation.w;
        var w2 = rotation.w * rotation.w;

        var m00 = x2 - y2 - z2 + w2;
        var m01 = 2.0 * (xy - zw);
        var m02 = 2.0 * (xz + yw);

        var m10 = 2.0 * (xy + zw);
        var m11 = -x2 + y2 - z2 + w2;
        var m12 = 2.0 * (yz - xw);

        var m20 = 2.0 * (xz - yw);
        var m21 = 2.0 * (yz + xw);
        var m22 = -x2 - y2 + z2 + w2;

        result[0]  = m00 * scaleX;
        result[1]  = m10 * scaleX;
        result[2]  = m20 * scaleX;
        result[3]  = 0.0;
        result[4]  = m01 * scaleY;
        result[5]  = m11 * scaleY;
        result[6]  = m21 * scaleY;
        result[7]  = 0.0;
        result[8]  = m02 * scaleZ;
        result[9]  = m12 * scaleZ;
        result[10] = m22 * scaleZ;
        result[11] = 0.0;
        result[12] = translation.x;
        result[13] = translation.y;
        result[14] = translation.z;
        result[15] = 1.0;

        return result;
    };

    /**
     * Creates a Matrix4 instance from a Cartesian3 representing the translation.
     *
     * @param {Cartesian3} translation The upper right portion of the matrix representing the translation.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @see Matrix4.multiplyByTranslation
     */
    Matrix4.fromTranslation = function(translation, result) {
                if (!defined(translation)) {
            throw new DeveloperError('translation is required.');
        }
        
        return Matrix4.fromRotationTranslation(Matrix3.IDENTITY, translation, result);
    };

    /**
     * Computes a Matrix4 instance representing a non-uniform scale.
     *
     * @param {Cartesian3} scale The x, y, and z scale factors.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @example
     * // Creates
     * //   [7.0, 0.0, 0.0, 0.0]
     * //   [0.0, 8.0, 0.0, 0.0]
     * //   [0.0, 0.0, 9.0, 0.0]
     * //   [0.0, 0.0, 0.0, 1.0]
     * var m = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
     */
    Matrix4.fromScale = function(scale, result) {
                if (!defined(scale)) {
            throw new DeveloperError('scale is required.');
        }
        
        if (!defined(result)) {
            return new Matrix4(
                scale.x, 0.0,     0.0,     0.0,
                0.0,     scale.y, 0.0,     0.0,
                0.0,     0.0,     scale.z, 0.0,
                0.0,     0.0,     0.0,     1.0);
        }

        result[0] = scale.x;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = scale.y;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = scale.z;
        result[11] = 0.0;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = 0.0;
        result[15] = 1.0;
        return result;
    };

    /**
     * Computes a Matrix4 instance representing a uniform scale.
     *
     * @param {Number} scale The uniform scale factor.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @example
     * // Creates
     * //   [2.0, 0.0, 0.0, 0.0]
     * //   [0.0, 2.0, 0.0, 0.0]
     * //   [0.0, 0.0, 2.0, 0.0]
     * //   [0.0, 0.0, 0.0, 1.0]
     * var m = Cesium.Matrix4.fromUniformScale(2.0);
     */
    Matrix4.fromUniformScale = function(scale, result) {
                if (typeof scale !== 'number') {
            throw new DeveloperError('scale is required.');
        }
        
        if (!defined(result)) {
            return new Matrix4(scale, 0.0,   0.0,   0.0,
                               0.0,   scale, 0.0,   0.0,
                               0.0,   0.0,   scale, 0.0,
                               0.0,   0.0,   0.0,   1.0);
        }

        result[0] = scale;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = scale;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = scale;
        result[11] = 0.0;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = 0.0;
        result[15] = 1.0;
        return result;
    };

    var fromCameraF = new Cartesian3();
    var fromCameraS = new Cartesian3();
    var fromCameraU = new Cartesian3();

    /**
     * Computes a Matrix4 instance from a Camera.
     *
     * @param {Camera} camera The camera to use.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     */
    Matrix4.fromCamera = function(camera, result) {
                if (!defined(camera)) {
            throw new DeveloperError('camera is required.');
        }
        
        var eye = camera.eye;
        var target = camera.target;
        var up = camera.up;

                if (!defined(eye)) {
            throw new DeveloperError('camera.eye is required.');
        }
        if (!defined(target)) {
            throw new DeveloperError('camera.target is required.');
        }
        if (!defined(up)) {
            throw new DeveloperError('camera.up is required.');
        }
        
        Cartesian3.normalize(Cartesian3.subtract(target, eye, fromCameraF), fromCameraF);
        Cartesian3.normalize(Cartesian3.cross(fromCameraF, up, fromCameraS), fromCameraS);
        Cartesian3.normalize(Cartesian3.cross(fromCameraS, fromCameraF, fromCameraU), fromCameraU);

        var sX = fromCameraS.x;
        var sY = fromCameraS.y;
        var sZ = fromCameraS.z;
        var fX = fromCameraF.x;
        var fY = fromCameraF.y;
        var fZ = fromCameraF.z;
        var uX = fromCameraU.x;
        var uY = fromCameraU.y;
        var uZ = fromCameraU.z;
        var eyeX = eye.x;
        var eyeY = eye.y;
        var eyeZ = eye.z;
        var t0 = sX * -eyeX + sY * -eyeY+ sZ * -eyeZ;
        var t1 = uX * -eyeX + uY * -eyeY+ uZ * -eyeZ;
        var t2 = fX * eyeX + fY * eyeY + fZ * eyeZ;

        //The code below this comment is an optimized
        //version of the commented lines.
        //Rather that create two matrices and then multiply,
        //we just bake in the multiplcation as part of creation.
        //var rotation = new Matrix4(
        //                sX,  sY,  sZ, 0.0,
        //                uX,  uY,  uZ, 0.0,
        //               -fX, -fY, -fZ, 0.0,
        //                0.0,  0.0,  0.0, 1.0);
        //var translation = new Matrix4(
        //                1.0, 0.0, 0.0, -eye.x,
        //                0.0, 1.0, 0.0, -eye.y,
        //                0.0, 0.0, 1.0, -eye.z,
        //                0.0, 0.0, 0.0, 1.0);
        //return rotation.multiply(translation);
        if (!defined(result)) {
            return new Matrix4(
                    sX,   sY,  sZ, t0,
                    uX,   uY,  uZ, t1,
                   -fX,  -fY, -fZ, t2,
                    0.0, 0.0, 0.0, 1.0);
        }
        result[0] = sX;
        result[1] = uX;
        result[2] = -fX;
        result[3] = 0.0;
        result[4] = sY;
        result[5] = uY;
        result[6] = -fY;
        result[7] = 0.0;
        result[8] = sZ;
        result[9] = uZ;
        result[10] = -fZ;
        result[11] = 0.0;
        result[12] = t0;
        result[13] = t1;
        result[14] = t2;
        result[15] = 1.0;
        return result;

    };

     /**
      * Computes a Matrix4 instance representing a perspective transformation matrix.
      *
      * @param {Number} fovY The field of view along the Y axis in radians.
      * @param {Number} aspectRatio The aspect ratio.
      * @param {Number} near The distance to the near plane in meters.
      * @param {Number} far The distance to the far plane in meters.
      * @param {Matrix4} result The object in which the result will be stored.
      * @returns The modified result parameter.
      *
      * @exception {DeveloperError} fovY must be in [0, PI).
      * @exception {DeveloperError} aspectRatio must be greater than zero.
      * @exception {DeveloperError} near must be greater than zero.
      * @exception {DeveloperError} far must be greater than zero.
      */
    Matrix4.computePerspectiveFieldOfView = function(fovY, aspectRatio, near, far, result) {
                if (fovY <= 0.0 || fovY > Math.PI) {
            throw new DeveloperError('fovY must be in [0, PI).');
        }
        if (aspectRatio <= 0.0) {
            throw new DeveloperError('aspectRatio must be greater than zero.');
        }
        if (near <= 0.0) {
            throw new DeveloperError('near must be greater than zero.');
        }
        if (far <= 0.0) {
            throw new DeveloperError('far must be greater than zero.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var bottom = Math.tan(fovY * 0.5);

        var column1Row1 = 1.0 / bottom;
        var column0Row0 = column1Row1 / aspectRatio;
        var column2Row2 = (far + near) / (near - far);
        var column3Row2 = (2.0 * far * near) / (near - far);

        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = column2Row2;
        result[11] = -1.0;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = column3Row2;
        result[15] = 0.0;
        return result;
    };

    /**
    * Computes a Matrix4 instance representing an orthographic transformation matrix.
    *
    * @param {Number} left The number of meters to the left of the camera that will be in view.
    * @param {Number} right The number of meters to the right of the camera that will be in view.
    * @param {Number} bottom The number of meters below of the camera that will be in view.
    * @param {Number} top The number of meters above of the camera that will be in view.
    * @param {Number} near The distance to the near plane in meters.
    * @param {Number} far The distance to the far plane in meters.
    * @param {Matrix4} result The object in which the result will be stored.
    * @returns The modified result parameter.
    */
    Matrix4.computeOrthographicOffCenter = function(left, right, bottom, top, near, far, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required.');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required.');
        }
        if (!defined(bottom)) {
            throw new DeveloperError('bottom is required.');
        }
        if (!defined(top)) {
            throw new DeveloperError('top is required.');
        }
        if (!defined(near)) {
            throw new DeveloperError('near is required.');
        }
        if (!defined(far)) {
            throw new DeveloperError('far is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var a = 1.0 / (right - left);
        var b = 1.0 / (top - bottom);
        var c = 1.0 / (far - near);

        var tx = -(right + left) * a;
        var ty = -(top + bottom) * b;
        var tz = -(far + near) * c;
        a *= 2.0;
        b *= 2.0;
        c *= -2.0;

        result[0] = a;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = b;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = c;
        result[11] = 0.0;
        result[12] = tx;
        result[13] = ty;
        result[14] = tz;
        result[15] = 1.0;
        return result;
    };

    /**
     * Computes a Matrix4 instance representing an off center perspective transformation.
     *
     * @param {Number} left The number of meters to the left of the camera that will be in view.
     * @param {Number} right The number of meters to the right of the camera that will be in view.
     * @param {Number} bottom The number of meters below of the camera that will be in view.
     * @param {Number} top The number of meters above of the camera that will be in view.
     * @param {Number} near The distance to the near plane in meters.
     * @param {Number} far The distance to the far plane in meters.
     * @param {Matrix4} result The object in which the result will be stored.
     * @returns The modified result parameter.
     */
    Matrix4.computePerspectiveOffCenter = function(left, right, bottom, top, near, far, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required.');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required.');
        }
        if (!defined(bottom)) {
            throw new DeveloperError('bottom is required.');
        }
        if (!defined(top)) {
            throw new DeveloperError('top is required.');
        }
        if (!defined(near)) {
            throw new DeveloperError('near is required.');
        }
        if (!defined(far)) {
            throw new DeveloperError('far is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var column0Row0 = 2.0 * near / (right - left);
        var column1Row1 = 2.0 * near / (top - bottom);
        var column2Row0 = (right + left) / (right - left);
        var column2Row1 = (top + bottom) / (top - bottom);
        var column2Row2 = -(far + near) / (far - near);
        var column2Row3 = -1.0;
        var column3Row2 = -2.0 * far * near / (far - near);

        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = column2Row3;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = column3Row2;
        result[15] = 0.0;
        return result;
    };

    /**
     * Computes a Matrix4 instance representing an infinite off center perspective transformation.
     *
     * @param {Number} left The number of meters to the left of the camera that will be in view.
     * @param {Number} right The number of meters to the right of the camera that will be in view.
     * @param {Number} bottom The number of meters below of the camera that will be in view.
     * @param {Number} top The number of meters above of the camera that will be in view.
     * @param {Number} near The distance to the near plane in meters.
     * @param {Number} far The distance to the far plane in meters.
     * @param {Matrix4} result The object in which the result will be stored.
     * @returns The modified result parameter.
     */
    Matrix4.computeInfinitePerspectiveOffCenter = function(left, right, bottom, top, near, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required.');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required.');
        }
        if (!defined(bottom)) {
            throw new DeveloperError('bottom is required.');
        }
        if (!defined(top)) {
            throw new DeveloperError('top is required.');
        }
        if (!defined(near)) {
            throw new DeveloperError('near is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var column0Row0 = 2.0 * near / (right - left);
        var column1Row1 = 2.0 * near / (top - bottom);
        var column2Row0 = (right + left) / (right - left);
        var column2Row1 = (top + bottom) / (top - bottom);
        var column2Row2 = -1.0;
        var column2Row3 = -1.0;
        var column3Row2 = -2.0 * near;

        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = column2Row3;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = column3Row2;
        result[15] = 0.0;
        return result;
    };

    /**
     * Computes a Matrix4 instance that transforms from normalized device coordinates to window coordinates.
     *
     * @param {Object}[viewport = { x : 0.0, y : 0.0, width : 0.0, height : 0.0 }] The viewport's corners as shown in Example 1.
     * @param {Number}[nearDepthRange=0.0] The near plane distance in window coordinates.
     * @param {Number}[farDepthRange=1.0] The far plane distance in window coordinates.
     * @param {Matrix4} result The object in which the result will be stored.
     * @returns The modified result parameter.
     *
     * @example
     * // Create viewport transformation using an explicit viewport and depth range.
     * var m = Cesium.Matrix4.computeViewportTransformation({
     *     x : 0.0,
     *     y : 0.0,
     *     width : 1024.0,
     *     height : 768.0
     * }, 0.0, 1.0, new Cesium.Matrix4());
     */
    Matrix4.computeViewportTransformation = function(viewport, nearDepthRange, farDepthRange, result) {
                if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        viewport = defaultValue(viewport, defaultValue.EMPTY_OBJECT);
        var x = defaultValue(viewport.x, 0.0);
        var y = defaultValue(viewport.y, 0.0);
        var width = defaultValue(viewport.width, 0.0);
        var height = defaultValue(viewport.height, 0.0);
        nearDepthRange = defaultValue(nearDepthRange, 0.0);
        farDepthRange = defaultValue(farDepthRange, 1.0);

        var halfWidth = width * 0.5;
        var halfHeight = height * 0.5;
        var halfDepth = (farDepthRange - nearDepthRange) * 0.5;

        var column0Row0 = halfWidth;
        var column1Row1 = halfHeight;
        var column2Row2 = halfDepth;
        var column3Row0 = x + halfWidth;
        var column3Row1 = y + halfHeight;
        var column3Row2 = nearDepthRange + halfDepth;
        var column3Row3 = 1.0;

        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = column2Row2;
        result[11] = 0.0;
        result[12] = column3Row0;
        result[13] = column3Row1;
        result[14] = column3Row2;
        result[15] = column3Row3;
        return result;
    };

    /**
     * Computes an Array from the provided Matrix4 instance.
     * The array will be in column-major order.
     *
     * @param {Matrix4} matrix The matrix to use..
     * @param {Number[]} [result] The Array onto which to store the result.
     * @returns {Number[]} The modified Array parameter or a new Array instance if one was not provided.
     *
     * @example
     * //create an array from an instance of Matrix4
     * // m = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     * var a = Cesium.Matrix4.toArray(m);
     *
     * // m remains the same
     * //creates a = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0]
     */
    Matrix4.toArray = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        
        if (!defined(result)) {
            return [matrix[0], matrix[1], matrix[2], matrix[3],
                    matrix[4], matrix[5], matrix[6], matrix[7],
                    matrix[8], matrix[9], matrix[10], matrix[11],
                    matrix[12], matrix[13], matrix[14], matrix[15]];
        }
        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[3];
        result[4] = matrix[4];
        result[5] = matrix[5];
        result[6] = matrix[6];
        result[7] = matrix[7];
        result[8] = matrix[8];
        result[9] = matrix[9];
        result[10] = matrix[10];
        result[11] = matrix[11];
        result[12] = matrix[12];
        result[13] = matrix[13];
        result[14] = matrix[14];
        result[15] = matrix[15];
        return result;
    };

    /**
     * Computes the array index of the element at the provided row and column.
     *
     * @param {Number} row The zero-based index of the row.
     * @param {Number} column The zero-based index of the column.
     * @returns {Number} The index of the element at the provided row and column.
     *
     * @exception {DeveloperError} row must be 0, 1, 2, or 3.
     * @exception {DeveloperError} column must be 0, 1, 2, or 3.
     *
     * @example
     * var myMatrix = new Cesium.Matrix4();
     * var column1Row0Index = Cesium.Matrix4.getElementIndex(1, 0);
     * var column1Row0 = myMatrix[column1Row0Index];
     * myMatrix[column1Row0Index] = 10.0;
     */
    Matrix4.getElementIndex = function(column, row) {
                if (typeof row !== 'number' || row < 0 || row > 3) {
            throw new DeveloperError('row must be 0, 1, 2, or 3.');
        }
        if (typeof column !== 'number' || column < 0 || column > 3) {
            throw new DeveloperError('column must be 0, 1, 2, or 3.');
        }
        
        return column * 4 + row;
    };

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, 2, or 3.
     *
     * @example
     * //returns a Cartesian4 instance with values from the specified column
     * // m = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [18.0, 19.0, 20.0, 21.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     *
     * //Example 1: Creates an instance of Cartesian
     * var a = Cesium.Matrix4.getColumn(m, 2, new Cesium.Cartesian4());
     *
     * @example
     * //Example 2: Sets values for Cartesian instance
     * var a = new Cesium.Cartesian4();
     * Cesium.Matrix4.getColumn(m, 2, a);
     *
     * // a.x = 12.0; a.y = 16.0; a.z = 20.0; a.w = 24.0;
     */
    Matrix4.getColumn = function(matrix, index, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required.');
        }

        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index must be 0, 1, 2, or 3.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var startIndex = index * 4;
        var x = matrix[startIndex];
        var y = matrix[startIndex + 1];
        var z = matrix[startIndex + 2];
        var w = matrix[startIndex + 3];

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian4 instance.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified column.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, 2, or 3.
     *
     * @example
     * //creates a new Matrix4 instance with new column values from the Cartesian4 instance
     * // m = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [18.0, 19.0, 20.0, 21.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     *
     * var a = Cesium.Matrix4.setColumn(m, 2, new Cesium.Cartesian4(99.0, 98.0, 97.0, 96.0), new Cesium.Matrix4());
     *
     * // m remains the same
     * // a = [10.0, 11.0, 99.0, 13.0]
     * //     [14.0, 15.0, 98.0, 17.0]
     * //     [18.0, 19.0, 97.0, 21.0]
     * //     [22.0, 23.0, 96.0, 25.0]
     */
    Matrix4.setColumn = function(matrix, index, cartesian, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index must be 0, 1, 2, or 3.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result = Matrix4.clone(matrix, result);
        var startIndex = index * 4;
        result[startIndex] = cartesian.x;
        result[startIndex + 1] = cartesian.y;
        result[startIndex + 2] = cartesian.z;
        result[startIndex + 3] = cartesian.w;
        return result;
    };

    /**
     * Retrieves a copy of the matrix row at the provided index as a Cartesian4 instance.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to retrieve.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, 2, or 3.
     *
     * @example
     * //returns a Cartesian4 instance with values from the specified column
     * // m = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [18.0, 19.0, 20.0, 21.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     *
     * //Example 1: Returns an instance of Cartesian
     * var a = Cesium.Matrix4.getRow(m, 2, new Cesium.Cartesian4());
     *
     * @example
     * //Example 2: Sets values for a Cartesian instance
     * var a = new Cesium.Cartesian4();
     * Cesium.Matrix4.getRow(m, 2, a);
     *
     * // a.x = 18.0; a.y = 19.0; a.z = 20.0; a.w = 21.0;
     */
    Matrix4.getRow = function(matrix, index, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required.');
        }

        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index must be 0, 1, 2, or 3.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var x = matrix[index];
        var y = matrix[index + 4];
        var z = matrix[index + 8];
        var w = matrix[index + 12];

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian4 instance.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified row.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, 2, or 3.
     *
     * @example
     * //create a new Matrix4 instance with new row values from the Cartesian4 instance
     * // m = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [18.0, 19.0, 20.0, 21.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     *
     * var a = Cesium.Matrix4.setRow(m, 2, new Cesium.Cartesian4(99.0, 98.0, 97.0, 96.0), new Cesium.Matrix4());
     *
     * // m remains the same
     * // a = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [99.0, 98.0, 97.0, 96.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     */
    Matrix4.setRow = function(matrix, index, cartesian, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index must be 0, 1, 2, or 3.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result = Matrix4.clone(matrix, result);
        result[index] = cartesian.x;
        result[index + 4] = cartesian.y;
        result[index + 8] = cartesian.z;
        result[index + 12] = cartesian.w;
        return result;
    };

    var scratchColumn = new Cartesian3();

    /**
     * Extracts the non-uniform scale assuming the matrix is an affine transformation.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter
     */
    Matrix4.getScale = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result.x = Cartesian3.magnitude(Cartesian3.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn));
        result.y = Cartesian3.magnitude(Cartesian3.fromElements(matrix[4], matrix[5], matrix[6], scratchColumn));
        result.z = Cartesian3.magnitude(Cartesian3.fromElements(matrix[8], matrix[9], matrix[10], scratchColumn));
        return result;
    };

    var scratchScale = new Cartesian3();

    /**
     * Computes the maximum scale assuming the matrix is an affine transformation.
     * The maximum scale is the maximum length of the column vectors in the upper-left
     * 3x3 matrix.
     *
     * @param {Matrix4} matrix The matrix.
     * @returns {Number} The maximum scale.
     */
    Matrix4.getMaximumScale = function(matrix) {
        Matrix4.getScale(matrix, scratchScale);
        return Cartesian3.maximumComponent(scratchScale);
    };

    /**
     * Computes the product of two matrices.
     *
     * @param {Matrix4} left The first matrix.
     * @param {Matrix4} right The second matrix.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    Matrix4.multiply = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var left0 = left[0];
        var left1 = left[1];
        var left2 = left[2];
        var left3 = left[3];
        var left4 = left[4];
        var left5 = left[5];
        var left6 = left[6];
        var left7 = left[7];
        var left8 = left[8];
        var left9 = left[9];
        var left10 = left[10];
        var left11 = left[11];
        var left12 = left[12];
        var left13 = left[13];
        var left14 = left[14];
        var left15 = left[15];

        var right0 = right[0];
        var right1 = right[1];
        var right2 = right[2];
        var right3 = right[3];
        var right4 = right[4];
        var right5 = right[5];
        var right6 = right[6];
        var right7 = right[7];
        var right8 = right[8];
        var right9 = right[9];
        var right10 = right[10];
        var right11 = right[11];
        var right12 = right[12];
        var right13 = right[13];
        var right14 = right[14];
        var right15 = right[15];

        var column0Row0 = left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3;
        var column0Row1 = left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3;
        var column0Row2 = left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3;
        var column0Row3 = left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3;

        var column1Row0 = left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7;
        var column1Row1 = left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7;
        var column1Row2 = left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7;
        var column1Row3 = left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7;

        var column2Row0 = left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11;
        var column2Row1 = left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11;
        var column2Row2 = left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11;
        var column2Row3 = left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11;

        var column3Row0 = left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15;
        var column3Row1 = left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15;
        var column3Row2 = left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15;
        var column3Row3 = left3 * right12 + left7 * right13 + left11 * right14 + left15 * right15;

        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = column0Row3;
        result[4] = column1Row0;
        result[5] = column1Row1;
        result[6] = column1Row2;
        result[7] = column1Row3;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = column2Row3;
        result[12] = column3Row0;
        result[13] = column3Row1;
        result[14] = column3Row2;
        result[15] = column3Row3;
        return result;
    };

    /**
     * Computes the sum of two matrices.
     *
     * @param {Matrix4} left The first matrix.
     * @param {Matrix4} right The second matrix.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    Matrix4.add = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = left[0] + right[0];
        result[1] = left[1] + right[1];
        result[2] = left[2] + right[2];
        result[3] = left[3] + right[3];
        result[4] = left[4] + right[4];
        result[5] = left[5] + right[5];
        result[6] = left[6] + right[6];
        result[7] = left[7] + right[7];
        result[8] = left[8] + right[8];
        result[9] = left[9] + right[9];
        result[10] = left[10] + right[10];
        result[11] = left[11] + right[11];
        result[12] = left[12] + right[12];
        result[13] = left[13] + right[13];
        result[14] = left[14] + right[14];
        result[15] = left[15] + right[15];
        return result;
    };

    /**
     * Computes the difference of two matrices.
     *
     * @param {Matrix4} left The first matrix.
     * @param {Matrix4} right The second matrix.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    Matrix4.subtract = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = left[0] - right[0];
        result[1] = left[1] - right[1];
        result[2] = left[2] - right[2];
        result[3] = left[3] - right[3];
        result[4] = left[4] - right[4];
        result[5] = left[5] - right[5];
        result[6] = left[6] - right[6];
        result[7] = left[7] - right[7];
        result[8] = left[8] - right[8];
        result[9] = left[9] - right[9];
        result[10] = left[10] - right[10];
        result[11] = left[11] - right[11];
        result[12] = left[12] - right[12];
        result[13] = left[13] - right[13];
        result[14] = left[14] - right[14];
        result[15] = left[15] - right[15];
        return result;
    };

    /**
     * Computes the product of two matrices assuming the matrices are
     * affine transformation matrices, where the upper left 3x3 elements
     * are a rotation matrix, and the upper three elements in the fourth
     * column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
     * The matrix is not verified to be in the proper form.
     * This method is faster than computing the product for general 4x4
     * matrices using {@link Matrix4.multiply}.
     *
     * @param {Matrix4} left The first matrix.
     * @param {Matrix4} right The second matrix.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * var m1 = new Cesium.Matrix4(1.0, 6.0, 7.0, 0.0, 2.0, 5.0, 8.0, 0.0, 3.0, 4.0, 9.0, 0.0, 0.0, 0.0, 0.0, 1.0);
     * var m2 = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(1.0, 1.0, 1.0));
     * var m3 = Cesium.Matrix4.multiplyTransformation(m1, m2, new Cesium.Matrix4());
     */
    Matrix4.multiplyTransformation = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var left0 = left[0];
        var left1 = left[1];
        var left2 = left[2];
        var left4 = left[4];
        var left5 = left[5];
        var left6 = left[6];
        var left8 = left[8];
        var left9 = left[9];
        var left10 = left[10];
        var left12 = left[12];
        var left13 = left[13];
        var left14 = left[14];

        var right0 = right[0];
        var right1 = right[1];
        var right2 = right[2];
        var right4 = right[4];
        var right5 = right[5];
        var right6 = right[6];
        var right8 = right[8];
        var right9 = right[9];
        var right10 = right[10];
        var right12 = right[12];
        var right13 = right[13];
        var right14 = right[14];

        var column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
        var column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
        var column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

        var column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
        var column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
        var column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

        var column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
        var column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
        var column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

        var column3Row0 = left0 * right12 + left4 * right13 + left8 * right14 + left12;
        var column3Row1 = left1 * right12 + left5 * right13 + left9 * right14 + left13;
        var column3Row2 = left2 * right12 + left6 * right13 + left10 * right14 + left14;

        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = 0.0;
        result[4] = column1Row0;
        result[5] = column1Row1;
        result[6] = column1Row2;
        result[7] = 0.0;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = 0.0;
        result[12] = column3Row0;
        result[13] = column3Row1;
        result[14] = column3Row2;
        result[15] = 1.0;
        return result;
    };

    /**
     * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
     * by a 3x3 rotation matrix.  This is an optimization
     * for <code>Matrix4.multiply(m, Matrix4.fromRotationTranslation(rotation), m);</code> with less allocations and arithmetic operations.
     *
     * @param {Matrix4} matrix The matrix on the left-hand side.
     * @param {Matrix3} rotation The 3x3 rotation matrix on the right-hand side.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromRotationTranslation(rotation), m);
     * Cesium.Matrix4.multiplyByMatrix3(m, rotation, m);
     */
    Matrix4.multiplyByMatrix3 = function(matrix, rotation, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(rotation)) {
            throw new DeveloperError('rotation is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var left0 = matrix[0];
        var left1 = matrix[1];
        var left2 = matrix[2];
        var left4 = matrix[4];
        var left5 = matrix[5];
        var left6 = matrix[6];
        var left8 = matrix[8];
        var left9 = matrix[9];
        var left10 = matrix[10];

        var right0 = rotation[0];
        var right1 = rotation[1];
        var right2 = rotation[2];
        var right4 = rotation[3];
        var right5 = rotation[4];
        var right6 = rotation[5];
        var right8 = rotation[6];
        var right9 = rotation[7];
        var right10 = rotation[8];

        var column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
        var column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
        var column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

        var column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
        var column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
        var column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

        var column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
        var column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
        var column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = 0.0;
        result[4] = column1Row0;
        result[5] = column1Row1;
        result[6] = column1Row2;
        result[7] = 0.0;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = 0.0;
        result[12] = matrix[12];
        result[13] = matrix[13];
        result[14] = matrix[14];
        result[15] = matrix[15];
        return result;
    };

    /**
     * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
     * by an implicit translation matrix defined by a {@link Cartesian3}.  This is an optimization
     * for <code>Matrix4.multiply(m, Matrix4.fromTranslation(position), m);</code> with less allocations and arithmetic operations.
     *
     * @param {Matrix4} matrix The matrix on the left-hand side.
     * @param {Cartesian3} translation The translation on the right-hand side.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromTranslation(position), m);
     * Cesium.Matrix4.multiplyByTranslation(m, position, m);
     */
    Matrix4.multiplyByTranslation = function(matrix, translation, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(translation)) {
            throw new DeveloperError('translation is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var x = translation.x;
        var y = translation.y;
        var z = translation.z;

        var tx = (x * matrix[0]) + (y * matrix[4]) + (z * matrix[8]) + matrix[12];
        var ty = (x * matrix[1]) + (y * matrix[5]) + (z * matrix[9]) + matrix[13];
        var tz = (x * matrix[2]) + (y * matrix[6]) + (z * matrix[10]) + matrix[14];

        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[3];
        result[4] = matrix[4];
        result[5] = matrix[5];
        result[6] = matrix[6];
        result[7] = matrix[7];
        result[8] = matrix[8];
        result[9] = matrix[9];
        result[10] = matrix[10];
        result[11] = matrix[11];
        result[12] = tx;
        result[13] = ty;
        result[14] = tz;
        result[15] = matrix[15];
        return result;
    };

    var uniformScaleScratch = new Cartesian3();

    /**
     * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
     * by an implicit uniform scale matrix.  This is an optimization
     * for <code>Matrix4.multiply(m, Matrix4.fromUniformScale(scale), m);</code> with less allocations and arithmetic operations.
     *
     * @param {Matrix4} matrix The matrix on the left-hand side.
     * @param {Number} scale The uniform scale on the right-hand side.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @see Matrix4.fromUniformScale
     * @see Matrix4.multiplyByScale
     *
     * @example
     * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromUniformScale(scale), m);
     * Cesium.Matrix4.multiplyByUniformScale(m, scale, m);
     */
    Matrix4.multiplyByUniformScale = function(matrix, scale, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (typeof scale !== 'number') {
            throw new DeveloperError('scale is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        uniformScaleScratch.x = scale;
        uniformScaleScratch.y = scale;
        uniformScaleScratch.z = scale;
        return Matrix4.multiplyByScale(matrix, uniformScaleScratch, result);
    };

    /**
     * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
     * by an implicit non-uniform scale matrix.  This is an optimization
     * for <code>Matrix4.multiply(m, Matrix4.fromScale(scale), m);</code> with less allocations and arithmetic operations.
     *
     * @param {Matrix4} matrix The matrix on the left-hand side.
     * @param {Cartesian3} scale The non-uniform scale on the right-hand side.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @see Matrix4.fromScale
     * @see Matrix4.multiplyByUniformScale
     *
     * @example
     * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromScale(scale), m);
     * Cesium.Matrix4.multiplyByScale(m, scale, m);
     */
    Matrix4.multiplyByScale = function(matrix, scale, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(scale)) {
            throw new DeveloperError('scale is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var scaleX = scale.x;
        var scaleY = scale.y;
        var scaleZ = scale.z;

        // Faster than Cartesian3.equals
        if ((scaleX === 1.0) && (scaleY === 1.0) && (scaleZ === 1.0)) {
            return Matrix4.clone(matrix, result);
        }

        result[0] = scaleX * matrix[0];
        result[1] = scaleX * matrix[1];
        result[2] = scaleX * matrix[2];
        result[3] = 0.0;
        result[4] = scaleY * matrix[4];
        result[5] = scaleY * matrix[5];
        result[6] = scaleY * matrix[6];
        result[7] = 0.0;
        result[8] = scaleZ * matrix[8];
        result[9] = scaleZ * matrix[9];
        result[10] = scaleZ * matrix[10];
        result[11] = 0.0;
        result[12] = matrix[12];
        result[13] = matrix[13];
        result[14] = matrix[14];
        result[15] = 1.0;
        return result;
    };

    /**
     * Computes the product of a matrix and a column vector.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian4} cartesian The vector.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    Matrix4.multiplyByVector = function(matrix, cartesian, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var vX = cartesian.x;
        var vY = cartesian.y;
        var vZ = cartesian.z;
        var vW = cartesian.w;

        var x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12] * vW;
        var y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13] * vW;
        var z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14] * vW;
        var w = matrix[3] * vX + matrix[7] * vY + matrix[11] * vZ + matrix[15] * vW;

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes the product of a matrix and a {@link Cartesian3}.  This is equivalent to calling {@link Matrix4.multiplyByVector}
     * with a {@link Cartesian4} with a <code>w</code> component of zero.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian3} cartesian The point.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     *
     * @example
     * var p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
     * var result = Cesium.Matrix4.multiplyByPointAsVector(matrix, p, new Cesium.Cartesian3());
     * // A shortcut for
     * //   Cartesian3 p = ...
     * //   Cesium.Matrix4.multiplyByVector(matrix, new Cesium.Cartesian4(p.x, p.y, p.z, 0.0), result);
     */
    Matrix4.multiplyByPointAsVector = function(matrix, cartesian, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var vX = cartesian.x;
        var vY = cartesian.y;
        var vZ = cartesian.z;

        var x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ;
        var y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ;
        var z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ;

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Computes the product of a matrix and a {@link Cartesian3}. This is equivalent to calling {@link Matrix4.multiplyByVector}
     * with a {@link Cartesian4} with a <code>w</code> component of 1, but returns a {@link Cartesian3} instead of a {@link Cartesian4}.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian3} cartesian The point.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     *
     * @example
     * var p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
     * var result = Cesium.Matrix4.multiplyByPoint(matrix, p, new Cesium.Cartesian3());
     */
    Matrix4.multiplyByPoint = function(matrix, cartesian, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }

        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var vX = cartesian.x;
        var vY = cartesian.y;
        var vZ = cartesian.z;

        var x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12];
        var y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13];
        var z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14];

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Computes the product of a matrix and a scalar.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Number} scalar The number to multiply by.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * //create a Matrix4 instance which is a scaled version of the supplied Matrix4
     * // m = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [18.0, 19.0, 20.0, 21.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     *
     * var a = Cesium.Matrix4.multiplyByScalar(m, -2, new Cesium.Matrix4());
     *
     * // m remains the same
     * // a = [-20.0, -22.0, -24.0, -26.0]
     * //     [-28.0, -30.0, -32.0, -34.0]
     * //     [-36.0, -38.0, -40.0, -42.0]
     * //     [-44.0, -46.0, -48.0, -50.0]
     */
    Matrix4.multiplyByScalar = function(matrix, scalar, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar must be a number');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = matrix[0] * scalar;
        result[1] = matrix[1] * scalar;
        result[2] = matrix[2] * scalar;
        result[3] = matrix[3] * scalar;
        result[4] = matrix[4] * scalar;
        result[5] = matrix[5] * scalar;
        result[6] = matrix[6] * scalar;
        result[7] = matrix[7] * scalar;
        result[8] = matrix[8] * scalar;
        result[9] = matrix[9] * scalar;
        result[10] = matrix[10] * scalar;
        result[11] = matrix[11] * scalar;
        result[12] = matrix[12] * scalar;
        result[13] = matrix[13] * scalar;
        result[14] = matrix[14] * scalar;
        result[15] = matrix[15] * scalar;
        return result;
    };

    /**
     * Computes a negated copy of the provided matrix.
     *
     * @param {Matrix4} matrix The matrix to negate.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * //create a new Matrix4 instance which is a negation of a Matrix4
     * // m = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [18.0, 19.0, 20.0, 21.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     *
     * var a = Cesium.Matrix4.negate(m, new Cesium.Matrix4());
     *
     * // m remains the same
     * // a = [-10.0, -11.0, -12.0, -13.0]
     * //     [-14.0, -15.0, -16.0, -17.0]
     * //     [-18.0, -19.0, -20.0, -21.0]
     * //     [-22.0, -23.0, -24.0, -25.0]
     */
    Matrix4.negate = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = -matrix[0];
        result[1] = -matrix[1];
        result[2] = -matrix[2];
        result[3] = -matrix[3];
        result[4] = -matrix[4];
        result[5] = -matrix[5];
        result[6] = -matrix[6];
        result[7] = -matrix[7];
        result[8] = -matrix[8];
        result[9] = -matrix[9];
        result[10] = -matrix[10];
        result[11] = -matrix[11];
        result[12] = -matrix[12];
        result[13] = -matrix[13];
        result[14] = -matrix[14];
        result[15] = -matrix[15];
        return result;
    };

    /**
     * Computes the transpose of the provided matrix.
     *
     * @param {Matrix4} matrix The matrix to transpose.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * //returns transpose of a Matrix4
     * // m = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [18.0, 19.0, 20.0, 21.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     *
     * var a = Cesium.Matrix4.transpose(m, new Cesium.Matrix4());
     *
     * // m remains the same
     * // a = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     */
    Matrix4.transpose = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        var matrix1 = matrix[1];
        var matrix2 = matrix[2];
        var matrix3 = matrix[3];
        var matrix6 = matrix[6];
        var matrix7 = matrix[7];
        var matrix11 = matrix[11];

        result[0] = matrix[0];
        result[1] = matrix[4];
        result[2] = matrix[8];
        result[3] = matrix[12];
        result[4] = matrix1;
        result[5] = matrix[5];
        result[6] = matrix[9];
        result[7] = matrix[13];
        result[8] = matrix2;
        result[9] = matrix6;
        result[10] = matrix[10];
        result[11] = matrix[14];
        result[12] = matrix3;
        result[13] = matrix7;
        result[14] = matrix11;
        result[15] = matrix[15];
        return result;
    };

    /**
     * Computes a matrix, which contains the absolute (unsigned) values of the provided matrix's elements.
     *
     * @param {Matrix4} matrix The matrix with signed elements.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    Matrix4.abs = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = Math.abs(matrix[0]);
        result[1] = Math.abs(matrix[1]);
        result[2] = Math.abs(matrix[2]);
        result[3] = Math.abs(matrix[3]);
        result[4] = Math.abs(matrix[4]);
        result[5] = Math.abs(matrix[5]);
        result[6] = Math.abs(matrix[6]);
        result[7] = Math.abs(matrix[7]);
        result[8] = Math.abs(matrix[8]);
        result[9] = Math.abs(matrix[9]);
        result[10] = Math.abs(matrix[10]);
        result[11] = Math.abs(matrix[11]);
        result[12] = Math.abs(matrix[12]);
        result[13] = Math.abs(matrix[13]);
        result[14] = Math.abs(matrix[14]);
        result[15] = Math.abs(matrix[15]);

        return result;
    };

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Matrix4} [left] The first matrix.
     * @param {Matrix4} [right] The second matrix.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     *
     * @example
     * //compares two Matrix4 instances
     *
     * // a = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * // b = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * if(Cesium.Matrix4.equals(a,b)) {
     *      console.log("Both matrices are equal");
     * } else {
     *      console.log("They are not equal");
     * }
     *
     * //Prints "Both matrices are equal" on the console
     */
    Matrix4.equals = function(left, right) {
        // Given that most matrices will be transformation matrices, the elements
        // are tested in order such that the test is likely to fail as early
        // as possible.  I _think_ this is just as friendly to the L1 cache
        // as testing in index order.  It is certainty faster in practice.
        return (left === right) ||
               (defined(left) &&
                defined(right) &&
                // Translation
                left[12] === right[12] &&
                left[13] === right[13] &&
                left[14] === right[14] &&

                // Rotation/scale
                left[0] === right[0] &&
                left[1] === right[1] &&
                left[2] === right[2] &&
                left[4] === right[4] &&
                left[5] === right[5] &&
                left[6] === right[6] &&
                left[8] === right[8] &&
                left[9] === right[9] &&
                left[10] === right[10] &&

                // Bottom row
                left[3] === right[3] &&
                left[7] === right[7] &&
                left[11] === right[11] &&
                left[15] === right[15]);
    };

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {Matrix4} [left] The first matrix.
     * @param {Matrix4} [right] The second matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     *
     * @example
     * //compares two Matrix4 instances
     *
     * // a = [10.5, 14.5, 18.5, 22.5]
     * //     [11.5, 15.5, 19.5, 23.5]
     * //     [12.5, 16.5, 20.5, 24.5]
     * //     [13.5, 17.5, 21.5, 25.5]
     *
     * // b = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * if(Cesium.Matrix4.equalsEpsilon(a,b,0.1)){
     *      console.log("Difference between both the matrices is less than 0.1");
     * } else {
     *      console.log("Difference between both the matrices is not less than 0.1");
     * }
     *
     * //Prints "Difference between both the matrices is not less than 0.1" on the console
     */
    Matrix4.equalsEpsilon = function(left, right, epsilon) {
                if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon must be a number');
        }
        
        return (left === right) ||
                (defined(left) &&
                defined(right) &&
                Math.abs(left[0] - right[0]) <= epsilon &&
                Math.abs(left[1] - right[1]) <= epsilon &&
                Math.abs(left[2] - right[2]) <= epsilon &&
                Math.abs(left[3] - right[3]) <= epsilon &&
                Math.abs(left[4] - right[4]) <= epsilon &&
                Math.abs(left[5] - right[5]) <= epsilon &&
                Math.abs(left[6] - right[6]) <= epsilon &&
                Math.abs(left[7] - right[7]) <= epsilon &&
                Math.abs(left[8] - right[8]) <= epsilon &&
                Math.abs(left[9] - right[9]) <= epsilon &&
                Math.abs(left[10] - right[10]) <= epsilon &&
                Math.abs(left[11] - right[11]) <= epsilon &&
                Math.abs(left[12] - right[12]) <= epsilon &&
                Math.abs(left[13] - right[13]) <= epsilon &&
                Math.abs(left[14] - right[14]) <= epsilon &&
                Math.abs(left[15] - right[15]) <= epsilon);
    };

    /**
     * Gets the translation portion of the provided matrix, assuming the matrix is a affine transformation matrix.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Matrix4.getTranslation = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result.x = matrix[12];
        result.y = matrix[13];
        result.z = matrix[14];
        return result;
    };

    /**
     * Gets the upper left 3x3 rotation matrix of the provided matrix, assuming the matrix is a affine transformation matrix.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     *
     * @example
     * // returns a Matrix3 instance from a Matrix4 instance
     *
     * // m = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * var b = new Cesium.Matrix3();
     * Cesium.Matrix4.getRotation(m,b);
     *
     * // b = [10.0, 14.0, 18.0]
     * //     [11.0, 15.0, 19.0]
     * //     [12.0, 16.0, 20.0]
     */
    Matrix4.getRotation = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[4];
        result[4] = matrix[5];
        result[5] = matrix[6];
        result[6] = matrix[8];
        result[7] = matrix[9];
        result[8] = matrix[10];
        return result;
    };

    var scratchInverseRotation = new Matrix3();
    var scratchMatrix3Zero = new Matrix3();
    var scratchBottomRow = new Cartesian4();
    var scratchExpectedBottomRow = new Cartesian4(0.0, 0.0, 0.0, 1.0);

     /**
      * Computes the inverse of the provided matrix using Cramers Rule.
      * If the determinant is zero, the matrix can not be inverted, and an exception is thrown.
      * If the matrix is an affine transformation matrix, it is more efficient
      * to invert it with {@link Matrix4.inverseTransformation}.
      *
      * @param {Matrix4} matrix The matrix to invert.
      * @param {Matrix4} result The object onto which to store the result.
      * @returns {Matrix4} The modified result parameter.
      *
      * @exception {RuntimeError} matrix is not invertible because its determinate is zero.
      */
    Matrix4.inverse = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        // Special case for a zero scale matrix that can occur, for example,
        // when a model's node has a [0, 0, 0] scale.
        if (Matrix3.equalsEpsilon(Matrix4.getRotation(matrix, scratchInverseRotation), scratchMatrix3Zero, CesiumMath.EPSILON7) &&
            Cartesian4.equals(Matrix4.getRow(matrix, 3, scratchBottomRow), scratchExpectedBottomRow)) {

            result[0] = 0.0;
            result[1] = 0.0;
            result[2] = 0.0;
            result[3] = 0.0;
            result[4] = 0.0;
            result[5] = 0.0;
            result[6] = 0.0;
            result[7] = 0.0;
            result[8] = 0.0;
            result[9] = 0.0;
            result[10] = 0.0;
            result[11] = 0.0;
            result[12] = -matrix[12];
            result[13] = -matrix[13];
            result[14] = -matrix[14];
            result[15] = 1.0;
            return result;
        }

        //
        // Ported from:
        //   ftp://download.intel.com/design/PentiumIII/sml/24504301.pdf
        //
        var src0 = matrix[0];
        var src1 = matrix[4];
        var src2 = matrix[8];
        var src3 = matrix[12];
        var src4 = matrix[1];
        var src5 = matrix[5];
        var src6 = matrix[9];
        var src7 = matrix[13];
        var src8 = matrix[2];
        var src9 = matrix[6];
        var src10 = matrix[10];
        var src11 = matrix[14];
        var src12 = matrix[3];
        var src13 = matrix[7];
        var src14 = matrix[11];
        var src15 = matrix[15];

        // calculate pairs for first 8 elements (cofactors)
        var tmp0 = src10 * src15;
        var tmp1 = src11 * src14;
        var tmp2 = src9 * src15;
        var tmp3 = src11 * src13;
        var tmp4 = src9 * src14;
        var tmp5 = src10 * src13;
        var tmp6 = src8 * src15;
        var tmp7 = src11 * src12;
        var tmp8 = src8 * src14;
        var tmp9 = src10 * src12;
        var tmp10 = src8 * src13;
        var tmp11 = src9 * src12;

        // calculate first 8 elements (cofactors)
        var dst0 = (tmp0 * src5 + tmp3 * src6 + tmp4 * src7) - (tmp1 * src5 + tmp2 * src6 + tmp5 * src7);
        var dst1 = (tmp1 * src4 + tmp6 * src6 + tmp9 * src7) - (tmp0 * src4 + tmp7 * src6 + tmp8 * src7);
        var dst2 = (tmp2 * src4 + tmp7 * src5 + tmp10 * src7) - (tmp3 * src4 + tmp6 * src5 + tmp11 * src7);
        var dst3 = (tmp5 * src4 + tmp8 * src5 + tmp11 * src6) - (tmp4 * src4 + tmp9 * src5 + tmp10 * src6);
        var dst4 = (tmp1 * src1 + tmp2 * src2 + tmp5 * src3) - (tmp0 * src1 + tmp3 * src2 + tmp4 * src3);
        var dst5 = (tmp0 * src0 + tmp7 * src2 + tmp8 * src3) - (tmp1 * src0 + tmp6 * src2 + tmp9 * src3);
        var dst6 = (tmp3 * src0 + tmp6 * src1 + tmp11 * src3) - (tmp2 * src0 + tmp7 * src1 + tmp10 * src3);
        var dst7 = (tmp4 * src0 + tmp9 * src1 + tmp10 * src2) - (tmp5 * src0 + tmp8 * src1 + tmp11 * src2);

        // calculate pairs for second 8 elements (cofactors)
        tmp0 = src2 * src7;
        tmp1 = src3 * src6;
        tmp2 = src1 * src7;
        tmp3 = src3 * src5;
        tmp4 = src1 * src6;
        tmp5 = src2 * src5;
        tmp6 = src0 * src7;
        tmp7 = src3 * src4;
        tmp8 = src0 * src6;
        tmp9 = src2 * src4;
        tmp10 = src0 * src5;
        tmp11 = src1 * src4;

        // calculate second 8 elements (cofactors)
        var dst8 = (tmp0 * src13 + tmp3 * src14 + tmp4 * src15) - (tmp1 * src13 + tmp2 * src14 + tmp5 * src15);
        var dst9 = (tmp1 * src12 + tmp6 * src14 + tmp9 * src15) - (tmp0 * src12 + tmp7 * src14 + tmp8 * src15);
        var dst10 = (tmp2 * src12 + tmp7 * src13 + tmp10 * src15) - (tmp3 * src12 + tmp6 * src13 + tmp11 * src15);
        var dst11 = (tmp5 * src12 + tmp8 * src13 + tmp11 * src14) - (tmp4 * src12 + tmp9 * src13 + tmp10 * src14);
        var dst12 = (tmp2 * src10 + tmp5 * src11 + tmp1 * src9) - (tmp4 * src11 + tmp0 * src9 + tmp3 * src10);
        var dst13 = (tmp8 * src11 + tmp0 * src8 + tmp7 * src10) - (tmp6 * src10 + tmp9 * src11 + tmp1 * src8);
        var dst14 = (tmp6 * src9 + tmp11 * src11 + tmp3 * src8) - (tmp10 * src11 + tmp2 * src8 + tmp7 * src9);
        var dst15 = (tmp10 * src10 + tmp4 * src8 + tmp9 * src9) - (tmp8 * src9 + tmp11 * src10 + tmp5 * src8);

        // calculate determinant
        var det = src0 * dst0 + src1 * dst1 + src2 * dst2 + src3 * dst3;

        if (Math.abs(det) < CesiumMath.EPSILON20) {
            throw new RuntimeError('matrix is not invertible because its determinate is zero.');
        }

        // calculate matrix inverse
        det = 1.0 / det;

        result[0] = dst0 * det;
        result[1] = dst1 * det;
        result[2] = dst2 * det;
        result[3] = dst3 * det;
        result[4] = dst4 * det;
        result[5] = dst5 * det;
        result[6] = dst6 * det;
        result[7] = dst7 * det;
        result[8] = dst8 * det;
        result[9] = dst9 * det;
        result[10] = dst10 * det;
        result[11] = dst11 * det;
        result[12] = dst12 * det;
        result[13] = dst13 * det;
        result[14] = dst14 * det;
        result[15] = dst15 * det;
        return result;
    };

    /**
     * Computes the inverse of the provided matrix assuming it is
     * an affine transformation matrix, where the upper left 3x3 elements
     * are a rotation matrix, and the upper three elements in the fourth
     * column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
     * The matrix is not verified to be in the proper form.
     * This method is faster than computing the inverse for a general 4x4
     * matrix using {@link Matrix4.inverse}.
     *
     * @param {Matrix4} matrix The matrix to invert.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    Matrix4.inverseTransformation = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required,');
        }
        
        //This function is an optimized version of the below 4 lines.
        //var rT = Matrix3.transpose(Matrix4.getRotation(matrix));
        //var rTN = Matrix3.negate(rT);
        //var rTT = Matrix3.multiplyByVector(rTN, Matrix4.getTranslation(matrix));
        //return Matrix4.fromRotationTranslation(rT, rTT, result);

        var matrix0 = matrix[0];
        var matrix1 = matrix[1];
        var matrix2 = matrix[2];
        var matrix4 = matrix[4];
        var matrix5 = matrix[5];
        var matrix6 = matrix[6];
        var matrix8 = matrix[8];
        var matrix9 = matrix[9];
        var matrix10 = matrix[10];

        var vX = matrix[12];
        var vY = matrix[13];
        var vZ = matrix[14];

        var x = -matrix0 * vX - matrix1 * vY - matrix2 * vZ;
        var y = -matrix4 * vX - matrix5 * vY - matrix6 * vZ;
        var z = -matrix8 * vX - matrix9 * vY - matrix10 * vZ;

        result[0] = matrix0;
        result[1] = matrix4;
        result[2] = matrix8;
        result[3] = 0.0;
        result[4] = matrix1;
        result[5] = matrix5;
        result[6] = matrix9;
        result[7] = 0.0;
        result[8] = matrix2;
        result[9] = matrix6;
        result[10] = matrix10;
        result[11] = 0.0;
        result[12] = x;
        result[13] = y;
        result[14] = z;
        result[15] = 1.0;
        return result;
    };

    /**
     * An immutable Matrix4 instance initialized to the identity matrix.
     *
     * @type {Matrix4}
     * @constant
     */
    Matrix4.IDENTITY = freezeObject(new Matrix4(1.0, 0.0, 0.0, 0.0,
                                                0.0, 1.0, 0.0, 0.0,
                                                0.0, 0.0, 1.0, 0.0,
                                                0.0, 0.0, 0.0, 1.0));

    /**
     * The index into Matrix4 for column 0, row 0.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN0ROW0 = 0;

    /**
     * The index into Matrix4 for column 0, row 1.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN0ROW1 = 1;

    /**
     * The index into Matrix4 for column 0, row 2.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN0ROW2 = 2;

    /**
     * The index into Matrix4 for column 0, row 3.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN0ROW3 = 3;

    /**
     * The index into Matrix4 for column 1, row 0.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN1ROW0 = 4;

    /**
     * The index into Matrix4 for column 1, row 1.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN1ROW1 = 5;

    /**
     * The index into Matrix4 for column 1, row 2.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN1ROW2 = 6;

    /**
     * The index into Matrix4 for column 1, row 3.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN1ROW3 = 7;

    /**
     * The index into Matrix4 for column 2, row 0.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN2ROW0 = 8;

    /**
     * The index into Matrix4 for column 2, row 1.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN2ROW1 = 9;

    /**
     * The index into Matrix4 for column 2, row 2.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN2ROW2 = 10;

    /**
     * The index into Matrix4 for column 2, row 3.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN2ROW3 = 11;

    /**
     * The index into Matrix4 for column 3, row 0.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN3ROW0 = 12;

    /**
     * The index into Matrix4 for column 3, row 1.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN3ROW1 = 13;

    /**
     * The index into Matrix4 for column 3, row 2.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN3ROW2 = 14;

    /**
     * The index into Matrix4 for column 3, row 3.
     *
     * @type {Number}
     * @constant
     */
    Matrix4.COLUMN3ROW3 = 15;

    /**
     * Duplicates the provided Matrix4 instance.
     *
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     */
    Matrix4.prototype.clone = function(result) {
        return Matrix4.clone(this, result);
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Matrix4} [right] The right hand side matrix.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Matrix4.prototype.equals = function(right) {
        return Matrix4.equals(this, right);
    };

    /**
     * @private
     */
    Matrix4.equalsArray = function(matrix, array, offset) {
        return matrix[0] === array[offset] &&
               matrix[1] === array[offset + 1] &&
               matrix[2] === array[offset + 2] &&
               matrix[3] === array[offset + 3] &&
               matrix[4] === array[offset + 4] &&
               matrix[5] === array[offset + 5] &&
               matrix[6] === array[offset + 6] &&
               matrix[7] === array[offset + 7] &&
               matrix[8] === array[offset + 8] &&
               matrix[9] === array[offset + 9] &&
               matrix[10] === array[offset + 10] &&
               matrix[11] === array[offset + 11] &&
               matrix[12] === array[offset + 12] &&
               matrix[13] === array[offset + 13] &&
               matrix[14] === array[offset + 14] &&
               matrix[15] === array[offset + 15];
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {Matrix4} [right] The right hand side matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     */
    Matrix4.prototype.equalsEpsilon = function(right, epsilon) {
        return Matrix4.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Computes a string representing this Matrix with each row being
     * on a separate line and in the format '(column0, column1, column2, column3)'.
     *
     * @returns {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2, column3)'.
     */
    Matrix4.prototype.toString = function() {
        return '(' + this[0] + ', ' + this[4] + ', ' + this[8] + ', ' + this[12] +')\n' +
               '(' + this[1] + ', ' + this[5] + ', ' + this[9] + ', ' + this[13] +')\n' +
               '(' + this[2] + ', ' + this[6] + ', ' + this[10] + ', ' + this[14] +')\n' +
               '(' + this[3] + ', ' + this[7] + ', ' + this[11] + ', ' + this[15] +')';
    };

    return Matrix4;
});

/*global define*/
define('Core/Rectangle',[
        './Cartographic',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Ellipsoid',
        './freezeObject',
        './Math'
    ], function(
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        freezeObject,
        CesiumMath) {
    "use strict";

    /**
     * A two dimensional region specified as longitude and latitude coordinates.
     *
     * @alias Rectangle
     * @constructor
     *
     * @param {Number} [west=0.0] The westernmost longitude, in radians, in the range [-Pi, Pi].
     * @param {Number} [south=0.0] The southernmost latitude, in radians, in the range [-Pi/2, Pi/2].
     * @param {Number} [east=0.0] The easternmost longitude, in radians, in the range [-Pi, Pi].
     * @param {Number} [north=0.0] The northernmost latitude, in radians, in the range [-Pi/2, Pi/2].
     *
     * @see Packable
     */
    var Rectangle = function(west, south, east, north) {
        /**
         * The westernmost longitude in radians in the range [-Pi, Pi].
         *
         * @type {Number}
         * @default 0.0
         */
        this.west = defaultValue(west, 0.0);

        /**
         * The southernmost latitude in radians in the range [-Pi/2, Pi/2].
         *
         * @type {Number}
         * @default 0.0
         */
        this.south = defaultValue(south, 0.0);

        /**
         * The easternmost longitude in radians in the range [-Pi, Pi].
         *
         * @type {Number}
         * @default 0.0
         */
        this.east = defaultValue(east, 0.0);

        /**
         * The northernmost latitude in radians in the range [-Pi/2, Pi/2].
         *
         * @type {Number}
         * @default 0.0
         */
        this.north = defaultValue(north, 0.0);
    };

    defineProperties(Rectangle.prototype, {
        /**
         * Gets the width of the rectangle in radians.
         * @memberof Rectangle.prototype
         * @type {Number}
         */
        width : {
            get : function() {
                return Rectangle.computeWidth(this);
            }
        },

        /**
         * Gets the height of the rectangle in radians.
         * @memberof Rectangle.prototype
         * @type {Number}
         */
        height : {
            get : function() {
                return Rectangle.computeHeight(this);
            }
        }
    });

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Rectangle.packedLength = 4;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {BoundingSphere} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Rectangle.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }

        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.west;
        array[startingIndex++] = value.south;
        array[startingIndex++] = value.east;
        array[startingIndex] = value.north;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Rectangle} [result] The object into which to store the result.
     */
    Rectangle.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Rectangle();
        }

        result.west = array[startingIndex++];
        result.south = array[startingIndex++];
        result.east = array[startingIndex++];
        result.north = array[startingIndex];
        return result;
    };

    /**
     * Computes the width of a rectangle in radians.
     * @param {Rectangle} rectangle The rectangle to compute the width of.
     * @returns {Number} The width.
     */
    Rectangle.computeWidth = function(rectangle) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required.');
        }
                var east = rectangle.east;
        var west = rectangle.west;
        if (east < west) {
            east += CesiumMath.TWO_PI;
        }
        return east - west;
    };

    /**
     * Computes the height of a rectangle in radians.
     * @param {Rectangle} rectangle The rectangle to compute the height of.
     * @returns {Number} The height.
     */
    Rectangle.computeHeight = function(rectangle) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required.');
        }
                return rectangle.north - rectangle.south;
    };

    /**
     * Creates an rectangle given the boundary longitude and latitude in degrees.
     *
     * @param {Number} [west=0.0] The westernmost longitude in degrees in the range [-180.0, 180.0].
     * @param {Number} [south=0.0] The southernmost latitude in degrees in the range [-90.0, 90.0].
     * @param {Number} [east=0.0] The easternmost longitude in degrees in the range [-180.0, 180.0].
     * @param {Number} [north=0.0] The northernmost latitude in degrees in the range [-90.0, 90.0].
     * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
     * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
     *
     * @example
     * var rectangle = Cesium.Rectangle.fromDegrees(0.0, 20.0, 10.0, 30.0);
     */
    Rectangle.fromDegrees = function(west, south, east, north, result) {
        west = CesiumMath.toRadians(defaultValue(west, 0.0));
        south = CesiumMath.toRadians(defaultValue(south, 0.0));
        east = CesiumMath.toRadians(defaultValue(east, 0.0));
        north = CesiumMath.toRadians(defaultValue(north, 0.0));

        if (!defined(result)) {
            return new Rectangle(west, south, east, north);
        }

        result.west = west;
        result.south = south;
        result.east = east;
        result.north = north;

        return result;
    };

    /**
     * Creates the smallest possible Rectangle that encloses all positions in the provided array.
     *
     * @param {Cartographic[]} cartographics The list of Cartographic instances.
     * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
     * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
     */
    Rectangle.fromCartographicArray = function(cartographics, result) {
                if (!defined(cartographics)) {
            throw new DeveloperError('cartographics is required.');
        }
        
        var minLon = Number.MAX_VALUE;
        var maxLon = -Number.MAX_VALUE;
        var minLat = Number.MAX_VALUE;
        var maxLat = -Number.MAX_VALUE;

        for ( var i = 0, len = cartographics.length; i < len; i++) {
            var position = cartographics[i];
            minLon = Math.min(minLon, position.longitude);
            maxLon = Math.max(maxLon, position.longitude);
            minLat = Math.min(minLat, position.latitude);
            maxLat = Math.max(maxLat, position.latitude);
        }

        if (!defined(result)) {
            return new Rectangle(minLon, minLat, maxLon, maxLat);
        }

        result.west = minLon;
        result.south = minLat;
        result.east = maxLon;
        result.north = maxLat;
        return result;
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Rectangle.packedLength = 4;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Rectangle} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Rectangle.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }

        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.west;
        array[startingIndex++] = value.south;
        array[startingIndex++] = value.east;
        array[startingIndex] = value.north;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Rectangle} [result] The object into which to store the result.
     */
    Rectangle.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Rectangle();
        }
        result.west = array[startingIndex++];
        result.south = array[startingIndex++];
        result.east = array[startingIndex++];
        result.north = array[startingIndex];
        return result;
    };

    /**
     * Duplicates an Rectangle.
     *
     * @param {Rectangle} rectangle The rectangle to clone.
     * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
     * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided. (Returns undefined if rectangle is undefined)
     */
    Rectangle.clone = function(rectangle, result) {
        if (!defined(rectangle)) {
            return undefined;
        }

        if (!defined(result)) {
            return new Rectangle(rectangle.west, rectangle.south, rectangle.east, rectangle.north);
        }

        result.west = rectangle.west;
        result.south = rectangle.south;
        result.east = rectangle.east;
        result.north = rectangle.north;
        return result;
    };

    /**
     * Duplicates this Rectangle.
     *
     * @param {Rectangle} [result] The object onto which to store the result.
     * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
     */
    Rectangle.prototype.clone = function(result) {
        return Rectangle.clone(this, result);
    };

    /**
     * Compares the provided Rectangle with this Rectangle componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Rectangle} [other] The Rectangle to compare.
     * @returns {Boolean} <code>true</code> if the Rectangles are equal, <code>false</code> otherwise.
     */
    Rectangle.prototype.equals = function(other) {
        return Rectangle.equals(this, other);
    };

    /**
     * Compares the provided rectangles and returns <code>true</code> if they are equal,
     * <code>false</code> otherwise.
     *
     * @param {Rectangle} [left] The first Rectangle.
     * @param {Rectangle} [right] The second Rectangle.
     * @returns {Boolean} <code>true</code> if left and right are equal; otherwise <code>false</code>.
     */
    Rectangle.equals = function(left, right) {
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                (left.west === right.west) &&
                (left.south === right.south) &&
                (left.east === right.east) &&
                (left.north === right.north));
    };

    /**
     * Compares the provided Rectangle with this Rectangle componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {Rectangle} [other] The Rectangle to compare.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @returns {Boolean} <code>true</code> if the Rectangles are within the provided epsilon, <code>false</code> otherwise.
     */
    Rectangle.prototype.equalsEpsilon = function(other, epsilon) {
                if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number.');
        }
        
        return defined(other) &&
               (Math.abs(this.west - other.west) <= epsilon) &&
               (Math.abs(this.south - other.south) <= epsilon) &&
               (Math.abs(this.east - other.east) <= epsilon) &&
               (Math.abs(this.north - other.north) <= epsilon);
    };

    /**
     * Checks an Rectangle's properties and throws if they are not in valid ranges.
     *
     * @param {Rectangle} rectangle The rectangle to validate
     *
     * @exception {DeveloperError} <code>north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     */
    Rectangle.validate = function(rectangle) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }

        var north = rectangle.north;
        if (typeof north !== 'number') {
            throw new DeveloperError('north is required to be a number.');
        }

        if (north < -CesiumMath.PI_OVER_TWO || north > CesiumMath.PI_OVER_TWO) {
            throw new DeveloperError('north must be in the interval [-Pi/2, Pi/2].');
        }

        var south = rectangle.south;
        if (typeof south !== 'number') {
            throw new DeveloperError('south is required to be a number.');
        }

        if (south < -CesiumMath.PI_OVER_TWO || south > CesiumMath.PI_OVER_TWO) {
            throw new DeveloperError('south must be in the interval [-Pi/2, Pi/2].');
        }

        var west = rectangle.west;
        if (typeof west !== 'number') {
            throw new DeveloperError('west is required to be a number.');
        }

        if (west < -Math.PI || west > Math.PI) {
            throw new DeveloperError('west must be in the interval [-Pi, Pi].');
        }

        var east = rectangle.east;
        if (typeof east !== 'number') {
            throw new DeveloperError('east is required to be a number.');
        }

        if (east < -Math.PI || east > Math.PI) {
            throw new DeveloperError('east must be in the interval [-Pi, Pi].');
        }
            };

    /**
     * Computes the southwest corner of an rectangle.
     *
     * @param {Rectangle} rectangle The rectangle for which to find the corner
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Rectangle.southwest = function(rectangle, result) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        
        if (!defined(result)) {
            return new Cartographic(rectangle.west, rectangle.south);
        }
        result.longitude = rectangle.west;
        result.latitude = rectangle.south;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the northwest corner of an rectangle.
     *
     * @param {Rectangle} rectangle The rectangle for which to find the corner
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Rectangle.northwest = function(rectangle, result) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        
        if (!defined(result)) {
            return new Cartographic(rectangle.west, rectangle.north);
        }
        result.longitude = rectangle.west;
        result.latitude = rectangle.north;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the northeast corner of an rectangle.
     *
     * @param {Rectangle} rectangle The rectangle for which to find the corner
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Rectangle.northeast = function(rectangle, result) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        
        if (!defined(result)) {
            return new Cartographic(rectangle.east, rectangle.north);
        }
        result.longitude = rectangle.east;
        result.latitude = rectangle.north;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the southeast corner of an rectangle.
     *
     * @param {Rectangle} rectangle The rectangle for which to find the corner
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Rectangle.southeast = function(rectangle, result) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        
        if (!defined(result)) {
            return new Cartographic(rectangle.east, rectangle.south);
        }
        result.longitude = rectangle.east;
        result.latitude = rectangle.south;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the center of an rectangle.
     *
     * @param {Rectangle} rectangle The rectangle for which to find the center
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     */
    Rectangle.center = function(rectangle, result) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        
        var east = rectangle.east;
        var west = rectangle.west;

        if (east < west) {
            east += CesiumMath.TWO_PI;
        }

        var longitude = CesiumMath.negativePiToPi((west + east) * 0.5);
        var latitude = (rectangle.south + rectangle.north) * 0.5;

        if (!defined(result)) {
            return new Cartographic(longitude, latitude);
        }

        result.longitude = longitude;
        result.latitude = latitude;
        result.height = 0.0;
        return result;
    };

    /**
     * Computes the intersection of two rectangles
     *
     * @param {Rectangle} rectangle On rectangle to find an intersection
     * @param {Rectangle} otherRectangle Another rectangle to find an intersection
     * @param {Rectangle} [result] The object onto which to store the result.
     * @returns {Rectangle|undefined} The modified result parameter, a new Rectangle instance if none was provided or undefined if there is no intersection.
     */
    Rectangle.intersection = function(rectangle, otherRectangle, result) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        if (!defined(otherRectangle)) {
            throw new DeveloperError('otherRectangle is required.');
        }
        
        var rectangleEast = rectangle.east;
        var rectangleWest = rectangle.west;

        var otherRectangleEast = otherRectangle.east;
        var otherRectangleWest = otherRectangle.west;

        if (rectangleEast < rectangleWest && otherRectangleEast > 0.0) {
            rectangleEast += CesiumMath.TWO_PI;
        } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0.0) {
            otherRectangleEast += CesiumMath.TWO_PI;
        }

        if (rectangleEast < rectangleWest && otherRectangleWest < 0.0) {
            otherRectangleWest += CesiumMath.TWO_PI;
        } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0.0) {
            rectangleWest += CesiumMath.TWO_PI;
        }

        var west = CesiumMath.negativePiToPi(Math.max(rectangleWest, otherRectangleWest));
        var east = CesiumMath.negativePiToPi(Math.min(rectangleEast, otherRectangleEast));

        if ((rectangle.west < rectangle.east || otherRectangle.west < otherRectangle.east) && east <= west) {
            return undefined;
        }

        var south = Math.max(rectangle.south, otherRectangle.south);
        var north = Math.min(rectangle.north, otherRectangle.north);

        if (south >= north) {
            return undefined;
        }

        if (!defined(result)) {
            return new Rectangle(west, south, east, north);
        }
        result.west = west;
        result.south = south;
        result.east = east;
        result.north = north;
        return result;
    };

    /**
     * Returns true if the cartographic is on or inside the rectangle, false otherwise.
     *
     * @param {Rectangle} rectangle The rectangle
     * @param {Cartographic} cartographic The cartographic to test.
     * @returns {Boolean} true if the provided cartographic is inside the rectangle, false otherwise.
     */
    Rectangle.contains = function(rectangle, cartographic) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        if (!defined(cartographic)) {
            throw new DeveloperError('cartographic is required.');
        }
        
        var longitude = cartographic.longitude;
        var latitude = cartographic.latitude;

        var west = rectangle.west;
        var east = rectangle.east;

        if (east < west) {
            east += CesiumMath.TWO_PI;
            if (longitude < 0.0) {
                longitude += CesiumMath.TWO_PI;
            }
        }
        return (longitude > west || CesiumMath.equalsEpsilon(longitude, west, CesiumMath.EPSILON14)) &&
               (longitude < east || CesiumMath.equalsEpsilon(longitude, east, CesiumMath.EPSILON14)) &&
               latitude >= rectangle.south &&
               latitude <= rectangle.north;
    };

    var subsampleLlaScratch = new Cartographic();
    /**
     * Samples an rectangle so that it includes a list of Cartesian points suitable for passing to
     * {@link BoundingSphere#fromPoints}.  Sampling is necessary to account
     * for rectangles that cover the poles or cross the equator.
     *
     * @param {Rectangle} rectangle The rectangle to subsample.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to use.
     * @param {Number} [surfaceHeight=0.0] The height of the rectangle above the ellipsoid.
     * @param {Cartesian3[]} [result] The array of Cartesians onto which to store the result.
     * @returns {Cartesian3[]} The modified result parameter or a new Array of Cartesians instances if none was provided.
     */
    Rectangle.subsample = function(rectangle, ellipsoid, surfaceHeight, result) {
                if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        surfaceHeight = defaultValue(surfaceHeight, 0.0);

        if (!defined(result)) {
            result = [];
        }
        var length = 0;

        var north = rectangle.north;
        var south = rectangle.south;
        var east = rectangle.east;
        var west = rectangle.west;

        var lla = subsampleLlaScratch;
        lla.height = surfaceHeight;

        lla.longitude = west;
        lla.latitude = north;
        result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
        length++;

        lla.longitude = east;
        result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
        length++;

        lla.latitude = south;
        result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
        length++;

        lla.longitude = west;
        result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
        length++;

        if (north < 0.0) {
            lla.latitude = north;
        } else if (south > 0.0) {
            lla.latitude = south;
        } else {
            lla.latitude = 0.0;
        }

        for ( var i = 1; i < 8; ++i) {
            lla.longitude = -Math.PI + i * CesiumMath.PI_OVER_TWO;
            if (Rectangle.contains(rectangle, lla)) {
                result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
                length++;
            }
        }

        if (lla.latitude === 0.0) {
            lla.longitude = west;
            result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
            length++;
            lla.longitude = east;
            result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
            length++;
        }
        result.length = length;
        return result;
    };

    /**
     * The largest possible rectangle.
     *
     * @type {Rectangle}
     * @constant
    */
    Rectangle.MAX_VALUE = freezeObject(new Rectangle(-Math.PI, -CesiumMath.PI_OVER_TWO, Math.PI, CesiumMath.PI_OVER_TWO));

    return Rectangle;
});

/*global define*/
define('Core/BoundingSphere',[
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './GeographicProjection',
        './Intersect',
        './Interval',
        './Matrix4',
        './Rectangle'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        Intersect,
        Interval,
        Matrix4,
        Rectangle) {
    "use strict";

    /**
     * A bounding sphere with a center and a radius.
     * @alias BoundingSphere
     * @constructor
     *
     * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the bounding sphere.
     * @param {Number} [radius=0.0] The radius of the bounding sphere.
     *
     * @see AxisAlignedBoundingBox
     * @see BoundingRectangle
     * @see Packable
     */
    var BoundingSphere = function(center, radius) {
        /**
         * The center point of the sphere.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.center = Cartesian3.clone(defaultValue(center, Cartesian3.ZERO));

        /**
         * The radius of the sphere.
         * @type {Number}
         * @default 0.0
         */
        this.radius = defaultValue(radius, 0.0);
    };

    var fromPointsXMin = new Cartesian3();
    var fromPointsYMin = new Cartesian3();
    var fromPointsZMin = new Cartesian3();
    var fromPointsXMax = new Cartesian3();
    var fromPointsYMax = new Cartesian3();
    var fromPointsZMax = new Cartesian3();
    var fromPointsCurrentPos = new Cartesian3();
    var fromPointsScratch = new Cartesian3();
    var fromPointsRitterCenter = new Cartesian3();
    var fromPointsMinBoxPt = new Cartesian3();
    var fromPointsMaxBoxPt = new Cartesian3();
    var fromPointsNaiveCenterScratch = new Cartesian3();

    /**
     * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
     * The bounding sphere is computed by running two algorithms, a naive algorithm and
     * Ritter's algorithm. The smaller of the two spheres is used to ensure a tight fit.
     *
     * @param {Cartesian3[]} positions An array of points that the bounding sphere will enclose.  Each point must have <code>x</code>, <code>y</code>, and <code>z</code> properties.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
     *
     * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
     */
    BoundingSphere.fromPoints = function(positions, result) {
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        if (!defined(positions) || positions.length === 0) {
            result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
            result.radius = 0.0;
            return result;
        }

        var currentPos = Cartesian3.clone(positions[0], fromPointsCurrentPos);

        var xMin = Cartesian3.clone(currentPos, fromPointsXMin);
        var yMin = Cartesian3.clone(currentPos, fromPointsYMin);
        var zMin = Cartesian3.clone(currentPos, fromPointsZMin);

        var xMax = Cartesian3.clone(currentPos, fromPointsXMax);
        var yMax = Cartesian3.clone(currentPos, fromPointsYMax);
        var zMax = Cartesian3.clone(currentPos, fromPointsZMax);

        var numPositions = positions.length;
        for (var i = 1; i < numPositions; i++) {
            Cartesian3.clone(positions[i], currentPos);

            var x = currentPos.x;
            var y = currentPos.y;
            var z = currentPos.z;

            // Store points containing the the smallest and largest components
            if (x < xMin.x) {
                Cartesian3.clone(currentPos, xMin);
            }

            if (x > xMax.x) {
                Cartesian3.clone(currentPos, xMax);
            }

            if (y < yMin.y) {
                Cartesian3.clone(currentPos, yMin);
            }

            if (y > yMax.y) {
                Cartesian3.clone(currentPos, yMax);
            }

            if (z < zMin.z) {
                Cartesian3.clone(currentPos, zMin);
            }

            if (z > zMax.z) {
                Cartesian3.clone(currentPos, zMax);
            }
        }

        // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
        var xSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(xMax, xMin, fromPointsScratch));
        var ySpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(yMax, yMin, fromPointsScratch));
        var zSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(zMax, zMin, fromPointsScratch));

        // Set the diameter endpoints to the largest span.
        var diameter1 = xMin;
        var diameter2 = xMax;
        var maxSpan = xSpan;
        if (ySpan > maxSpan) {
            maxSpan = ySpan;
            diameter1 = yMin;
            diameter2 = yMax;
        }
        if (zSpan > maxSpan) {
            maxSpan = zSpan;
            diameter1 = zMin;
            diameter2 = zMax;
        }

        // Calculate the center of the initial sphere found by Ritter's algorithm
        var ritterCenter = fromPointsRitterCenter;
        ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
        ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
        ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

        // Calculate the radius of the initial sphere found by Ritter's algorithm
        var radiusSquared = Cartesian3.magnitudeSquared(Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch));
        var ritterRadius = Math.sqrt(radiusSquared);

        // Find the center of the sphere found using the Naive method.
        var minBoxPt = fromPointsMinBoxPt;
        minBoxPt.x = xMin.x;
        minBoxPt.y = yMin.y;
        minBoxPt.z = zMin.z;

        var maxBoxPt = fromPointsMaxBoxPt;
        maxBoxPt.x = xMax.x;
        maxBoxPt.y = yMax.y;
        maxBoxPt.z = zMax.z;

        var naiveCenter = Cartesian3.multiplyByScalar(Cartesian3.add(minBoxPt, maxBoxPt, fromPointsScratch), 0.5, fromPointsNaiveCenterScratch);

        // Begin 2nd pass to find naive radius and modify the ritter sphere.
        var naiveRadius = 0;
        for (i = 0; i < numPositions; i++) {
            Cartesian3.clone(positions[i], currentPos);

            // Find the furthest point from the naive center to calculate the naive radius.
            var r = Cartesian3.magnitude(Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch));
            if (r > naiveRadius) {
                naiveRadius = r;
            }

            // Make adjustments to the Ritter Sphere to include all points.
            var oldCenterToPointSquared = Cartesian3.magnitudeSquared(Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch));
            if (oldCenterToPointSquared > radiusSquared) {
                var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
                // Calculate new radius to include the point that lies outside
                ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
                radiusSquared = ritterRadius * ritterRadius;
                // Calculate center of new Ritter sphere
                var oldToNew = oldCenterToPoint - ritterRadius;
                ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
                ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
                ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
            }
        }

        if (ritterRadius < naiveRadius) {
            Cartesian3.clone(ritterCenter, result.center);
            result.radius = ritterRadius;
        } else {
            Cartesian3.clone(naiveCenter, result.center);
            result.radius = naiveRadius;
        }

        return result;
    };

    var defaultProjection = new GeographicProjection();
    var fromRectangle2DLowerLeft = new Cartesian3();
    var fromRectangle2DUpperRight = new Cartesian3();
    var fromRectangle2DSouthwest = new Cartographic();
    var fromRectangle2DNortheast = new Cartographic();

    /**
     * Computes a bounding sphere from an rectangle projected in 2D.
     *
     * @param {Rectangle} rectangle The rectangle around which to create a bounding sphere.
     * @param {Object} [projection=GeographicProjection] The projection used to project the rectangle into 2D.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.fromRectangle2D = function(rectangle, projection, result) {
        return BoundingSphere.fromRectangleWithHeights2D(rectangle, projection, 0.0, 0.0, result);
    };

    /**
     * Computes a bounding sphere from an rectangle projected in 2D.  The bounding sphere accounts for the
     * object's minimum and maximum heights over the rectangle.
     *
     * @param {Rectangle} rectangle The rectangle around which to create a bounding sphere.
     * @param {Object} [projection=GeographicProjection] The projection used to project the rectangle into 2D.
     * @param {Number} [minimumHeight=0.0] The minimum height over the rectangle.
     * @param {Number} [maximumHeight=0.0] The maximum height over the rectangle.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.fromRectangleWithHeights2D = function(rectangle, projection, minimumHeight, maximumHeight, result) {
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        if (!defined(rectangle)) {
            result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
            result.radius = 0.0;
            return result;
        }

        projection = defaultValue(projection, defaultProjection);

        Rectangle.southwest(rectangle, fromRectangle2DSouthwest);
        fromRectangle2DSouthwest.height = minimumHeight;
        Rectangle.northeast(rectangle, fromRectangle2DNortheast);
        fromRectangle2DNortheast.height = maximumHeight;

        var lowerLeft = projection.project(fromRectangle2DSouthwest, fromRectangle2DLowerLeft);
        var upperRight = projection.project(fromRectangle2DNortheast, fromRectangle2DUpperRight);

        var width = upperRight.x - lowerLeft.x;
        var height = upperRight.y - lowerLeft.y;
        var elevation = upperRight.z - lowerLeft.z;

        result.radius = Math.sqrt(width * width + height * height + elevation * elevation) * 0.5;
        var center = result.center;
        center.x = lowerLeft.x + width * 0.5;
        center.y = lowerLeft.y + height * 0.5;
        center.z = lowerLeft.z + elevation * 0.5;
        return result;
    };

    var fromRectangle3DScratch = [];

    /**
     * Computes a bounding sphere from an rectangle in 3D. The bounding sphere is created using a subsample of points
     * on the ellipsoid and contained in the rectangle. It may not be accurate for all rectangles on all types of ellipsoids.
     *
     * @param {Rectangle} rectangle The valid rectangle used to create a bounding sphere.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid used to determine positions of the rectangle.
     * @param {Number} [surfaceHeight=0.0] The height above the surface of the ellipsoid.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.fromRectangle3D = function(rectangle, ellipsoid, surfaceHeight, result) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        surfaceHeight = defaultValue(surfaceHeight, 0.0);

        var positions;
        if (defined(rectangle)) {
            positions = Rectangle.subsample(rectangle, ellipsoid, surfaceHeight, fromRectangle3DScratch);
        }

        return BoundingSphere.fromPoints(positions, result);
    };

    /**
     * Computes a tight-fitting bounding sphere enclosing a list of 3D points, where the points are
     * stored in a flat array in X, Y, Z, order.  The bounding sphere is computed by running two
     * algorithms, a naive algorithm and Ritter's algorithm. The smaller of the two spheres is used to
     * ensure a tight fit.
     *
     * @param {Cartesian3[]} positions An array of points that the bounding sphere will enclose.  Each point
     *        is formed from three elements in the array in the order X, Y, Z.
     * @param {Cartesian3} [center=Cartesian3.ZERO] The position to which the positions are relative, which need not be the
     *        origin of the coordinate system.  This is useful when the positions are to be used for
     *        relative-to-center (RTC) rendering.
     * @param {Number} [stride=3] The number of array elements per vertex.  It must be at least 3, but it may
     *        be higher.  Regardless of the value of this parameter, the X coordinate of the first position
     *        is at array index 0, the Y coordinate is at array index 1, and the Z coordinate is at array index
     *        2.  When stride is 3, the X coordinate of the next position then begins at array index 3.  If
     *        the stride is 5, however, two array elements are skipped and the next position begins at array
     *        index 5.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
     *
     * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
     *
     * @example
     * // Compute the bounding sphere from 3 positions, each specified relative to a center.
     * // In addition to the X, Y, and Z coordinates, the points array contains two additional
     * // elements per point which are ignored for the purpose of computing the bounding sphere.
     * var center = new Cesium.Cartesian3(1.0, 2.0, 3.0);
     * var points = [1.0, 2.0, 3.0, 0.1, 0.2,
     *               4.0, 5.0, 6.0, 0.1, 0.2,
     *               7.0, 8.0, 9.0, 0.1, 0.2];
     * var sphere = Cesium.BoundingSphere.fromVertices(points, center, 5);
     */
    BoundingSphere.fromVertices = function(positions, center, stride, result) {
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        if (!defined(positions) || positions.length === 0) {
            result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
            result.radius = 0.0;
            return result;
        }

        center = defaultValue(center, Cartesian3.ZERO);

        stride = defaultValue(stride, 3);

                if (stride < 3) {
            throw new DeveloperError('stride must be 3 or greater.');
        }
        
        var currentPos = fromPointsCurrentPos;
        currentPos.x = positions[0] + center.x;
        currentPos.y = positions[1] + center.y;
        currentPos.z = positions[2] + center.z;

        var xMin = Cartesian3.clone(currentPos, fromPointsXMin);
        var yMin = Cartesian3.clone(currentPos, fromPointsYMin);
        var zMin = Cartesian3.clone(currentPos, fromPointsZMin);

        var xMax = Cartesian3.clone(currentPos, fromPointsXMax);
        var yMax = Cartesian3.clone(currentPos, fromPointsYMax);
        var zMax = Cartesian3.clone(currentPos, fromPointsZMax);

        var numElements = positions.length;
        for (var i = 0; i < numElements; i += stride) {
            var x = positions[i] + center.x;
            var y = positions[i + 1] + center.y;
            var z = positions[i + 2] + center.z;

            currentPos.x = x;
            currentPos.y = y;
            currentPos.z = z;

            // Store points containing the the smallest and largest components
            if (x < xMin.x) {
                Cartesian3.clone(currentPos, xMin);
            }

            if (x > xMax.x) {
                Cartesian3.clone(currentPos, xMax);
            }

            if (y < yMin.y) {
                Cartesian3.clone(currentPos, yMin);
            }

            if (y > yMax.y) {
                Cartesian3.clone(currentPos, yMax);
            }

            if (z < zMin.z) {
                Cartesian3.clone(currentPos, zMin);
            }

            if (z > zMax.z) {
                Cartesian3.clone(currentPos, zMax);
            }
        }

        // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
        var xSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(xMax, xMin, fromPointsScratch));
        var ySpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(yMax, yMin, fromPointsScratch));
        var zSpan = Cartesian3.magnitudeSquared(Cartesian3.subtract(zMax, zMin, fromPointsScratch));

        // Set the diameter endpoints to the largest span.
        var diameter1 = xMin;
        var diameter2 = xMax;
        var maxSpan = xSpan;
        if (ySpan > maxSpan) {
            maxSpan = ySpan;
            diameter1 = yMin;
            diameter2 = yMax;
        }
        if (zSpan > maxSpan) {
            maxSpan = zSpan;
            diameter1 = zMin;
            diameter2 = zMax;
        }

        // Calculate the center of the initial sphere found by Ritter's algorithm
        var ritterCenter = fromPointsRitterCenter;
        ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
        ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
        ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

        // Calculate the radius of the initial sphere found by Ritter's algorithm
        var radiusSquared = Cartesian3.magnitudeSquared(Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch));
        var ritterRadius = Math.sqrt(radiusSquared);

        // Find the center of the sphere found using the Naive method.
        var minBoxPt = fromPointsMinBoxPt;
        minBoxPt.x = xMin.x;
        minBoxPt.y = yMin.y;
        minBoxPt.z = zMin.z;

        var maxBoxPt = fromPointsMaxBoxPt;
        maxBoxPt.x = xMax.x;
        maxBoxPt.y = yMax.y;
        maxBoxPt.z = zMax.z;

        var naiveCenter = Cartesian3.multiplyByScalar(Cartesian3.add(minBoxPt, maxBoxPt, fromPointsScratch), 0.5, fromPointsNaiveCenterScratch);

        // Begin 2nd pass to find naive radius and modify the ritter sphere.
        var naiveRadius = 0;
        for (i = 0; i < numElements; i += stride) {
            currentPos.x = positions[i] + center.x;
            currentPos.y = positions[i + 1] + center.y;
            currentPos.z = positions[i + 2] + center.z;

            // Find the furthest point from the naive center to calculate the naive radius.
            var r = Cartesian3.magnitude(Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch));
            if (r > naiveRadius) {
                naiveRadius = r;
            }

            // Make adjustments to the Ritter Sphere to include all points.
            var oldCenterToPointSquared = Cartesian3.magnitudeSquared(Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch));
            if (oldCenterToPointSquared > radiusSquared) {
                var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
                // Calculate new radius to include the point that lies outside
                ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
                radiusSquared = ritterRadius * ritterRadius;
                // Calculate center of new Ritter sphere
                var oldToNew = oldCenterToPoint - ritterRadius;
                ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
                ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
                ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
            }
        }

        if (ritterRadius < naiveRadius) {
            Cartesian3.clone(ritterCenter, result.center);
            result.radius = ritterRadius;
        } else {
            Cartesian3.clone(naiveCenter, result.center);
            result.radius = naiveRadius;
        }

        return result;
    };

    /**
     * Computes a bounding sphere from the corner points of an axis-aligned bounding box.  The sphere
     * tighly and fully encompases the box.
     *
     * @param {Number} [corner] The minimum height over the rectangle.
     * @param {Number} [oppositeCorner] The maximum height over the rectangle.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @example
     * // Create a bounding sphere around the unit cube
     * var sphere = Cesium.BoundingSphere.fromCornerPoints(new Cesium.Cartesian3(-0.5, -0.5, -0.5), new Cesium.Cartesian3(0.5, 0.5, 0.5));
     */
    BoundingSphere.fromCornerPoints = function(corner, oppositeCorner, result) {
                if (!defined(corner) || !defined(oppositeCorner)) {
            throw new DeveloperError('corner and oppositeCorner are required.');
        }
        
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        var center = result.center;
        Cartesian3.add(corner, oppositeCorner, center);
        Cartesian3.multiplyByScalar(center, 0.5, center);
        result.radius = Cartesian3.distance(center, oppositeCorner);
        return result;
    };

    /**
     * Creates a bounding sphere encompassing an ellipsoid.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid around which to create a bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @example
     * var boundingSphere = Cesium.BoundingSphere.fromEllipsoid(ellipsoid);
     */
    BoundingSphere.fromEllipsoid = function(ellipsoid, result) {
                if (!defined(ellipsoid)) {
            throw new DeveloperError('ellipsoid is required.');
        }
        
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        Cartesian3.clone(Cartesian3.ZERO, result.center);
        result.radius = ellipsoid.maximumRadius;
        return result;
    };

    var fromBoundingSpheresScratch = new Cartesian3();

    /**
     * Computes a tight-fitting bounding sphere enclosing the provided array of bounding spheres.
     *
     * @param {BoundingSphere[]} boundingSpheres The array of bounding spheres.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.fromBoundingSpheres = function(boundingSpheres, result) {
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        if (!defined(boundingSpheres) || boundingSpheres.length === 0) {
            result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
            result.radius = 0.0;
            return result;
        }

        var length = boundingSpheres.length;
        if (length === 1) {
            return BoundingSphere.clone(boundingSpheres[0], result);
        }

        if (length === 2) {
            return BoundingSphere.union(boundingSpheres[0], boundingSpheres[1], result);
        }

        var positions = [];
        for (var i = 0; i < length; i++) {
            positions.push(boundingSpheres[i].center);
        }

        result = BoundingSphere.fromPoints(positions, result);

        var center = result.center;
        var radius = result.radius;
        for (i = 0; i < length; i++) {
            var tmp = boundingSpheres[i];
            radius = Math.max(radius, Cartesian3.distance(center, tmp.center, fromBoundingSpheresScratch) + tmp.radius);
        }
        result.radius = radius;

        return result;
    };

    /**
     * Duplicates a BoundingSphere instance.
     *
     * @param {BoundingSphere} sphere The bounding sphere to duplicate.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided. (Returns undefined if sphere is undefined)
     */
    BoundingSphere.clone = function(sphere, result) {
        if (!defined(sphere)) {
            return undefined;
        }

        if (!defined(result)) {
            return new BoundingSphere(sphere.center, sphere.radius);
        }

        result.center = Cartesian3.clone(sphere.center, result.center);
        result.radius = sphere.radius;
        return result;
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    BoundingSphere.packedLength = 4;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {BoundingSphere} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    BoundingSphere.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }

        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        var center = value.center;
        array[startingIndex++] = center.x;
        array[startingIndex++] = center.y;
        array[startingIndex++] = center.z;
        array[startingIndex] = value.radius;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {BoundingSphere} [result] The object into which to store the result.
     */
    BoundingSphere.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new BoundingSphere();
        }

        var center = result.center;
        center.x = array[startingIndex++];
        center.y = array[startingIndex++];
        center.z = array[startingIndex++];
        result.radius = array[startingIndex];
        return result;
    };

    var unionScratch = new Cartesian3();
    var unionScratchCenter = new Cartesian3();
    /**
     * Computes a bounding sphere that contains both the left and right bounding spheres.
     *
     * @param {BoundingSphere} left A sphere to enclose in a bounding sphere.
     * @param {BoundingSphere} right A sphere to enclose in a bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.union = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required.');
        }

        if (!defined(right)) {
            throw new DeveloperError('right is required.');
        }
        
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        var leftCenter = left.center;
        var rightCenter = right.center;

        Cartesian3.add(leftCenter, rightCenter, unionScratchCenter);
        var center = Cartesian3.multiplyByScalar(unionScratchCenter, 0.5, unionScratchCenter);

        var radius1 = Cartesian3.magnitude(Cartesian3.subtract(leftCenter, center, unionScratch)) + left.radius;
        var radius2 = Cartesian3.magnitude(Cartesian3.subtract(rightCenter, center, unionScratch)) + right.radius;

        result.radius = Math.max(radius1, radius2);
        Cartesian3.clone(center, result.center);

        return result;
    };

    var expandScratch = new Cartesian3();
    /**
     * Computes a bounding sphere by enlarging the provided sphere to contain the provided point.
     *
     * @param {BoundingSphere} sphere A sphere to expand.
     * @param {Cartesian3} point A point to enclose in a bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.expand = function(sphere, point, result) {
                if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }

        if (!defined(point)) {
            throw new DeveloperError('point is required.');
        }
        
        result = BoundingSphere.clone(sphere, result);

        var radius = Cartesian3.magnitude(Cartesian3.subtract(point, result.center, expandScratch));
        if (radius > result.radius) {
            result.radius = radius;
        }

        return result;
    };

    /**
     * Determines which side of a plane a sphere is located.
     *
     * @param {BoundingSphere} sphere The bounding sphere to test.
     * @param {Cartesian4} plane The coefficients of the plane in the for ax + by + cz + d = 0
     *                           where the coefficients a, b, c, and d are the components x, y, z,
     *                           and w of the {@link Cartesian4}, respectively.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
     *                      intersects the plane.
     */
    BoundingSphere.intersect = function(sphere, plane) {
                if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }

        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        
        var center = sphere.center;
        var radius = sphere.radius;
        var distanceToPlane = Cartesian3.dot(plane, center) + plane.w;

        if (distanceToPlane < -radius) {
            // The center point is negative side of the plane normal
            return Intersect.OUTSIDE;
        } else if (distanceToPlane < radius) {
            // The center point is positive side of the plane, but radius extends beyond it; partial overlap
            return Intersect.INTERSECTING;
        }
        return Intersect.INSIDE;
    };

    /**
     * Applies a 4x4 affine transformation matrix to a bounding sphere.
     *
     * @param {BoundingSphere} sphere The bounding sphere to apply the transformation to.
     * @param {Matrix4} transform The transformation matrix to apply to the bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.transform = function(sphere, transform, result) {
                if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }

        if (!defined(transform)) {
            throw new DeveloperError('transform is required.');
        }
        
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        result.center = Matrix4.multiplyByPoint(transform, sphere.center, result.center);
        result.radius = Matrix4.getMaximumScale(transform) * sphere.radius;

        return result;
    };

    var distanceSquaredToScratch = new Cartesian3();

    /**
     * Computes the estimated distance squared from the closest point on a bounding sphere to a point.
     *
     * @param {BoundingSphere} sphere The sphere.
     * @param {Cartesian3} cartesian The point
     * @returns {Number} The estimated distance squared from the bounding sphere to the point.
     *
     * @example
     * // Sort bounding spheres from back to front
     * spheres.sort(function(a, b) {
     *     return Cesium.BoundingSphere.distanceSquaredTo(b, camera.positionWC) - Cesium.BoundingSphere.distanceSquaredTo(a, camera.positionWC);
     * });
     */
    BoundingSphere.distanceSquaredTo = function(sphere, cartesian) {
                if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        
        var diff = Cartesian3.subtract(sphere.center, cartesian, distanceSquaredToScratch);
        return Cartesian3.magnitudeSquared(diff) - sphere.radius * sphere.radius;
    };

    /**
     * Applies a 4x4 affine transformation matrix to a bounding sphere where there is no scale
     * The transformation matrix is not verified to have a uniform scale of 1.
     * This method is faster than computing the general bounding sphere transform using {@link BoundingSphere.transform}.
     *
     * @param {BoundingSphere} sphere The bounding sphere to apply the transformation to.
     * @param {Matrix4} transform The transformation matrix to apply to the bounding sphere.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     *
     * @example
     * var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid);
     * var boundingSphere = new Cesium.BoundingSphere();
     * var newBoundingSphere = Cesium.BoundingSphere.transformWithoutScale(boundingSphere, modelMatrix);
     */
    BoundingSphere.transformWithoutScale = function(sphere, transform, result) {
                if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }

        if (!defined(transform)) {
            throw new DeveloperError('transform is required.');
        }
        
        if (!defined(result)) {
            result = new BoundingSphere();
        }

        result.center = Matrix4.multiplyByPoint(transform, sphere.center, result.center);
        result.radius = sphere.radius;

        return result;
    };

    var scratchCartesian3 = new Cartesian3();
    /**
     * The distances calculated by the vector from the center of the bounding sphere to position projected onto direction
     * plus/minus the radius of the bounding sphere.
     * <br>
     * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
     * closest and farthest planes from position that intersect the bounding sphere.
     *
     * @param {BoundingSphere} sphere The bounding sphere to calculate the distance to.
     * @param {Cartesian3} position The position to calculate the distance from.
     * @param {Cartesian3} direction The direction from position.
     * @param {Cartesian2} [result] A Cartesian2 to store the nearest and farthest distances.
     * @returns {Interval} The nearest and farthest distances on the bounding sphere from position in direction.
     */
    BoundingSphere.computePlaneDistances = function(sphere, position, direction, result) {
                if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }

        if (!defined(position)) {
            throw new DeveloperError('position is required.');
        }

        if (!defined(direction)) {
            throw new DeveloperError('direction is required.');
        }
        
        if (!defined(result)) {
            result = new Interval();
        }

        var toCenter = Cartesian3.subtract(sphere.center, position, scratchCartesian3);
        var proj = Cartesian3.multiplyByScalar(direction, Cartesian3.dot(direction, toCenter), scratchCartesian3);
        var mag = Cartesian3.magnitude(proj);

        result.start = mag - sphere.radius;
        result.stop = mag + sphere.radius;
        return result;
    };

    var projectTo2DNormalScratch = new Cartesian3();
    var projectTo2DEastScratch = new Cartesian3();
    var projectTo2DNorthScratch = new Cartesian3();
    var projectTo2DWestScratch = new Cartesian3();
    var projectTo2DSouthScratch = new Cartesian3();
    var projectTo2DCartographicScratch = new Cartographic();
    var projectTo2DPositionsScratch = new Array(8);
    for (var n = 0; n < 8; ++n) {
        projectTo2DPositionsScratch[n] = new Cartesian3();
    }
    var projectTo2DProjection = new GeographicProjection();
    /**
     * Creates a bounding sphere in 2D from a bounding sphere in 3D world coordinates.
     *
     * @param {BoundingSphere} sphere The bounding sphere to transform to 2D.
     * @param {Object} [projection=GeographicProjection] The projection to 2D.
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.projectTo2D = function(sphere, projection, result) {
                if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }
        
        projection = defaultValue(projection, projectTo2DProjection);

        var ellipsoid = projection.ellipsoid;
        var center = sphere.center;
        var radius = sphere.radius;

        var normal = ellipsoid.geodeticSurfaceNormal(center, projectTo2DNormalScratch);
        var east = Cartesian3.cross(Cartesian3.UNIT_Z, normal, projectTo2DEastScratch);
        Cartesian3.normalize(east, east);
        var north = Cartesian3.cross(normal, east, projectTo2DNorthScratch);
        Cartesian3.normalize(north, north);

        Cartesian3.multiplyByScalar(normal, radius, normal);
        Cartesian3.multiplyByScalar(north, radius, north);
        Cartesian3.multiplyByScalar(east, radius, east);

        var south = Cartesian3.negate(north, projectTo2DSouthScratch);
        var west = Cartesian3.negate(east, projectTo2DWestScratch);

        var positions = projectTo2DPositionsScratch;

        // top NE corner
        var corner = positions[0];
        Cartesian3.add(normal, north, corner);
        Cartesian3.add(corner, east, corner);

        // top NW corner
        corner = positions[1];
        Cartesian3.add(normal, north, corner);
        Cartesian3.add(corner, west, corner);

        // top SW corner
        corner = positions[2];
        Cartesian3.add(normal, south, corner);
        Cartesian3.add(corner, west, corner);

        // top SE corner
        corner = positions[3];
        Cartesian3.add(normal, south, corner);
        Cartesian3.add(corner, east, corner);

        Cartesian3.negate(normal, normal);

        // bottom NE corner
        corner = positions[4];
        Cartesian3.add(normal, north, corner);
        Cartesian3.add(corner, east, corner);

        // bottom NW corner
        corner = positions[5];
        Cartesian3.add(normal, north, corner);
        Cartesian3.add(corner, west, corner);

        // bottom SW corner
        corner = positions[6];
        Cartesian3.add(normal, south, corner);
        Cartesian3.add(corner, west, corner);

        // bottom SE corner
        corner = positions[7];
        Cartesian3.add(normal, south, corner);
        Cartesian3.add(corner, east, corner);

        var length = positions.length;
        for (var i = 0; i < length; ++i) {
            var position = positions[i];
            Cartesian3.add(center, position, position);
            var cartographic = ellipsoid.cartesianToCartographic(position, projectTo2DCartographicScratch);
            projection.project(cartographic, position);
        }

        result = BoundingSphere.fromPoints(positions, result);

        // swizzle center components
        center = result.center;
        var x = center.x;
        var y = center.y;
        var z = center.z;
        center.x = z;
        center.y = x;
        center.z = y;

        return result;
    };

    /**
     * Compares the provided BoundingSphere componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {BoundingSphere} [left] The first BoundingSphere.
     * @param {BoundingSphere} [right] The second BoundingSphere.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    BoundingSphere.equals = function(left, right) {
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                Cartesian3.equals(left.center, right.center) &&
                left.radius === right.radius);
    };

    /**
     * Determines which side of a plane the sphere is located.
     *
     * @param {Cartesian4} plane The coefficients of the plane in the for ax + by + cz + d = 0
     *                           where the coefficients a, b, c, and d are the components x, y, z,
     *                           and w of the {@link Cartesian4}, respectively.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
     *                      intersects the plane.
     */
    BoundingSphere.prototype.intersect = function(plane) {
        return BoundingSphere.intersect(this, plane);
    };

    /**
     * Compares this BoundingSphere against the provided BoundingSphere componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {BoundingSphere} [right] The right hand side BoundingSphere.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    BoundingSphere.prototype.equals = function(right) {
        return BoundingSphere.equals(this, right);
    };

    /**
     * Duplicates this BoundingSphere instance.
     *
     * @param {BoundingSphere} [result] The object onto which to store the result.
     * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
     */
    BoundingSphere.prototype.clone = function(result) {
        return BoundingSphere.clone(this, result);
    };

    return BoundingSphere;
});

/*global define*/
define('Core/Cartesian2',[
        './defaultValue',
        './defined',
        './DeveloperError',
        './freezeObject',
        './Math'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        freezeObject,
        CesiumMath) {
    "use strict";

    /**
     * A 2D Cartesian point.
     * @alias Cartesian2
     * @constructor
     *
     * @param {Number} [x=0.0] The X component.
     * @param {Number} [y=0.0] The Y component.
     *
     * @see Cartesian3
     * @see Cartesian4
     * @see Packable
     */
    var Cartesian2 = function(x, y) {
        /**
         * The X component.
         * @type {Number}
         * @default 0.0
         */
        this.x = defaultValue(x, 0.0);

        /**
         * The Y component.
         * @type {Number}
         * @default 0.0
         */
        this.y = defaultValue(y, 0.0);
    };

    /**
     * Creates a Cartesian2 instance from x and y coordinates.
     *
     * @param {Number} x The x coordinate.
     * @param {Number} y The y coordinate.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
     */
    Cartesian2.fromElements = function(x, y, result) {
        if (!defined(result)) {
            return new Cartesian2(x, y);
        }

        result.x = x;
        result.y = y;
        return result;
    };

    /**
     * Duplicates a Cartesian2 instance.
     *
     * @param {Cartesian2} cartesian The Cartesian to duplicate.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided. (Returns undefined if cartesian is undefined)
     */
    Cartesian2.clone = function(cartesian, result) {
        if (!defined(cartesian)) {
            return undefined;
        }
        if (!defined(result)) {
            return new Cartesian2(cartesian.x, cartesian.y);
        }

        result.x = cartesian.x;
        result.y = cartesian.y;
        return result;
    };

    /**
     * Creates a Cartesian2 instance from an existing Cartesian3.  This simply takes the
     * x and y properties of the Cartesian3 and drops z.
     * @function
     *
     * @param {Cartesian3} cartesian The Cartesian3 instance to create a Cartesian2 instance from.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
     */
    Cartesian2.fromCartesian3 = Cartesian2.clone;

    /**
     * Creates a Cartesian2 instance from an existing Cartesian4.  This simply takes the
     * x and y properties of the Cartesian4 and drops z and w.
     * @function
     *
     * @param {Cartesian4} cartesian The Cartesian4 instance to create a Cartesian2 instance from.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
     */
    Cartesian2.fromCartesian4 = Cartesian2.clone;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Cartesian2.packedLength = 2;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Cartesian2} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Cartesian2.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.x;
        array[startingIndex] = value.y;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Cartesian2} [result] The object into which to store the result.
     */
    Cartesian2.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Cartesian2();
        }
        result.x = array[startingIndex++];
        result.y = array[startingIndex];
        return result;
    };

    /**
     * Creates a Cartesian2 from two consecutive elements in an array.
     * @function
     *
     * @param {Number[]} array The array whose two consecutive elements correspond to the x and y components, respectively.
     * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to the x component.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
     *
     * @example
     * // Create a Cartesian2 with (1.0, 2.0)
     * var v = [1.0, 2.0];
     * var p = Cesium.Cartesian2.fromArray(v);
     *
     * // Create a Cartesian2 with (1.0, 2.0) using an offset into an array
     * var v2 = [0.0, 0.0, 1.0, 2.0];
     * var p2 = Cesium.Cartesian2.fromArray(v2, 2);
     */
    Cartesian2.fromArray = Cartesian2.unpack;

    /**
     * Computes the value of the maximum component for the supplied Cartesian.
     *
     * @param {Cartesian2} cartesian The cartesian to use.
     * @returns {Number} The value of the maximum component.
     */
    Cartesian2.maximumComponent = function(cartesian) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        return Math.max(cartesian.x, cartesian.y);
    };

    /**
     * Computes the value of the minimum component for the supplied Cartesian.
     *
     * @param {Cartesian2} cartesian The cartesian to use.
     * @returns {Number} The value of the minimum component.
     */
    Cartesian2.minimumComponent = function(cartesian) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        return Math.min(cartesian.x, cartesian.y);
    };

    /**
     * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
     *
     * @param {Cartesian2} first A cartesian to compare.
     * @param {Cartesian2} second A cartesian to compare.
     * @param {Cartesian2} result The object into which to store the result.
     * @returns {Cartesian2} A cartesian with the minimum components.
     */
    Cartesian2.minimumByComponent = function(first, second, result) {
                if (!defined(first)) {
            throw new DeveloperError('first is required.');
        }
        if (!defined(second)) {
            throw new DeveloperError('second is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        

        result.x = Math.min(first.x, second.x);
        result.y = Math.min(first.y, second.y);

        return result;
    };

    /**
     * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
     *
     * @param {Cartesian2} first A cartesian to compare.
     * @param {Cartesian2} second A cartesian to compare.
     * @param {Cartesian2} result The object into which to store the result.
     * @returns {Cartesian2} A cartesian with the maximum components.
     */
    Cartesian2.maximumByComponent = function(first, second, result) {
                if (!defined(first)) {
            throw new DeveloperError('first is required.');
        }
        if (!defined(second)) {
            throw new DeveloperError('second is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        result.x = Math.max(first.x, second.x);
        result.y = Math.max(first.y, second.y);
        return result;
    };

    /**
     * Computes the provided Cartesian's squared magnitude.
     *
     * @param {Cartesian2} cartesian The Cartesian instance whose squared magnitude is to be computed.
     * @returns {Number} The squared magnitude.
     */
    Cartesian2.magnitudeSquared = function(cartesian) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        return cartesian.x * cartesian.x + cartesian.y * cartesian.y;
    };

    /**
     * Computes the Cartesian's magnitude (length).
     *
     * @param {Cartesian2} cartesian The Cartesian instance whose magnitude is to be computed.
     * @returns {Number} The magnitude.
     */
    Cartesian2.magnitude = function(cartesian) {
        return Math.sqrt(Cartesian2.magnitudeSquared(cartesian));
    };

    var distanceScratch = new Cartesian2();

    /**
     * Computes the distance between two points.
     *
     * @param {Cartesian2} left The first point to compute the distance from.
     * @param {Cartesian2} right The second point to compute the distance to.
     * @returns {Number} The distance between two points.
     *
     * @example
     * // Returns 1.0
     * var d = Cesium.Cartesian2.distance(new Cesium.Cartesian2(1.0, 0.0), new Cesium.Cartesian2(2.0, 0.0));
     */
    Cartesian2.distance = function(left, right) {
                if (!defined(left) || !defined(right)) {
            throw new DeveloperError('left and right are required.');
        }
        
        Cartesian2.subtract(left, right, distanceScratch);
        return Cartesian2.magnitude(distanceScratch);
    };

    /**
     * Computes the squared distance between two points.  Comparing squared distances
     * using this function is more efficient than comparing distances using {@link Cartesian2#distance}.
     *
     * @param {Cartesian2} left The first point to compute the distance from.
     * @param {Cartesian2} right The second point to compute the distance to.
     * @returns {Number} The distance between two points.
     *
     * @example
     * // Returns 4.0, not 2.0
     * var d = Cesium.Cartesian2.distance(new Cesium.Cartesian2(1.0, 0.0), new Cesium.Cartesian2(3.0, 0.0));
     */
    Cartesian2.distanceSquared = function(left, right) {
                if (!defined(left) || !defined(right)) {
            throw new DeveloperError('left and right are required.');
        }
        
        Cartesian2.subtract(left, right, distanceScratch);
        return Cartesian2.magnitudeSquared(distanceScratch);
    };

    /**
     * Computes the normalized form of the supplied Cartesian.
     *
     * @param {Cartesian2} cartesian The Cartesian to be normalized.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    Cartesian2.normalize = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var magnitude = Cartesian2.magnitude(cartesian);

        result.x = cartesian.x / magnitude;
        result.y = cartesian.y / magnitude;
        return result;
    };

    /**
     * Computes the dot (scalar) product of two Cartesians.
     *
     * @param {Cartesian2} left The first Cartesian.
     * @param {Cartesian2} right The second Cartesian.
     * @returns {Number} The dot product.
     */
    Cartesian2.dot = function(left, right) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        
        return left.x * right.x + left.y * right.y;
    };

    /**
     * Computes the componentwise product of two Cartesians.
     *
     * @param {Cartesian2} left The first Cartesian.
     * @param {Cartesian2} right The second Cartesian.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    Cartesian2.multiplyComponents = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x * right.x;
        result.y = left.y * right.y;
        return result;
    };

    /**
     * Computes the componentwise sum of two Cartesians.
     *
     * @param {Cartesian2} left The first Cartesian.
     * @param {Cartesian2} right The second Cartesian.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    Cartesian2.add = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x + right.x;
        result.y = left.y + right.y;
        return result;
    };

    /**
     * Computes the componentwise difference of two Cartesians.
     *
     * @param {Cartesian2} left The first Cartesian.
     * @param {Cartesian2} right The second Cartesian.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    Cartesian2.subtract = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x - right.x;
        result.y = left.y - right.y;
        return result;
    };

    /**
     * Multiplies the provided Cartesian componentwise by the provided scalar.
     *
     * @param {Cartesian2} cartesian The Cartesian to be scaled.
     * @param {Number} scalar The scalar to multiply with.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    Cartesian2.multiplyByScalar = function(cartesian, scalar, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = cartesian.x * scalar;
        result.y = cartesian.y * scalar;
        return result;
    };

    /**
     * Divides the provided Cartesian componentwise by the provided scalar.
     *
     * @param {Cartesian2} cartesian The Cartesian to be divided.
     * @param {Number} scalar The scalar to divide by.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    Cartesian2.divideByScalar = function(cartesian, scalar, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = cartesian.x / scalar;
        result.y = cartesian.y / scalar;
        return result;
    };

    /**
     * Negates the provided Cartesian.
     *
     * @param {Cartesian2} cartesian The Cartesian to be negated.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    Cartesian2.negate = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = -cartesian.x;
        result.y = -cartesian.y;
        return result;
    };

    /**
     * Computes the absolute value of the provided Cartesian.
     *
     * @param {Cartesian2} cartesian The Cartesian whose absolute value is to be computed.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    Cartesian2.abs = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = Math.abs(cartesian.x);
        result.y = Math.abs(cartesian.y);
        return result;
    };

    var lerpScratch = new Cartesian2();
    /**
     * Computes the linear interpolation or extrapolation at t using the provided cartesians.
     *
     * @param {Cartesian2} start The value corresponding to t at 0.0.
     * @param {Cartesian2} end The value corresponding to t at 1.0.
     * @param {Number} t The point along t at which to interpolate.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter.
     */
    Cartesian2.lerp = function(start, end, t, result) {
                if (!defined(start)) {
            throw new DeveloperError('start is required.');
        }
        if (!defined(end)) {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        Cartesian2.multiplyByScalar(end, t, lerpScratch);
        result = Cartesian2.multiplyByScalar(start, 1.0 - t, result);
        return Cartesian2.add(lerpScratch, result, result);
    };

    var angleBetweenScratch = new Cartesian2();
    var angleBetweenScratch2 = new Cartesian2();
    /**
     * Returns the angle, in radians, between the provided Cartesians.
     *
     * @param {Cartesian2} left The first Cartesian.
     * @param {Cartesian2} right The second Cartesian.
     * @returns {Number} The angle between the Cartesians.
     */
    Cartesian2.angleBetween = function(left, right) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        
        Cartesian2.normalize(left, angleBetweenScratch);
        Cartesian2.normalize(right, angleBetweenScratch2);
        return CesiumMath.acosClamped(Cartesian2.dot(angleBetweenScratch, angleBetweenScratch2));
    };

    var mostOrthogonalAxisScratch = new Cartesian2();
    /**
     * Returns the axis that is most orthogonal to the provided Cartesian.
     *
     * @param {Cartesian2} cartesian The Cartesian on which to find the most orthogonal axis.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The most orthogonal axis.
     */
    Cartesian2.mostOrthogonalAxis = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        var f = Cartesian2.normalize(cartesian, mostOrthogonalAxisScratch);
        Cartesian2.abs(f, f);

        if (f.x <= f.y) {
            result = Cartesian2.clone(Cartesian2.UNIT_X, result);
        } else {
            result = Cartesian2.clone(Cartesian2.UNIT_Y, result);
        }

        return result;
    };

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartesian2} [left] The first Cartesian.
     * @param {Cartesian2} [right] The second Cartesian.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Cartesian2.equals = function(left, right) {
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                (left.x === right.x) &&
                (left.y === right.y));
    };

    /**
     * @private
     */
    Cartesian2.equalsArray = function(cartesian, array, offset) {
        return cartesian.x === array[offset] &&
               cartesian.y === array[offset + 1];
    };

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they pass an absolute or relative tolerance test,
     * <code>false</code> otherwise.
     *
     * @param {Cartesian2} [left] The first Cartesian.
     * @param {Cartesian2} [right] The second Cartesian.
     * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
     * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    Cartesian2.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
        return (left === right) ||
               (defined(left) &&
                defined(right) &&
                CesiumMath.equalsEpsilon(left.x, right.x, relativeEpsilon, absoluteEpsilon) &&
                CesiumMath.equalsEpsilon(left.y, right.y, relativeEpsilon, absoluteEpsilon));
    };

    /**
     * An immutable Cartesian2 instance initialized to (0.0, 0.0).
     *
     * @type {Cartesian2}
     * @constant
     */
    Cartesian2.ZERO = freezeObject(new Cartesian2(0.0, 0.0));

    /**
     * An immutable Cartesian2 instance initialized to (1.0, 0.0).
     *
     * @type {Cartesian2}
     * @constant
     */
    Cartesian2.UNIT_X = freezeObject(new Cartesian2(1.0, 0.0));

    /**
     * An immutable Cartesian2 instance initialized to (0.0, 1.0).
     *
     * @type {Cartesian2}
     * @constant
     */
    Cartesian2.UNIT_Y = freezeObject(new Cartesian2(0.0, 1.0));

    /**
     * Duplicates this Cartesian2 instance.
     *
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
     */
    Cartesian2.prototype.clone = function(result) {
        return Cartesian2.clone(this, result);
    };

    /**
     * Compares this Cartesian against the provided Cartesian componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Cartesian2} [right] The right hand side Cartesian.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Cartesian2.prototype.equals = function(right) {
        return Cartesian2.equals(this, right);
    };

    /**
     * Compares this Cartesian against the provided Cartesian componentwise and returns
     * <code>true</code> if they pass an absolute or relative tolerance test,
     * <code>false</code> otherwise.
     *
     * @param {Cartesian2} [right] The right hand side Cartesian.
     * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
     * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
     * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     */
    Cartesian2.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
        return Cartesian2.equalsEpsilon(this, right, relativeEpsilon, absoluteEpsilon);
    };

    /**
     * Creates a string representing this Cartesian in the format '(x, y)'.
     *
     * @returns {String} A string representing the provided Cartesian in the format '(x, y)'.
     */
    Cartesian2.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ')';
    };

    return Cartesian2;
});

/*global define*/
define('Core/Fullscreen',[
        './defined',
        './defineProperties'
    ], function(
        defined,
        defineProperties) {
    "use strict";

    var _supportsFullscreen;
    var _names = {
        requestFullscreen : undefined,
        exitFullscreen : undefined,
        fullscreenEnabled : undefined,
        fullscreenElement : undefined,
        fullscreenchange : undefined,
        fullscreenerror : undefined
    };

    /**
     * Browser-independent functions for working with the standard fullscreen API.
     *
     * @namespace
     * @alias Fullscreen
     *
     * @see {@link http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html|W3C Fullscreen Living Specification}
     */
    var Fullscreen = {};

    defineProperties(Fullscreen, {
        /**
         * The element that is currently fullscreen, if any.  To simply check if the
         * browser is in fullscreen mode or not, use {@link Fullscreen#fullscreen}.
         * @memberof Fullscreen
         * @type {Object}
         */
        element : {
            get : function() {
                if (!Fullscreen.supportsFullscreen()) {
                    return undefined;
                }

                return document[_names.fullscreenElement];
            }
        },

        /**
         * The name of the event on the document that is fired when fullscreen is
         * entered or exited.  This event name is intended for use with addEventListener.
         * In your event handler, to determine if the browser is in fullscreen mode or not,
         * use {@link Fullscreen#fullscreen}.
         * @memberof Fullscreen
         * @type {String}
         */
        changeEventName : {
            get : function() {
                if (!Fullscreen.supportsFullscreen()) {
                    return undefined;
                }

                return _names.fullscreenchange;
            }
        },

        /**
         * The name of the event that is fired when a fullscreen error
         * occurs.  This event name is intended for use with addEventListener.
         * @memberof Fullscreen
         * @type {String}
         */
        errorEventName : {
            get : function() {
                if (!Fullscreen.supportsFullscreen()) {
                    return undefined;
                }

                return _names.fullscreenerror;
            }
        },

        /**
         * Determine whether the browser will allow an element to be made fullscreen, or not.
         * For example, by default, iframes cannot go fullscreen unless the containing page
         * adds an "allowfullscreen" attribute (or prefixed equivalent).
         * @memberof Fullscreen
         * @type {Boolean}
         */
        enabled : {
            get : function() {
                if (!Fullscreen.supportsFullscreen()) {
                    return undefined;
                }

                return document[_names.fullscreenEnabled];
            }
        },

        /**
         * Determines if the browser is currently in fullscreen mode.
         * @memberof Fullscreen
         * @type {Boolean}
         */
        fullscreen : {
            get : function() {
                if (!Fullscreen.supportsFullscreen()) {
                    return undefined;
                }

                return Fullscreen.element !== null;
            }
        }
    });

    /**
     * Detects whether the browser supports the standard fullscreen API.
     *
     * @returns <code>true</code> if the browser supports the standard fullscreen API,
     * <code>false</code> otherwise.
     */
    Fullscreen.supportsFullscreen = function() {
        if (defined(_supportsFullscreen)) {
            return _supportsFullscreen;
        }

        _supportsFullscreen = false;

        var body = document.body;
        if (typeof body.requestFullscreen === 'function') {
            // go with the unprefixed, standard set of names
            _names.requestFullscreen = 'requestFullscreen';
            _names.exitFullscreen = 'exitFullscreen';
            _names.fullscreenEnabled = 'fullscreenEnabled';
            _names.fullscreenElement = 'fullscreenElement';
            _names.fullscreenchange = 'fullscreenchange';
            _names.fullscreenerror = 'fullscreenerror';
            _supportsFullscreen = true;
            return _supportsFullscreen;
        }

        //check for the correct combination of prefix plus the various names that browsers use
        var prefixes = ['webkit', 'moz', 'o', 'ms', 'khtml'];
        var name;
        for (var i = 0, len = prefixes.length; i < len; ++i) {
            var prefix = prefixes[i];

            // casing of Fullscreen differs across browsers
            name = prefix + 'RequestFullscreen';
            if (typeof body[name] === 'function') {
                _names.requestFullscreen = name;
                _supportsFullscreen = true;
            } else {
                name = prefix + 'RequestFullScreen';
                if (typeof body[name] === 'function') {
                    _names.requestFullscreen = name;
                    _supportsFullscreen = true;
                }
            }

            // disagreement about whether it's "exit" as per spec, or "cancel"
            name = prefix + 'ExitFullscreen';
            if (typeof document[name] === 'function') {
                _names.exitFullscreen = name;
            } else {
                name = prefix + 'CancelFullScreen';
                if (typeof document[name] === 'function') {
                    _names.exitFullscreen = name;
                }
            }

            // casing of Fullscreen differs across browsers
            name = prefix + 'FullscreenEnabled';
            if (defined(document[name])) {
                _names.fullscreenEnabled = name;
            } else {
                name = prefix + 'FullScreenEnabled';
                if (defined(document[name])) {
                    _names.fullscreenEnabled = name;
                }
            }

            // casing of Fullscreen differs across browsers
            name = prefix + 'FullscreenElement';
            if (defined(document[name])) {
                _names.fullscreenElement = name;
            } else {
                name = prefix + 'FullScreenElement';
                if (defined(document[name])) {
                    _names.fullscreenElement = name;
                }
            }

            // thankfully, event names are all lowercase per spec
            name = prefix + 'fullscreenchange';
            // event names do not have 'on' in the front, but the property on the document does
            if (defined(document['on' + name])) {
                //except on IE
                if (prefix === 'ms') {
                    name = 'MSFullscreenChange';
                }
                _names.fullscreenchange = name;
            }

            name = prefix + 'fullscreenerror';
            if (defined(document['on' + name])) {
                //except on IE
                if (prefix === 'ms') {
                    name = 'MSFullscreenError';
                }
                _names.fullscreenerror = name;
            }
        }

        return _supportsFullscreen;
    };

    /**
     * Asynchronously requests the browser to enter fullscreen mode on the given element.
     * If fullscreen mode is not supported by the browser, does nothing.
     *
     * @param {Object} element The HTML element which will be placed into fullscreen mode.
     *
     * @example
     * // Put the entire page into fullscreen.
     * Cesium.Fullscreen.requestFullscreen(document.body)
     *
     * // Place only the Cesium canvas into fullscreen.
     * Cesium.Fullscreen.requestFullscreen(scene.canvas)
     */
    Fullscreen.requestFullscreen = function(element) {
        if (!Fullscreen.supportsFullscreen()) {
            return;
        }

        element[_names.requestFullscreen]();
    };

    /**
     * Asynchronously exits fullscreen mode.  If the browser is not currently
     * in fullscreen, or if fullscreen mode is not supported by the browser, does nothing.
     */
    Fullscreen.exitFullscreen = function() {
        if (!Fullscreen.supportsFullscreen()) {
            return;
        }

        document[_names.exitFullscreen]();
    };

    return Fullscreen;
});
/*global define*/
define('Core/FeatureDetection',[
        './defaultValue',
        './defined',
        './Fullscreen'
    ], function(
        defaultValue,
        defined,
        Fullscreen) {
    "use strict";

    function extractVersion(versionString) {
        var parts = versionString.split('.');
        for (var i = 0, len = parts.length; i < len; ++i) {
            parts[i] = parseInt(parts[i], 10);
        }
        return parts;
    }

    var isChromeResult;
    var chromeVersionResult;
    function isChrome() {
        if (!defined(isChromeResult)) {
            isChromeResult = false;

            var fields = (/ Chrome\/([\.0-9]+)/).exec(navigator.userAgent);
            if (fields !== null) {
                isChromeResult = true;
                chromeVersionResult = extractVersion(fields[1]);
            }
        }

        return isChromeResult;
    }

    function chromeVersion() {
        return isChrome() && chromeVersionResult;
    }

    var isSafariResult;
    var safariVersionResult;
    function isSafari() {
        if (!defined(isSafariResult)) {
            isSafariResult = false;

            // Chrome contains Safari in the user agent too
            if (!isChrome() && (/ Safari\/[\.0-9]+/).test(navigator.userAgent)) {
                var fields = (/ Version\/([\.0-9]+)/).exec(navigator.userAgent);
                if (fields !== null) {
                    isSafariResult = true;
                    safariVersionResult = extractVersion(fields[1]);
                }
            }
        }

        return isSafariResult;
    }

    function safariVersion() {
        return isSafari() && safariVersionResult;
    }

    var isWebkitResult;
    var webkitVersionResult;
    function isWebkit() {
        if (!defined(isWebkitResult)) {
            isWebkitResult = false;

            var fields = (/ AppleWebKit\/([\.0-9]+)(\+?)/).exec(navigator.userAgent);
            if (fields !== null) {
                isWebkitResult = true;
                webkitVersionResult = extractVersion(fields[1]);
                webkitVersionResult.isNightly = !!fields[2];
            }
        }

        return isWebkitResult;
    }

    function webkitVersion() {
        return isWebkit() && webkitVersionResult;
    }

    var isInternetExplorerResult;
    var internetExplorerVersionResult;
    function isInternetExplorer() {
        if (!defined(isInternetExplorerResult)) {
            isInternetExplorerResult = false;

            var fields;
            if (navigator.appName === 'Microsoft Internet Explorer') {
                fields = /MSIE ([0-9]{1,}[\.0-9]{0,})/.exec(navigator.userAgent);
                if (fields !== null) {
                    isInternetExplorerResult = true;
                    internetExplorerVersionResult = extractVersion(fields[1]);
                }
            } else if (navigator.appName === 'Netscape') {
                fields = /Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/.exec(navigator.userAgent);
                if (fields !== null) {
                    isInternetExplorerResult = true;
                    internetExplorerVersionResult = extractVersion(fields[1]);
                }
            }
        }
        return isInternetExplorerResult;
    }

    function internetExplorerVersion() {
        return isInternetExplorer() && internetExplorerVersionResult;
    }

    var isFirefoxResult;
    var firefoxVersionResult;
    function isFirefox() {
        if (!defined(isFirefoxResult)) {
            isFirefoxResult = false;

            var fields = /Firefox\/([\.0-9]+)/.exec(navigator.userAgent);
            if (fields !== null) {
                isFirefoxResult = true;
                firefoxVersionResult = extractVersion(fields[1]);
            }
        }
        return isFirefoxResult;
    }

    var isWindowsResult;
    function isWindows() {
        if (!defined(isWindowsResult)) {
            isWindowsResult = /Windows/i.test(navigator.appVersion);
        }
        return isWindowsResult;
    }


    function firefoxVersion() {
        return isFirefox() && firefoxVersionResult;
    }

    /**
     * A set of functions to detect whether the current browser supports
     * various features.
     *
     * @namespace
     * @alias FeatureDetection
     */
    var FeatureDetection = {
        isChrome : isChrome,
        chromeVersion : chromeVersion,
        isSafari : isSafari,
        safariVersion : safariVersion,
        isWebkit : isWebkit,
        webkitVersion : webkitVersion,
        isInternetExplorer : isInternetExplorer,
        internetExplorerVersion : internetExplorerVersion,
        isFirefox : isFirefox,
        firefoxVersion : firefoxVersion,
        isWindows : isWindows,
        hardwareConcurrency : defaultValue(navigator.hardwareConcurrency, 3)
    };

    /**
     * Detects whether the current browser supports the full screen standard.
     *
     * @returns true if the browser supports the full screen standard, false if not.
     *
     * @see Fullscreen
     * @see {@link http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html|W3C Fullscreen Living Specification}
     */
    FeatureDetection.supportsFullscreen = function() {
        return Fullscreen.supportsFullscreen();
    };

    /**
     * Detects whether the current browser supports typed arrays.
     *
     * @returns true if the browser supports typed arrays, false if not.
     *
     * @see {@link http://www.khronos.org/registry/typedarray/specs/latest/|Typed Array Specification}
     */
    FeatureDetection.supportsTypedArrays = function() {
        return typeof ArrayBuffer !== 'undefined';
    };

    /**
     * Detects whether the current browser supports Web Workers.
     *
     * @returns true if the browsers supports Web Workers, false if not.
     *
     * @see {@link http://www.w3.org/TR/workers/}
     */
    FeatureDetection.supportsWebWorkers = function() {
        return typeof Worker !== 'undefined';
    };

    return FeatureDetection;
});
/*global define*/
define('Core/ComponentDatatype',[
        './defaultValue',
        './defined',
        './DeveloperError',
        './FeatureDetection',
        './freezeObject'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        FeatureDetection,
        freezeObject) {
    "use strict";

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    /**
     * WebGL component datatypes.  Components are intrinsics,
     * which form attributes, which form vertices.
     *
     * @namespace
     * @alias ComponentDatatype
     */
    var ComponentDatatype = {
        /**
         * 8-bit signed byte corresponding to <code>gl.BYTE</code> and the type
         * of an element in <code>Int8Array</code>.
         *
         * @type {Number}
         * @constant
         * @default 0x1400
         */
        BYTE : 0x1400,

        /**
         * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
         * of an element in <code>Uint8Array</code>.
         *
         * @type {Number}
         * @constant
         * @default 0x1401
         */
        UNSIGNED_BYTE : 0x1401,

        /**
         * 16-bit signed short corresponding to <code>SHORT</code> and the type
         * of an element in <code>Int16Array</code>.
         *
         * @type {Number}
         * @constant
         * @default 0x1402
         */
        SHORT : 0x1402,

        /**
         * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
         * of an element in <code>Uint16Array</code>.
         *
         * @type {Number}
         * @constant
         * @default 0x1403
         */
        UNSIGNED_SHORT : 0x1403,

        /**
         * 32-bit floating-point corresponding to <code>FLOAT</code> and the type
         * of an element in <code>Float32Array</code>.
         *
         * @type {Number}
         * @constant
         * @default 0x1406
         */
        FLOAT : 0x1406,

        /**
         * 64-bit floating-point corresponding to <code>gl.DOUBLE</code> (in Desktop OpenGL;
         * this is not supported in WebGL, and is emulated in Cesium via {@link GeometryPipeline.encodeAttribute})
         * and the type of an element in <code>Float64Array</code>.
         *
         * @memberOf ComponentDatatype
         *
         * @type {Number}
         * @constant
         * @default 0x140A
         */
        DOUBLE : 0x140A
    };

    /**
     * Returns the size, in bytes, of the corresponding datatype.
     *
     * @param {ComponentDatatype} componentDatatype The component datatype to get the size of.
     * @returns {Number} The size in bytes.
     *
     * @exception {DeveloperError} componentDatatype is not a valid value.
     *
     * @example
     * // Returns Int8Array.BYTES_PER_ELEMENT
     * var size = Cesium.ComponentDatatype.getSizeInBytes(Cesium.ComponentDatatype.BYTE);
     */
    ComponentDatatype.getSizeInBytes = function(componentDatatype){
                if (!defined(componentDatatype)) {
            throw new DeveloperError('value is required.');
        }
        
        switch (componentDatatype) {
        case ComponentDatatype.BYTE:
            return Int8Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.UNSIGNED_BYTE:
            return Uint8Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.SHORT:
            return Int16Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.UNSIGNED_SHORT:
            return Uint16Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.FLOAT:
            return Float32Array.BYTES_PER_ELEMENT;
        case ComponentDatatype.DOUBLE:
            return Float64Array.BYTES_PER_ELEMENT;
        default:
            throw new DeveloperError('componentDatatype is not a valid value.');
        }
    };

    /**
     * Gets the ComponentDatatype for the provided TypedArray instance.
     *
     * @param {TypedArray} array The typed array.
     * @returns {ComponentDatatype} The ComponentDatatype for the provided array, or undefined if the array is not a TypedArray.
     */
    ComponentDatatype.fromTypedArray = function(array) {
        if (array instanceof Int8Array) {
            return ComponentDatatype.BYTE;
        }
        if (array instanceof Uint8Array) {
            return ComponentDatatype.UNSIGNED_BYTE;
        }
        if (array instanceof Int16Array) {
            return ComponentDatatype.SHORT;
        }
        if (array instanceof Uint16Array) {
            return ComponentDatatype.UNSIGNED_SHORT;
        }
        if (array instanceof Float32Array) {
            return ComponentDatatype.FLOAT;
        }
        if (array instanceof Float64Array) {
            return ComponentDatatype.DOUBLE;
        }
    };

    /**
     * Validates that the provided component datatype is a valid {@link ComponentDatatype}
     *
     * @param {ComponentDatatype} componentDatatype The component datatype to validate.
     * @returns {Boolean} <code>true</code> if the provided component datatype is a valid value; otherwise, <code>false</code>.
     *
     * @example
     * if (!Cesium.ComponentDatatype.validate(componentDatatype)) {
     *   throw new Cesium.DeveloperError('componentDatatype must be a valid value.');
     * }
     */
    ComponentDatatype.validate = function(componentDatatype) {
        return defined(componentDatatype) &&
               (componentDatatype === ComponentDatatype.BYTE ||
                componentDatatype === ComponentDatatype.UNSIGNED_BYTE ||
                componentDatatype === ComponentDatatype.SHORT ||
                componentDatatype === ComponentDatatype.UNSIGNED_SHORT ||
                componentDatatype === ComponentDatatype.FLOAT ||
                componentDatatype === ComponentDatatype.DOUBLE);
    };

    /**
     * Creates a typed array corresponding to component data type.
     *
     * @param {ComponentDatatype} componentDatatype The component data type.
     * @param {Number|Array} valuesOrLength The length of the array to create or an array.
     * @returns {Int8Array|Uint8Array|Int16Array|Uint16Array|Float32Array|Float64Array} A typed array.
     *
     * @exception {DeveloperError} componentDatatype is not a valid value.
     *
     * @example
     * // creates a Float32Array with length of 100
     * var typedArray = Cesium.ComponentDatatype.createTypedArray(Cesium.ComponentDatatype.FLOAT, 100);
     */
    ComponentDatatype.createTypedArray = function(componentDatatype, valuesOrLength) {
                if (!defined(componentDatatype)) {
            throw new DeveloperError('componentDatatype is required.');
        }
        if (!defined(valuesOrLength)) {
            throw new DeveloperError('valuesOrLength is required.');
        }
        
        switch (componentDatatype) {
        case ComponentDatatype.BYTE:
            return new Int8Array(valuesOrLength);
        case ComponentDatatype.UNSIGNED_BYTE:
            return new Uint8Array(valuesOrLength);
        case ComponentDatatype.SHORT:
            return new Int16Array(valuesOrLength);
        case ComponentDatatype.UNSIGNED_SHORT:
            return new Uint16Array(valuesOrLength);
        case ComponentDatatype.FLOAT:
            return new Float32Array(valuesOrLength);
        case ComponentDatatype.DOUBLE:
            return new Float64Array(valuesOrLength);
        default:
            throw new DeveloperError('componentDatatype is not a valid value.');
        }
    };

    /**
     * Creates a typed view of an array of bytes.
     *
     * @param {ComponentDatatype} componentDatatype The type of the view to create.
     * @param {ArrayBuffer} buffer The buffer storage to use for the view.
     * @param {Number} [byteOffset] The offset, in bytes, to the first element in the view.
     * @param {Number} [length] The number of elements in the view.
     * @returns {Int8Array|Uint8Array|Int16Array|Uint16Array|Float32Array|Float64Array} A typed array view of the buffer.
     *
     * @exception {DeveloperError} componentDatatype is not a valid value.
     */
    ComponentDatatype.createArrayBufferView = function(componentDatatype, buffer, byteOffset, length) {
                if (!defined(componentDatatype)) {
            throw new DeveloperError('componentDatatype is required.');
        }
        if (!defined(buffer)) {
            throw new DeveloperError('buffer is required.');
        }
        
        byteOffset = defaultValue(byteOffset, 0);
        length = defaultValue(length, (buffer.byteLength - byteOffset) / ComponentDatatype.getSizeInBytes(componentDatatype));

        switch (componentDatatype) {
        case ComponentDatatype.BYTE:
            return new Int8Array(buffer, byteOffset, length);
        case ComponentDatatype.UNSIGNED_BYTE:
            return new Uint8Array(buffer, byteOffset, length);
        case ComponentDatatype.SHORT:
            return new Int16Array(buffer, byteOffset, length);
        case ComponentDatatype.UNSIGNED_SHORT:
            return new Uint16Array(buffer, byteOffset, length);
        case ComponentDatatype.FLOAT:
            return new Float32Array(buffer, byteOffset, length);
        case ComponentDatatype.DOUBLE:
            return new Float64Array(buffer, byteOffset, length);
        default:
            throw new DeveloperError('componentDatatype is not a valid value.');
        }
    };

    return freezeObject(ComponentDatatype);
});

/*global define*/
define('Core/Quaternion',[
        './Cartesian3',
        './defaultValue',
        './defined',
        './DeveloperError',
        './FeatureDetection',
        './freezeObject',
        './Math',
        './Matrix3'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        FeatureDetection,
        freezeObject,
        CesiumMath,
        Matrix3) {
    "use strict";

    /**
     * A set of 4-dimensional coordinates used to represent rotation in 3-dimensional space.
     * @alias Quaternion
     * @constructor
     *
     * @param {Number} [x=0.0] The X component.
     * @param {Number} [y=0.0] The Y component.
     * @param {Number} [z=0.0] The Z component.
     * @param {Number} [w=0.0] The W component.
     *
     * @see PackableForInterpolation
     */
    var Quaternion = function(x, y, z, w) {
        /**
         * The X component.
         * @type {Number}
         * @default 0.0
         */
        this.x = defaultValue(x, 0.0);

        /**
         * The Y component.
         * @type {Number}
         * @default 0.0
         */
        this.y = defaultValue(y, 0.0);

        /**
         * The Z component.
         * @type {Number}
         * @default 0.0
         */
        this.z = defaultValue(z, 0.0);

        /**
         * The W component.
         * @type {Number}
         * @default 0.0
         */
        this.w = defaultValue(w, 0.0);
    };

    var fromAxisAngleScratch = new Cartesian3();

    /**
     * Computes a quaternion representing a rotation around an axis.
     *
     * @param {Cartesian3} axis The axis of rotation.
     * @param {Number} angle The angle in radians to rotate around the axis.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     */
    Quaternion.fromAxisAngle = function(axis, angle, result) {
                if (!defined(axis)) {
            throw new DeveloperError('axis is required.');
        }
        if (typeof angle !== 'number') {
            throw new DeveloperError('angle is required and must be a number.');
        }
        
        var halfAngle = angle / 2.0;
        var s = Math.sin(halfAngle);
        fromAxisAngleScratch = Cartesian3.normalize(axis, fromAxisAngleScratch);

        var x = fromAxisAngleScratch.x * s;
        var y = fromAxisAngleScratch.y * s;
        var z = fromAxisAngleScratch.z * s;
        var w = Math.cos(halfAngle);
        if (!defined(result)) {
            return new Quaternion(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    var fromRotationMatrixNext = [1, 2, 0];
    var fromRotationMatrixQuat = new Array(3);
    /**
     * Computes a Quaternion from the provided Matrix3 instance.
     *
     * @param {Matrix3} matrix The rotation matrix.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @see Matrix3.fromQuaternion
     */
    Quaternion.fromRotationMatrix = function(matrix, result) {
                if (!defined(matrix)) {
            throw new DeveloperError('matrix is required.');
        }
        
        var root;
        var x;
        var y;
        var z;
        var w;

        var m00 = matrix[Matrix3.COLUMN0ROW0];
        var m11 = matrix[Matrix3.COLUMN1ROW1];
        var m22 = matrix[Matrix3.COLUMN2ROW2];
        var trace = m00 + m11 + m22;

        if (trace > 0.0) {
            // |w| > 1/2, may as well choose w > 1/2
            root = Math.sqrt(trace + 1.0); // 2w
            w = 0.5 * root;
            root = 0.5 / root; // 1/(4w)

            x = (matrix[Matrix3.COLUMN1ROW2] - matrix[Matrix3.COLUMN2ROW1]) * root;
            y = (matrix[Matrix3.COLUMN2ROW0] - matrix[Matrix3.COLUMN0ROW2]) * root;
            z = (matrix[Matrix3.COLUMN0ROW1] - matrix[Matrix3.COLUMN1ROW0]) * root;
        } else {
            // |w| <= 1/2
            var next = fromRotationMatrixNext;

            var i = 0;
            if (m11 > m00) {
                i = 1;
            }
            if (m22 > m00 && m22 > m11) {
                i = 2;
            }
            var j = next[i];
            var k = next[j];

            root = Math.sqrt(matrix[Matrix3.getElementIndex(i, i)] - matrix[Matrix3.getElementIndex(j, j)] - matrix[Matrix3.getElementIndex(k, k)] + 1.0);

            var quat = fromRotationMatrixQuat;
            quat[i] = 0.5 * root;
            root = 0.5 / root;
            w = (matrix[Matrix3.getElementIndex(k, j)] - matrix[Matrix3.getElementIndex(j, k)]) * root;
            quat[j] = (matrix[Matrix3.getElementIndex(j, i)] + matrix[Matrix3.getElementIndex(i, j)]) * root;
            quat[k] = (matrix[Matrix3.getElementIndex(k, i)] + matrix[Matrix3.getElementIndex(i, k)]) * root;

            x = -quat[0];
            y = -quat[1];
            z = -quat[2];
        }

        if (!defined(result)) {
            return new Quaternion(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    var scratchHPRQuaternion = new Quaternion();

    /**
     * Computes a rotation from the given heading, pitch and roll angles. Heading is the rotation about the
     * negative z axis. Pitch is the rotation about the negative y axis. Roll is the rotation about
     * the positive x axis.
     *
     * @param {Number} heading The heading angle in radians.
     * @param {Number} pitch The pitch angle in radians.
     * @param {Number} roll The roll angle in radians.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter or a new Quaternion instance if none was provided.
     */
    Quaternion.fromHeadingPitchRoll = function(heading, pitch, roll, result) {
                if (!defined(heading)) {
            throw new DeveloperError('heading is required.');
        }
        if (!defined(pitch)) {
            throw new DeveloperError('pitch is required.');
        }
        if (!defined(roll)) {
            throw new DeveloperError('roll is required.');
        }
        
        var rollQuaternion = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, roll, scratchHPRQuaternion);
        var pitchQuaternion = Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, -pitch, result);
        result = Quaternion.multiply(pitchQuaternion, rollQuaternion, pitchQuaternion);
        var headingQuaternion = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, -heading, scratchHPRQuaternion);
        return Quaternion.multiply(headingQuaternion, result, result);
    };

    var sampledQuaternionAxis = new Cartesian3();
    var sampledQuaternionRotation = new Cartesian3();
    var sampledQuaternionTempQuaternion = new Quaternion();
    var sampledQuaternionQuaternion0 = new Quaternion();
    var sampledQuaternionQuaternion0Conjugate = new Quaternion();

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Quaternion.packedLength = 4;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {Quaternion} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Quaternion.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }

        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.x;
        array[startingIndex++] = value.y;
        array[startingIndex++] = value.z;
        array[startingIndex] = value.w;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Quaternion} [result] The object into which to store the result.
     */
    Quaternion.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new Quaternion();
        }
        result.x = array[startingIndex];
        result.y = array[startingIndex + 1];
        result.z = array[startingIndex + 2];
        result.w = array[startingIndex + 3];
        return result;
    };

    /**
     * The number of elements used to store the object into an array in its interpolatable form.
     * @type {Number}
     */
    Quaternion.packedInterpolationLength = 3;

    /**
     * Converts a packed array into a form suitable for interpolation.
     *
     * @param {Number[]} packedArray The packed array.
     * @param {Number} [startingIndex=0] The index of the first element to be converted.
     * @param {Number} [lastIndex=packedArray.length] The index of the last element to be converted.
     * @param {Number[]} [result] The object into which to store the result.
     */
    Quaternion.convertPackedArrayForInterpolation = function(packedArray, startingIndex, lastIndex, result) {
        Quaternion.unpack(packedArray, lastIndex * 4, sampledQuaternionQuaternion0Conjugate);
        Quaternion.conjugate(sampledQuaternionQuaternion0Conjugate, sampledQuaternionQuaternion0Conjugate);

        for (var i = 0, len = lastIndex - startingIndex + 1; i < len; i++) {
            var offset = i * 3;
            Quaternion.unpack(packedArray, (startingIndex + i) * 4, sampledQuaternionTempQuaternion);

            Quaternion.multiply(sampledQuaternionTempQuaternion, sampledQuaternionQuaternion0Conjugate, sampledQuaternionTempQuaternion);

            if (sampledQuaternionTempQuaternion.w < 0) {
                Quaternion.negate(sampledQuaternionTempQuaternion, sampledQuaternionTempQuaternion);
            }

            Quaternion.computeAxis(sampledQuaternionTempQuaternion, sampledQuaternionAxis);
            var angle = Quaternion.computeAngle(sampledQuaternionTempQuaternion);
            result[offset] = sampledQuaternionAxis.x * angle;
            result[offset + 1] = sampledQuaternionAxis.y * angle;
            result[offset + 2] = sampledQuaternionAxis.z * angle;
        }
    };

    /**
     * Retrieves an instance from a packed array converted with {@link convertPackedArrayForInterpolation}.
     *
     * @param {Number[]} array The original packed array.
     * @param {Number[]} sourceArray The converted array.
     * @param {Number} [startingIndex=0] The startingIndex used to convert the array.
     * @param {Number} [lastIndex=packedArray.length] The lastIndex used to convert the array.
     * @param {Quaternion} [result] The object into which to store the result.
     */
    Quaternion.unpackInterpolationResult = function(array, sourceArray, firstIndex, lastIndex, result) {
        if (!defined(result)) {
            result = new Quaternion();
        }
        Cartesian3.fromArray(array, 0, sampledQuaternionRotation);
        var magnitude = Cartesian3.magnitude(sampledQuaternionRotation);

        Quaternion.unpack(sourceArray, lastIndex * 4, sampledQuaternionQuaternion0);

        if (magnitude === 0) {
            Quaternion.clone(Quaternion.IDENTITY, sampledQuaternionTempQuaternion);
        } else {
            Quaternion.fromAxisAngle(sampledQuaternionRotation, magnitude, sampledQuaternionTempQuaternion);
        }

        return Quaternion.multiply(sampledQuaternionTempQuaternion, sampledQuaternionQuaternion0, result);
    };

    /**
     * Duplicates a Quaternion instance.
     *
     * @param {Quaternion} quaternion The quaternion to duplicate.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided. (Returns undefined if quaternion is undefined)
     */
    Quaternion.clone = function(quaternion, result) {
        if (!defined(quaternion)) {
            return undefined;
        }

        if (!defined(result)) {
            return new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }

        result.x = quaternion.x;
        result.y = quaternion.y;
        result.z = quaternion.z;
        result.w = quaternion.w;
        return result;
    };

    /**
     * Computes the conjugate of the provided quaternion.
     *
     * @param {Quaternion} quaternion The quaternion to conjugate.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.conjugate = function(quaternion, result) {
                if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = -quaternion.x;
        result.y = -quaternion.y;
        result.z = -quaternion.z;
        result.w = quaternion.w;
        return result;
    };

    /**
     * Computes magnitude squared for the provided quaternion.
     *
     * @param {Quaternion} quaternion The quaternion to conjugate.
     * @returns {Number} The magnitude squared.
     */
    Quaternion.magnitudeSquared = function(quaternion) {
                if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        
        return quaternion.x * quaternion.x + quaternion.y * quaternion.y + quaternion.z * quaternion.z + quaternion.w * quaternion.w;
    };

    /**
     * Computes magnitude for the provided quaternion.
     *
     * @param {Quaternion} quaternion The quaternion to conjugate.
     * @returns {Number} The magnitude.
     */
    Quaternion.magnitude = function(quaternion) {
        return Math.sqrt(Quaternion.magnitudeSquared(quaternion));
    };

    /**
     * Computes the normalized form of the provided quaternion.
     *
     * @param {Quaternion} quaternion The quaternion to normalize.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.normalize = function(quaternion, result) {
                if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var inverseMagnitude = 1.0 / Quaternion.magnitude(quaternion);
        var x = quaternion.x * inverseMagnitude;
        var y = quaternion.y * inverseMagnitude;
        var z = quaternion.z * inverseMagnitude;
        var w = quaternion.w * inverseMagnitude;

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes the inverse of the provided quaternion.
     *
     * @param {Quaternion} quaternion The quaternion to normalize.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.inverse = function(quaternion, result) {
                if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
        result = Quaternion.conjugate(quaternion, result);
        return Quaternion.multiplyByScalar(result, 1.0 / magnitudeSquared, result);
    };

    /**
     * Computes the componentwise sum of two quaternions.
     *
     * @param {Quaternion} left The first quaternion.
     * @param {Quaternion} right The second quaternion.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.add = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x + right.x;
        result.y = left.y + right.y;
        result.z = left.z + right.z;
        result.w = left.w + right.w;
        return result;
    };

    /**
     * Computes the componentwise difference of two quaternions.
     *
     * @param {Quaternion} left The first quaternion.
     * @param {Quaternion} right The second quaternion.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.subtract = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = left.x - right.x;
        result.y = left.y - right.y;
        result.z = left.z - right.z;
        result.w = left.w - right.w;
        return result;
    };

    /**
     * Negates the provided quaternion.
     *
     * @param {Quaternion} quaternion The quaternion to be negated.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.negate = function(quaternion, result) {
                if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = -quaternion.x;
        result.y = -quaternion.y;
        result.z = -quaternion.z;
        result.w = -quaternion.w;
        return result;
    };

    /**
     * Computes the dot (scalar) product of two quaternions.
     *
     * @param {Quaternion} left The first quaternion.
     * @param {Quaternion} right The second quaternion.
     * @returns {Number} The dot product.
     */
    Quaternion.dot = function(left, right) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        
        return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
    };

    /**
     * Computes the product of two quaternions.
     *
     * @param {Quaternion} left The first quaternion.
     * @param {Quaternion} right The second quaternion.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.multiply = function(left, right, result) {
                if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var leftX = left.x;
        var leftY = left.y;
        var leftZ = left.z;
        var leftW = left.w;

        var rightX = right.x;
        var rightY = right.y;
        var rightZ = right.z;
        var rightW = right.w;

        var x = leftW * rightX + leftX * rightW + leftY * rightZ - leftZ * rightY;
        var y = leftW * rightY - leftX * rightZ + leftY * rightW + leftZ * rightX;
        var z = leftW * rightZ + leftX * rightY - leftY * rightX + leftZ * rightW;
        var w = leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ;

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Multiplies the provided quaternion componentwise by the provided scalar.
     *
     * @param {Quaternion} quaternion The quaternion to be scaled.
     * @param {Number} scalar The scalar to multiply with.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.multiplyByScalar = function(quaternion, scalar, result) {
                if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = quaternion.x * scalar;
        result.y = quaternion.y * scalar;
        result.z = quaternion.z * scalar;
        result.w = quaternion.w * scalar;
        return result;
    };

    /**
     * Divides the provided quaternion componentwise by the provided scalar.
     *
     * @param {Quaternion} quaternion The quaternion to be divided.
     * @param {Number} scalar The scalar to divide by.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.divideByScalar = function(quaternion, scalar, result) {
                if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        result.x = quaternion.x / scalar;
        result.y = quaternion.y / scalar;
        result.z = quaternion.z / scalar;
        result.w = quaternion.w / scalar;
        return result;
    };

    /**
     * Computes the axis of rotation of the provided quaternion.
     *
     * @param {Quaternion} quaternion The quaternion to use.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Quaternion.computeAxis = function(quaternion, result) {
                if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var w = quaternion.w;
        if (Math.abs(w - 1.0) < CesiumMath.EPSILON6) {
            result.x = result.y = result.z = 0;
            return result;
        }

        var scalar = 1.0 / Math.sqrt(1.0 - (w * w));

        result.x = quaternion.x * scalar;
        result.y = quaternion.y * scalar;
        result.z = quaternion.z * scalar;
        return result;
    };

    /**
     * Computes the angle of rotation of the provided quaternion.
     *
     * @param {Quaternion} quaternion The quaternion to use.
     * @returns {Number} The angle of rotation.
     */
    Quaternion.computeAngle = function(quaternion) {
                if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        
        if (Math.abs(quaternion.w - 1.0) < CesiumMath.EPSILON6) {
            return 0.0;
        }
        return 2.0 * Math.acos(quaternion.w);
    };

    var lerpScratch = new Quaternion();
    /**
     * Computes the linear interpolation or extrapolation at t using the provided quaternions.
     *
     * @param {Quaternion} start The value corresponding to t at 0.0.
     * @param {Quaternion} end The value corresponding to t at 1.0.
     * @param {Number} t The point along t at which to interpolate.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.lerp = function(start, end, t, result) {
                if (!defined(start)) {
            throw new DeveloperError('start is required.');
        }
        if (!defined(end)) {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        lerpScratch = Quaternion.multiplyByScalar(end, t, lerpScratch);
        result = Quaternion.multiplyByScalar(start, 1.0 - t, result);
        return Quaternion.add(lerpScratch, result, result);
    };

    var slerpEndNegated = new Quaternion();
    var slerpScaledP = new Quaternion();
    var slerpScaledR = new Quaternion();
    /**
     * Computes the spherical linear interpolation or extrapolation at t using the provided quaternions.
     *
     * @param {Quaternion} start The value corresponding to t at 0.0.
     * @param {Quaternion} end The value corresponding to t at 1.0.
     * @param {Number} t The point along t at which to interpolate.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     *
     * @see Quaternion#fastSlerp
     */
    Quaternion.slerp = function(start, end, t, result) {
                if (!defined(start)) {
            throw new DeveloperError('start is required.');
        }
        if (!defined(end)) {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var dot = Quaternion.dot(start, end);

        // The angle between start must be acute. Since q and -q represent
        // the same rotation, negate q to get the acute angle.
        var r = end;
        if (dot < 0.0) {
            dot = -dot;
            r = slerpEndNegated = Quaternion.negate(end, slerpEndNegated);
        }

        // dot > 0, as the dot product approaches 1, the angle between the
        // quaternions vanishes. use linear interpolation.
        if (1.0 - dot < CesiumMath.EPSILON6) {
            return Quaternion.lerp(start, r, t, result);
        }

        var theta = Math.acos(dot);
        slerpScaledP = Quaternion.multiplyByScalar(start, Math.sin((1 - t) * theta), slerpScaledP);
        slerpScaledR = Quaternion.multiplyByScalar(r, Math.sin(t * theta), slerpScaledR);
        result = Quaternion.add(slerpScaledP, slerpScaledR, result);
        return Quaternion.multiplyByScalar(result, 1.0 / Math.sin(theta), result);
    };

    /**
     * The logarithmic quaternion function.
     *
     * @param {Quaternion} quaternion The unit quaternion.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    Quaternion.log = function(quaternion, result) {
                if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var theta = CesiumMath.acosClamped(quaternion.w);
        var thetaOverSinTheta = 0.0;

        if (theta !== 0.0) {
            thetaOverSinTheta = theta / Math.sin(theta);
        }

        return Cartesian3.multiplyByScalar(quaternion, thetaOverSinTheta, result);
    };

    /**
     * The exponential quaternion function.
     *
     * @param {Cartesian3} cartesian The cartesian.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     */
    Quaternion.exp = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var theta = Cartesian3.magnitude(cartesian);
        var sinThetaOverTheta = 0.0;

        if (theta !== 0.0) {
            sinThetaOverTheta = Math.sin(theta) / theta;
        }

        result.x = cartesian.x * sinThetaOverTheta;
        result.y = cartesian.y * sinThetaOverTheta;
        result.z = cartesian.z * sinThetaOverTheta;
        result.w = Math.cos(theta);

        return result;
    };

    var squadScratchCartesian0 = new Cartesian3();
    var squadScratchCartesian1 = new Cartesian3();
    var squadScratchQuaternion0 = new Quaternion();
    var squadScratchQuaternion1 = new Quaternion();

    /**
     * Computes an inner quadrangle point.
     * <p>This will compute quaternions that ensure a squad curve is C<sup>1</sup>.</p>
     *
     * @param {Quaternion} q0 The first quaternion.
     * @param {Quaternion} q1 The second quaternion.
     * @param {Quaternion} q2 The third quaternion.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     *
     * @see Quaternion#squad
     */
    Quaternion.computeInnerQuadrangle = function(q0, q1, q2, result) {
                if (!defined(q0) || !defined(q1) || !defined(q2)) {
            throw new DeveloperError('q0, q1, and q2 are required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var qInv = Quaternion.conjugate(q1, squadScratchQuaternion0);
        Quaternion.multiply(qInv, q2, squadScratchQuaternion1);
        var cart0 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian0);

        Quaternion.multiply(qInv, q0, squadScratchQuaternion1);
        var cart1 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian1);

        Cartesian3.add(cart0, cart1, cart0);
        Cartesian3.multiplyByScalar(cart0, 0.25, cart0);
        Cartesian3.negate(cart0, cart0);
        Quaternion.exp(cart0, squadScratchQuaternion0);

        return Quaternion.multiply(q1, squadScratchQuaternion0, result);
    };

    /**
     * Computes the spherical quadrangle interpolation between quaternions.
     *
     * @param {Quaternion} q0 The first quaternion.
     * @param {Quaternion} q1 The second quaternion.
     * @param {Quaternion} s0 The first inner quadrangle.
     * @param {Quaternion} s1 The second inner quadrangle.
     * @param {Number} t The time in [0,1] used to interpolate.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     *
     * @see Quaternion#computeInnerQuadrangle
     *
     * @example
     * // 1. compute the squad interpolation between two quaternions on a curve
     * var s0 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[i - 1], quaternions[i], quaternions[i + 1]);
     * var s1 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[i], quaternions[i + 1], quaternions[i + 2]);
     * var q = Cesium.Quaternion.squad(quaternions[i], quaternions[i + 1], s0, s1, t);
     *
     * // 2. compute the squad interpolation as above but where the first quaternion is a end point.
     * var s1 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[0], quaternions[1], quaternions[2]);
     * var q = Cesium.Quaternion.squad(quaternions[0], quaternions[1], quaternions[0], s1, t);
     */
    Quaternion.squad = function(q0, q1, s0, s1, t, result) {
                if (!defined(q0) || !defined(q1) || !defined(s0) || !defined(s1)) {
            throw new DeveloperError('q0, q1, s0, and s1 are required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var slerp0 = Quaternion.slerp(q0, q1, t, squadScratchQuaternion0);
        var slerp1 = Quaternion.slerp(s0, s1, t, squadScratchQuaternion1);
        return Quaternion.slerp(slerp0, slerp1, 2.0 * t * (1.0 - t), result);
    };

    var fastSlerpScratchQuaternion = new Quaternion();
    var opmu = 1.90110745351730037;
    var u = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];
    var v = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];
    var bT = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];
    var bD = FeatureDetection.supportsTypedArrays() ? new Float32Array(8) : [];

    for (var i = 0; i < 7; ++i) {
        var s = i + 1.0;
        var t = 2.0 * s + 1.0;
        u[i] = 1.0 / (s * t);
        v[i] = s / t;
    }

    u[7] = opmu / (8.0 * 17.0);
    v[7] = opmu * 8.0 / 17.0;

    /**
     * Computes the spherical linear interpolation or extrapolation at t using the provided quaternions.
     * This implementation is faster than {@link Quaternion#slerp}, but is only accurate up to 10<sup>-6</sup>.
     *
     * @param {Quaternion} start The value corresponding to t at 0.0.
     * @param {Quaternion} end The value corresponding to t at 1.0.
     * @param {Number} t The point along t at which to interpolate.
     * @param {Quaternion} result The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter.
     *
     * @see Quaternion#slerp
     */
    Quaternion.fastSlerp = function(start, end, t, result) {
                if (!defined(start)) {
            throw new DeveloperError('start is required.');
        }
        if (!defined(end)) {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var x = Quaternion.dot(start, end);

        var sign;
        if (x >= 0) {
            sign = 1.0;
        } else {
            sign = -1.0;
            x = -x;
        }

        var xm1 = x - 1.0;
        var d = 1.0 - t;
        var sqrT = t * t;
        var sqrD = d * d;

        for (var i = 7; i >= 0; --i) {
            bT[i] = (u[i] * sqrT - v[i]) * xm1;
            bD[i] = (u[i] * sqrD - v[i]) * xm1;
        }

        var cT = sign * t * (
            1.0 + bT[0] * (1.0 + bT[1] * (1.0 + bT[2] * (1.0 + bT[3] * (
            1.0 + bT[4] * (1.0 + bT[5] * (1.0 + bT[6] * (1.0 + bT[7]))))))));
        var cD = d * (
            1.0 + bD[0] * (1.0 + bD[1] * (1.0 + bD[2] * (1.0 + bD[3] * (
            1.0 + bD[4] * (1.0 + bD[5] * (1.0 + bD[6] * (1.0 + bD[7]))))))));

        var temp = Quaternion.multiplyByScalar(start, cD, fastSlerpScratchQuaternion);
        Quaternion.multiplyByScalar(end, cT, result);
        return Quaternion.add(temp, result, result);
    };

    /**
     * Computes the spherical quadrangle interpolation between quaternions.
     * An implementation that is faster than {@link Quaternion#squad}, but less accurate.
     *
     * @param {Quaternion} q0 The first quaternion.
     * @param {Quaternion} q1 The second quaternion.
     * @param {Quaternion} s0 The first inner quadrangle.
     * @param {Quaternion} s1 The second inner quadrangle.
     * @param {Number} t The time in [0,1] used to interpolate.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter or a new instance if none was provided.
     *
     * @see Quaternion#squad
     */
    Quaternion.fastSquad = function(q0, q1, s0, s1, t, result) {
                if (!defined(q0) || !defined(q1) || !defined(s0) || !defined(s1)) {
            throw new DeveloperError('q0, q1, s0, and s1 are required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required');
        }
        
        var slerp0 = Quaternion.fastSlerp(q0, q1, t, squadScratchQuaternion0);
        var slerp1 = Quaternion.fastSlerp(s0, s1, t, squadScratchQuaternion1);
        return Quaternion.fastSlerp(slerp0, slerp1, 2.0 * t * (1.0 - t), result);
    };

    /**
     * Compares the provided quaternions componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Quaternion} [left] The first quaternion.
     * @param {Quaternion} [right] The second quaternion.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Quaternion.equals = function(left, right) {
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                (left.x === right.x) &&
                (left.y === right.y) &&
                (left.z === right.z) &&
                (left.w === right.w));
    };

    /**
     * Compares the provided quaternions componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {Quaternion} [left] The first quaternion.
     * @param {Quaternion} [right] The second quaternion.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    Quaternion.equalsEpsilon = function(left, right, epsilon) {
                if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number.');
        }
        
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                (Math.abs(left.x - right.x) <= epsilon) &&
                (Math.abs(left.y - right.y) <= epsilon) &&
                (Math.abs(left.z - right.z) <= epsilon) &&
                (Math.abs(left.w - right.w) <= epsilon));
    };

    /**
     * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 0.0).
     *
     * @type {Quaternion}
     * @constant
     */
    Quaternion.ZERO = freezeObject(new Quaternion(0.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 1.0).
     *
     * @type {Quaternion}
     * @constant
     */
    Quaternion.IDENTITY = freezeObject(new Quaternion(0.0, 0.0, 0.0, 1.0));

    /**
     * Duplicates this Quaternion instance.
     *
     * @param {Quaternion} [result] The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     */
    Quaternion.prototype.clone = function(result) {
        return Quaternion.clone(this, result);
    };

    /**
     * Compares this and the provided quaternion componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Quaternion} [right] The right hand side quaternion.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Quaternion.prototype.equals = function(right) {
        return Quaternion.equals(this, right);
    };

    /**
     * Compares this and the provided quaternion componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     *
     * @param {Quaternion} [right] The right hand side quaternion.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     */
    Quaternion.prototype.equalsEpsilon = function(right, epsilon) {
        return Quaternion.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Returns a string representing this quaternion in the format (x, y, z, w).
     *
     * @returns {String} A string representing this Quaternion.
     */
    Quaternion.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
    };

    return Quaternion;
});
/*global define*/
define('Core/EllipseGeometryLibrary',[
        './Cartesian3',
        './Math',
        './Matrix3',
        './Quaternion'
    ], function(
        Cartesian3,
        CesiumMath,
        Matrix3,
        Quaternion) {
    "use strict";

    var EllipseGeometryLibrary = {};

    var rotAxis = new Cartesian3();
    var tempVec = new Cartesian3();
    var unitQuat = new Quaternion();
    var rotMtx = new Matrix3();

    function pointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, result) {
        var azimuth = theta + rotation;

        Cartesian3.multiplyByScalar(eastVec, Math.cos(azimuth), rotAxis);
        Cartesian3.multiplyByScalar(northVec, Math.sin(azimuth), tempVec);
        Cartesian3.add(rotAxis, tempVec, rotAxis);

        var cosThetaSquared = Math.cos(theta);
        cosThetaSquared = cosThetaSquared * cosThetaSquared;

        var sinThetaSquared = Math.sin(theta);
        sinThetaSquared = sinThetaSquared * sinThetaSquared;

        var radius = ab / Math.sqrt(bSqr * cosThetaSquared + aSqr * sinThetaSquared);
        var angle = radius / mag;

        // Create the quaternion to rotate the position vector to the boundary of the ellipse.
        Quaternion.fromAxisAngle(rotAxis, angle, unitQuat);
        Matrix3.fromQuaternion(unitQuat, rotMtx);

        Matrix3.multiplyByVector(rotMtx, unitPos, result);
        Cartesian3.normalize(result, result);
        Cartesian3.multiplyByScalar(result, mag, result);
        return result;
    }

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchNormal = new Cartesian3();
    /**
     * Returns the positions raised to the given heights
     * @private
     */
    EllipseGeometryLibrary.raisePositionsToHeight = function(positions, options, extrude) {
        var ellipsoid = options.ellipsoid;
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var size = (extrude) ? positions.length / 3 * 2 : positions.length / 3;

        var finalPositions = new Float64Array(size * 3);

        var length = positions.length;
        var bottomOffset = (extrude) ? length : 0;
        for (var i = 0; i < length; i += 3) {
            var i1 = i + 1;
            var i2 = i + 2;

            var position = Cartesian3.fromArray(positions, i, scratchCartesian1);
            ellipsoid.scaleToGeodeticSurface(position, position);

            var extrudedPosition = Cartesian3.clone(position, scratchCartesian2);
            var normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
            var scaledNormal = Cartesian3.multiplyByScalar(normal, height, scratchCartesian3);
            Cartesian3.add(position, scaledNormal, position);

            if (extrude) {
                Cartesian3.multiplyByScalar(normal, extrudedHeight, scaledNormal);
                Cartesian3.add(extrudedPosition, scaledNormal, extrudedPosition);

                finalPositions[i + bottomOffset] = extrudedPosition.x;
                finalPositions[i1 + bottomOffset] = extrudedPosition.y;
                finalPositions[i2 + bottomOffset] = extrudedPosition.z;
            }

            finalPositions[i] = position.x;
            finalPositions[i1] = position.y;
            finalPositions[i2] = position.z;
        }

        return finalPositions;
    };

    var unitPosScratch = new Cartesian3();
    var eastVecScratch = new Cartesian3();
    var northVecScratch = new Cartesian3();
    /**
     * Returns an array of positions that make up the ellipse.
     * @private
     */
    EllipseGeometryLibrary.computeEllipsePositions = function(options, addFillPositions, addEdgePositions) {
        var semiMinorAxis = options.semiMinorAxis;
        var semiMajorAxis = options.semiMajorAxis;
        var rotation = options.rotation;
        var center = options.center;

        // Computing the arc-length of the ellipse is too expensive to be practical. Estimating it using the
        // arc length of the sphere is too inaccurate and creates sharp edges when either the semi-major or
        // semi-minor axis is much bigger than the other. Instead, scale the angle delta to make
        // the distance along the ellipse boundary more closely match the granularity.
        var granularity = options.granularity * 8.0;

        var aSqr = semiMinorAxis * semiMinorAxis;
        var bSqr = semiMajorAxis * semiMajorAxis;
        var ab = semiMajorAxis * semiMinorAxis;

        var mag = Cartesian3.magnitude(center);

        var unitPos = Cartesian3.normalize(center, unitPosScratch);
        var eastVec = Cartesian3.cross(Cartesian3.UNIT_Z, center, eastVecScratch);
        eastVec = Cartesian3.normalize(eastVec, eastVec);
        var northVec = Cartesian3.cross(unitPos, eastVec, northVecScratch);

        // The number of points in the first quadrant
        var numPts = 1 + Math.ceil(CesiumMath.PI_OVER_TWO / granularity);
        var deltaTheta = CesiumMath.PI_OVER_TWO / (numPts - 1);
        var theta = CesiumMath.PI_OVER_TWO - numPts * deltaTheta;
        if (theta < 0.0) {
            numPts -= Math.ceil(Math.abs(theta) / deltaTheta);
        }

        // If the number of points were three, the ellipse
        // would be tessellated like below:
        //
        //         *---*
        //       / | \ | \
        //     *---*---*---*
        //   / | \ | \ | \ | \
        // *---*---*---*---*---*
        // | \ | \ | \ | \ | \ |
        // *---*---*---*---*---*
        //   \ | \ | \ | \ | /
        //     *---*---*---*
        //       \ | \ | /
        //         *---*
        // Notice each vertical column contains an even number of positions.
        // The sum of the first n even numbers is n * (n + 1). Double it for the number of points
        // for the whole ellipse.
        var size = 2 * numPts * (numPts + 1);
        var positions = (addFillPositions) ? new Array(size * 3) : undefined;
        var positionIndex = 0;
        var position = scratchCartesian1;
        var reflectedPosition = scratchCartesian2;

        var outerPositionsLength = (2 * numPts + 2 * (numPts - 1)) * 3;
        var outerRightIndex = outerPositionsLength - 1;
        var outerLeftIndex = 0;
        var outerPositions = (addEdgePositions) ? new Array(outerPositionsLength) : undefined;

        var i;
        var j;
        var numInterior;
        var t;
        var interiorPosition;

        // Compute points in the 'northern' half of the ellipse
        theta = CesiumMath.PI_OVER_TWO;
        for (i = 0; i < numPts; ++i) {
            position = pointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);
            reflectedPosition = pointOnEllipsoid(Math.PI - theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, reflectedPosition);

            if (addFillPositions) {
                positions[positionIndex++] = position.x;
                positions[positionIndex++] = position.y;
                positions[positionIndex++] = position.z;

                numInterior = 2 * i + 2;
                for (j = 1; j < numInterior - 1; ++j) {
                    t = j / (numInterior - 1);
                    interiorPosition = Cartesian3.lerp(position, reflectedPosition, t, scratchCartesian3);
                    positions[positionIndex++] = interiorPosition.x;
                    positions[positionIndex++] = interiorPosition.y;
                    positions[positionIndex++] = interiorPosition.z;
                }

                positions[positionIndex++] = reflectedPosition.x;
                positions[positionIndex++] = reflectedPosition.y;
                positions[positionIndex++] = reflectedPosition.z;
            }

            if (addEdgePositions) {
                outerPositions[outerRightIndex--] = position.z;
                outerPositions[outerRightIndex--] = position.y;
                outerPositions[outerRightIndex--] = position.x;
                if (i !== 0) {
                    outerPositions[outerLeftIndex++] = reflectedPosition.x;
                    outerPositions[outerLeftIndex++] = reflectedPosition.y;
                    outerPositions[outerLeftIndex++] = reflectedPosition.z;
                }
            }

            theta = CesiumMath.PI_OVER_TWO - (i + 1) * deltaTheta;
        }

        // Compute points in the 'southern' half of the ellipse
        for (i = numPts; i > 0; --i) {
            theta = CesiumMath.PI_OVER_TWO - (i - 1) * deltaTheta;

            position = pointOnEllipsoid(-theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);
            reflectedPosition = pointOnEllipsoid(theta + Math.PI, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, reflectedPosition);

            if (addFillPositions) {
                positions[positionIndex++] = position.x;
                positions[positionIndex++] = position.y;
                positions[positionIndex++] = position.z;

                numInterior = 2 * (i - 1) + 2;
                for (j = 1; j < numInterior - 1; ++j) {
                    t = j / (numInterior - 1);
                    interiorPosition = Cartesian3.lerp(position, reflectedPosition, t, scratchCartesian3);
                    positions[positionIndex++] = interiorPosition.x;
                    positions[positionIndex++] = interiorPosition.y;
                    positions[positionIndex++] = interiorPosition.z;
                }

                positions[positionIndex++] = reflectedPosition.x;
                positions[positionIndex++] = reflectedPosition.y;
                positions[positionIndex++] = reflectedPosition.z;
            }

            if (addEdgePositions) {
                outerPositions[outerRightIndex--] = position.z;
                outerPositions[outerRightIndex--] = position.y;
                outerPositions[outerRightIndex--] = position.x;
                if (i !== 1) {
                    outerPositions[outerLeftIndex++] = reflectedPosition.x;
                    outerPositions[outerLeftIndex++] = reflectedPosition.y;
                    outerPositions[outerLeftIndex++] = reflectedPosition.z;
                }
            }
        }

        var r = {};
        if (addFillPositions) {
            r.positions = positions;
            r.numPts = numPts;
        }

        if (addEdgePositions) {
            r.outerPositions = outerPositions;
        }

        return r;
    };

    return EllipseGeometryLibrary;
});

/*global define*/
define('Core/GeometryType',[
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var GeometryType = {
        NONE : 0,
        TRIANGLES : 1,
        LINES : 2,
        POLYLINES : 3
    };

    return freezeObject(GeometryType);
});

/*global define*/
define('Core/PrimitiveType',[
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * The type of a geometric primitive, i.e., points, lines, and triangles.
     *
     * @namespace
     * @alias PrimitiveType
     */
    var PrimitiveType = {
        /**
         * 0x0000.  Points primitive where each vertex (or index) is a separate point.
         *
         * @type {Number}
         * @constant
         */
        POINTS : 0x0000,

        /**
         * 0x0001.  Lines primitive where each two vertices (or indices) is a line segment.  Line segments are not necessarily connected.
         *
         * @type {Number}
         * @constant
         */
        LINES : 0x0001,

        /**
         * 0x0002.  Line loop primitive where each vertex (or index) after the first connects a line to
         * the previous vertex, and the last vertex implicitly connects to the first.
         *
         * @type {Number}
         * @constant
         */
        LINE_LOOP : 0x0002,

        /**
         * 0x0003.  Line strip primitive where each vertex (or index) after the first connects a line to the previous vertex.
         *
         * @type {Number}
         * @constant
         */
        LINE_STRIP : 0x0003,

        /**
         * 0x0004.  Triangles primitive where each three vertices (or indices) is a triangle.  Triangles do not necessarily share edges.
         *
         * @type {Number}
         * @constant
         */
        TRIANGLES : 0x0004,

        /**
         * 0x0005.  Triangle strip primitive where each vertex (or index) after the first two connect to
         * the previous two vertices forming a triangle.  For example, this can be used to model a wall.
         *
         * @type {Number}
         * @constant
         */
        TRIANGLE_STRIP : 0x0005,

        /**
         * 0x0006.  Triangle fan primitive where each vertex (or index) after the first two connect to
         * the previous vertex and the first vertex forming a triangle.  For example, this can be used
         * to model a cone or circle.
         *
         * @type {Number}
         * @constant
         */
        TRIANGLE_FAN : 0x0006,

        /**
         * @private
         */
        validate : function(primitiveType) {
            return primitiveType === PrimitiveType.POINTS ||
                   primitiveType === PrimitiveType.LINES ||
                   primitiveType === PrimitiveType.LINE_LOOP ||
                   primitiveType === PrimitiveType.LINE_STRIP ||
                   primitiveType === PrimitiveType.TRIANGLES ||
                   primitiveType === PrimitiveType.TRIANGLE_STRIP ||
                   primitiveType === PrimitiveType.TRIANGLE_FAN;
        }
    };

    return freezeObject(PrimitiveType);
});

/*global define*/
define('Core/Geometry',[
        './defaultValue',
        './defined',
        './DeveloperError',
        './GeometryType',
        './PrimitiveType'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        GeometryType,
        PrimitiveType) {
    "use strict";

    /**
     * A geometry representation with attributes forming vertices and optional index data
     * defining primitives.  Geometries and an {@link Appearance}, which describes the shading,
     * can be assigned to a {@link Primitive} for visualization.  A <code>Primitive</code> can
     * be created from many heterogeneous - in many cases - geometries for performance.
     * <p>
     * Geometries can be transformed and optimized using functions in {@link GeometryPipeline}.
     * </p>
     *
     * @alias Geometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {GeometryAttributes} options.attributes Attributes, which make up the geometry's vertices.
     * @param {PrimitiveType} [options.primitiveType=PrimitiveType.TRIANGLES] The type of primitives in the geometry.
     * @param {Uint16Array|Uint32Array} [options.indices] Optional index data that determines the primitives in the geometry.
     * @param {BoundingSphere} [options.boundingSphere] An optional bounding sphere that fully enclosed the geometry.
     *
     * @see PolygonGeometry
     * @see RectangleGeometry
     * @see EllipseGeometry
     * @see CircleGeometry
     * @see WallGeometry
     * @see SimplePolylineGeometry
     * @see BoxGeometry
     * @see EllipsoidGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Geometry%20and%20Appearances.html|Geometry and Appearances Demo}
     *
     * @example
     * // Create geometry with a position attribute and indexed lines.
     * var positions = new Float64Array([
     *   0.0, 0.0, 0.0,
     *   7500000.0, 0.0, 0.0,
     *   0.0, 7500000.0, 0.0
     * ]);
     *
     * var geometry = new Cesium.Geometry({
     *   attributes : {
     *     position : new Cesium.GeometryAttribute({
     *       componentDatatype : Cesium.ComponentDatatype.DOUBLE,
     *       componentsPerAttribute : 3,
     *       values : positions
     *     })
     *   },
     *   indices : new Uint16Array([0, 1, 1, 2, 2, 0]),
     *   primitiveType : Cesium.PrimitiveType.LINES,
     *   boundingSphere : Cesium.BoundingSphere.fromVertices(positions)
     * });
     */
    var Geometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

                if (!defined(options.attributes)) {
            throw new DeveloperError('options.attributes is required.');
        }
        
        /**
         * Attributes, which make up the geometry's vertices.  Each property in this object corresponds to a
         * {@link GeometryAttribute} containing the attribute's data.
         * <p>
         * Attributes are always stored non-interleaved in a Geometry.
         * </p>
         * <p>
         * There are reserved attribute names with well-known semantics.  The following attributes
         * are created by a Geometry (depending on the provided {@link VertexFormat}.
         * <ul>
         *    <li><code>position</code> - 3D vertex position.  64-bit floating-point (for precision).  3 components per attribute.  See {@link VertexFormat#position}.</li>
         *    <li><code>normal</code> - Normal (normalized), commonly used for lighting.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat#normal}.</li>
         *    <li><code>st</code> - 2D texture coordinate.  32-bit floating-point.  2 components per attribute.  See {@link VertexFormat#st}.</li>
         *    <li><code>binormal</code> - Binormal (normalized), used for tangent-space effects like bump mapping.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat#binormal}.</li>
         *    <li><code>tangent</code> - Tangent (normalized), used for tangent-space effects like bump mapping.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat#tangent}.</li>
         * </ul>
         * </p>
         * <p>
         * The following attribute names are generally not created by a Geometry, but are added
         * to a Geometry by a {@link Primitive} or {@link GeometryPipeline} functions to prepare
         * the geometry for rendering.
         * <ul>
         *    <li><code>position3DHigh</code> - High 32 bits for encoded 64-bit position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>position3DLow</code> - Low 32 bits for encoded 64-bit position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>position3DHigh</code> - High 32 bits for encoded 64-bit 2D (Columbus view) position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>position2DLow</code> - Low 32 bits for encoded 64-bit 2D (Columbus view) position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>color</code> - RGBA color (normalized) usually from {@link GeometryInstance#color}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>pickColor</code> - RGBA color used for picking.  32-bit floating-point.  4 components per attribute.</li>
         * </ul>
         * </p>
         *
         * @type GeometryAttributes
         *
         * @default undefined
         *
         * @see GeometryAttribute
         * @see VertexFormat
         *
         * @example
         * geometry.attributes.position = new Cesium.GeometryAttribute({
         *   componentDatatype : Cesium.ComponentDatatype.FLOAT,
         *   componentsPerAttribute : 3,
         *   values : new Float32Array()
         * });
         */
        this.attributes = options.attributes;

        /**
         * Optional index data that - along with {@link Geometry#primitiveType} -
         * determines the primitives in the geometry.
         *
         * @type Array
         *
         * @default undefined
         */
        this.indices = options.indices;

        /**
         * The type of primitives in the geometry.  This is most often {@link PrimitiveType.TRIANGLES},
         * but can varying based on the specific geometry.
         *
         * @type PrimitiveType
         *
         * @default undefined
         */
        this.primitiveType = defaultValue(options.primitiveType, PrimitiveType.TRIANGLES);

        /**
         * An optional bounding sphere that fully encloses the geometry.  This is
         * commonly used for culling.
         *
         * @type BoundingSphere
         *
         * @default undefined
         */
        this.boundingSphere = options.boundingSphere;

        /**
         * @private
         */
        this.geometryType = defaultValue(options.geometryType, GeometryType.NONE);

        /**
         * @private
         */
        this.boundingSphereCV = undefined;
    };

    /**
     * Computes the number of vertices in a geometry.  The runtime is linear with
     * respect to the number of attributes in a vertex, not the number of vertices.
     *
     * @param {Cartesian3} geometry The geometry.
     * @returns {Number} The number of vertices in the geometry.
     *
     * @example
     * var numVertices = Cesium.Geometry.computeNumberOfVertices(geometry);
     */
    Geometry.computeNumberOfVertices = function(geometry) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        
        var numberOfVertices = -1;
        for ( var property in geometry.attributes) {
            if (geometry.attributes.hasOwnProperty(property) &&
                    defined(geometry.attributes[property]) &&
                    defined(geometry.attributes[property].values)) {

                var attribute = geometry.attributes[property];
                var num = attribute.values.length / attribute.componentsPerAttribute;
                if ((numberOfVertices !== num) && (numberOfVertices !== -1)) {
                    throw new DeveloperError('All attribute lists must have the same number of attributes.');
                }
                numberOfVertices = num;
            }
        }

        return numberOfVertices;
    };

    return Geometry;
});

/*global define*/
define('Core/GeometryAttribute',[
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Values and type information for geometry attributes.  A {@link Geometry}
     * generally contains one or more attributes.  All attributes together form
     * the geometry's vertices.
     *
     * @alias GeometryAttribute
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {ComponentDatatype} [options.componentDatatype] The datatype of each component in the attribute, e.g., individual elements in values.
     * @param {Number} [options.componentsPerAttribute] A number between 1 and 4 that defines the number of components in an attributes.
     * @param {Boolean} [options.normalize=false] When <code>true</code> and <code>componentDatatype</code> is an integer format, indicate that the components should be mapped to the range [0, 1] (unsigned) or [-1, 1] (signed) when they are accessed as floating-point for rendering.
     * @param {Number[]} [options.values] The values for the attributes stored in a typed array.
     *
     * @exception {DeveloperError} options.componentsPerAttribute must be between 1 and 4.
     *
     * @see Geometry
     *
     * @example
     * var geometry = new Cesium.Geometry({
     *   attributes : {
     *     position : new Cesium.GeometryAttribute({
     *       componentDatatype : Cesium.ComponentDatatype.FLOAT,
     *       componentsPerAttribute : 3,
     *       values : [
     *         0.0, 0.0, 0.0,
     *         7500000.0, 0.0, 0.0,
     *         0.0, 7500000.0, 0.0
     *       ]
     *     })
     *   },
     *   primitiveType : Cesium.PrimitiveType.LINE_LOOP
     * });
     */
    var GeometryAttribute = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

                if (!defined(options.componentDatatype)) {
            throw new DeveloperError('options.componentDatatype is required.');
        }
        if (!defined(options.componentsPerAttribute)) {
            throw new DeveloperError('options.componentsPerAttribute is required.');
        }
        if (options.componentsPerAttribute < 1 || options.componentsPerAttribute > 4) {
            throw new DeveloperError('options.componentsPerAttribute must be between 1 and 4.');
        }
        if (!defined(options.values)) {
            throw new DeveloperError('options.values is required.');
        }
        
        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@link GeometryAttribute#values}.
         *
         * @type ComponentDatatype
         *
         * @default undefined
         */
        this.componentDatatype = options.componentDatatype;

        /**
         * A number between 1 and 4 that defines the number of components in an attributes.
         * For example, a position attribute with x, y, and z components would have 3 as
         * shown in the code example.
         *
         * @type Number
         *
         * @default undefined
         *
         * @example
         * attribute.componentDatatype : Cesium.ComponentDatatype.FLOAT,
         * attribute.componentsPerAttribute : 3,
         * attribute.values = new Float32Array([
         *   0.0, 0.0, 0.0,
         *   7500000.0, 0.0, 0.0,
         *   0.0, 7500000.0, 0.0
         * ]);
         */
        this.componentsPerAttribute = options.componentsPerAttribute;

        /**
         * When <code>true</code> and <code>componentDatatype</code> is an integer format,
         * indicate that the components should be mapped to the range [0, 1] (unsigned)
         * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
         * <p>
         * This is commonly used when storing colors using {@link ComponentDatatype.UNSIGNED_BYTE}.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         *
         * @example
         * attribute.componentDatatype : Cesium.ComponentDatatype.UNSIGNED_BYTE,
         * attribute.componentsPerAttribute : 4,
         * attribute.normalize = true;
         * attribute.values = new Uint8Array([
         *   Cesium.Color.floatToByte(color.red)
         *   Cesium.Color.floatToByte(color.green)
         *   Cesium.Color.floatToByte(color.blue)
         *   Cesium.Color.floatToByte(color.alpha)
         * ]);
         */
        this.normalize = defaultValue(options.normalize, false);

        /**
         * The values for the attributes stored in a typed array.  In the code example,
         * every three elements in <code>values</code> defines one attributes since
         * <code>componentsPerAttribute</code> is 3.
         *
         * @type Array
         *
         * @default undefined
         *
         * @example
         * attribute.componentDatatype : Cesium.ComponentDatatype.FLOAT,
         * attribute.componentsPerAttribute : 3,
         * attribute.values = new Float32Array([
         *   0.0, 0.0, 0.0,
         *   7500000.0, 0.0, 0.0,
         *   0.0, 7500000.0, 0.0
         * ]);
         */
        this.values = options.values;
    };

    return GeometryAttribute;
});

/*global define*/
define('Core/GeometryAttributes',[
        './defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * Attributes, which make up a geometry's vertices.  Each property in this object corresponds to a
     * {@link GeometryAttribute} containing the attribute's data.
     * <p>
     * Attributes are always stored non-interleaved in a Geometry.
     * </p>
     *
     * @alias GeometryAttributes
     * @constructor
     */
    var GeometryAttributes = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The 3D position attribute.
         * <p>
         * 64-bit floating-point (for precision).  3 components per attribute.
         * </p>
         *
         * @type GeometryAttribute
         *
         * @default undefined
         */
        this.position = options.position;

        /**
         * The normal attribute (normalized), which is commonly used for lighting.
         * <p>
         * 32-bit floating-point.  3 components per attribute.
         * </p>
         *
         * @type GeometryAttribute
         *
         * @default undefined
         */
        this.normal = options.normal;

        /**
         * The 2D texture coordinate attribute.
         * <p>
         * 32-bit floating-point.  2 components per attribute
         * </p>
         *
         * @type GeometryAttribute
         *
         * @default undefined
         */
        this.st = options.st;

        /**
         * The binormal attribute (normalized), which is used for tangent-space effects like bump mapping.
         * <p>
         * 32-bit floating-point.  3 components per attribute.
         * </p>
         *
         * @type GeometryAttribute
         *
         * @default undefined
         */
        this.binormal = options.binormal;

        /**
         * The tangent attribute (normalized), which is used for tangent-space effects like bump mapping.
         * <p>
         * 32-bit floating-point.  3 components per attribute.
         * </p>
         *
         * @type GeometryAttribute
         *
         * @default undefined
         */
        this.tangent = options.tangent;

        /**
         * The color attribute.
         * <p>
         * 8-bit unsigned integer. 4 components per attribute.
         * </p>
         *
         * @type GeometryAttribute
         *
         * @default undefined
         */
        this.color = options.color;
    };

    return GeometryAttributes;
});
/*global define*/
define('Core/GeometryInstance',[
        './defaultValue',
        './defined',
        './DeveloperError',
        './Matrix4'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        Matrix4) {
    "use strict";

    /**
     * Geometry instancing allows one {@link Geometry} object to be positions in several
     * different locations and colored uniquely.  For example, one {@link BoxGeometry} can
     * be instanced several times, each with a different <code>modelMatrix</code> to change
     * its position, rotation, and scale.
     *
     * @alias GeometryInstance
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Geometry} options.geometry The geometry to instance.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The model matrix that transforms to transform the geometry from model to world coordinates.
     * @param {Object} [options.id] A user-defined object to return when the instance is picked with {@link Scene#pick} or get/set per-instance attributes with {@link Primitive#getGeometryInstanceAttributes}.
     * @param {Object} [options.attributes] Per-instance attributes like a show or color attribute shown in the example below.
     *
     * @see Geometry
     *
     * @example
     * // Create geometry for a box, and two instances that refer to it.
     * // One instance positions the box on the bottom and colored aqua.
     * // The other instance positions the box on the top and color white.
     * var geometry = new Cesium.BoxGeometry({
     *   vertexFormat : Cesium.VertexFormat.POSITION_AND_NORMAL,
     *   dimensions : new Cesium.Cartesian3(1000000.0, 1000000.0, 500000.0)
     * }),
     * var instanceBottom = new Cesium.GeometryInstance({
     *   geometry : geometry,
     *   modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
     *     Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883)), new Cesium.Cartesian3(0.0, 0.0, 1000000.0), new Cesium.Matrix4()),
     *   attributes : {
     *     color : new Cesium.ColorGeometryInstanceAttribute(Cesium.Color.AQUA)
     *   }
     *   id : 'bottom'
     * });
     * var instanceTop = new Cesium.GeometryInstance({
     *   geometry : geometry,
     *   modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
     *     Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883)), new Cesium.Cartesian3(0.0, 0.0, 3000000.0), new Cesium.Matrix4()),
     *   attributes : {
     *     color : new Cesium.ColorGeometryInstanceAttribute(Cesium.Color.AQUA)
     *   }
     *   id : 'top'
     * });
     */
    var GeometryInstance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

                if (!defined(options.geometry)) {
            throw new DeveloperError('options.geometry is required.');
        }
        
        /**
         * The geometry being instanced.
         *
         * @type Geometry
         *
         * @default undefined
         */
        this.geometry = options.geometry;

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         *
         * @default Matrix4.IDENTITY
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        /**
         * User-defined object returned when the instance is picked or used to get/set per-instance attributes.
         *
         * @type Object
         *
         * @default undefined
         *
         * @see Scene#pick
         * @see Primitive#getGeometryInstanceAttributes
         */
        this.id = options.id;

        /**
         * Used for picking primitives that wrap geometry instances.
         *
         * @private
         */
        this.pickPrimitive = options.pickPrimitive;

        /**
         * Per-instance attributes like {@link ColorGeometryInstanceAttribute} or {@link ShowGeometryInstanceAttribute}.
         * {@link Geometry} attributes varying per vertex; these attributes are constant for the entire instance.
         *
         * @type Object
         *
         * @default undefined
         */
        this.attributes = defaultValue(options.attributes, {});

        /**
         * @private
         */
        this.westHemisphereGeometry = undefined;
        /**
         * @private
         */
        this.eastHemisphereGeometry = undefined;
    };

    return GeometryInstance;
});

/*global define*/
define('Core/AttributeCompression',[
        './Cartesian2',
        './Cartesian3',
        './defined',
        './DeveloperError',
        './Math'
    ], function(
        Cartesian2,
        Cartesian3,
        defined,
        DeveloperError,
        CesiumMath) {
    "use strict";

    /**
     * Attribute compression and decompression functions.
     *
     * @namespace
     * @alias AttributeCompression
     *
     * @private
     */
    var AttributeCompression = {};

    /**
     * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding.
     *
     * Oct encoding is a compact representation of unit length vectors.  The encoding and decoding functions are low cost, and represent the normalized vector within 1 degree of error.
     * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
     * Cigolle et al 2014: {@link http://jcgt.org/published/0003/02/01/}
     *
     * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
     * @param {Cartesian2} result The 2 byte oct-encoded unit length vector.
     * @returns {Cartesian2} The 2 byte oct-encoded unit length vector.
     *
     * @exception {DeveloperError} vector must be defined.
     * @exception {DeveloperError} result must be defined.
     * @exception {DeveloperError} vector must be normalized.
     *
     * @see AttributeCompression.octDecode
     */
    AttributeCompression.octEncode = function(vector, result) {
                if (!defined(vector)) {
            throw new DeveloperError('vector is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        var magSquared = Cartesian3.magnitudeSquared(vector);
        if (Math.abs(magSquared - 1.0) > CesiumMath.EPSILON6) {
            throw new DeveloperError('vector must be normalized.');
        }
        
        result.x = vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
        result.y = vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
        if (vector.z < 0) {
            var x = result.x;
            var y = result.y;
            result.x = (1.0 - Math.abs(y)) * CesiumMath.signNotZero(x);
            result.y = (1.0 - Math.abs(x)) * CesiumMath.signNotZero(y);
        }

        result.x = CesiumMath.toSNorm(result.x);
        result.y = CesiumMath.toSNorm(result.y);

        return result;
    };

    /**
     * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component vector.
     *
     * @param {Number} x The x component of the oct-encoded unit length vector.
     * @param {Number} y The y component of the oct-encoded unit length vector.
     * @param {Cartesian3} result The decoded and normalized vector
     * @returns {Cartesian3} The decoded and normalized vector.
     *
     * @exception {DeveloperError} result must be defined.
     * @exception {DeveloperError} x and y must be a signed normalized integer between 0 and 255.
     *
     * @see AttributeCompression.octEncode
     */
    AttributeCompression.octDecode = function(x, y, result) {
                if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        if (x < 0 || x > 255 || y < 0 || y > 255) {
            throw new DeveloperError('x and y must be a signed normalized integer between 0 and 255');
        }
        
        result.x = CesiumMath.fromSNorm(x);
        result.y = CesiumMath.fromSNorm(y);
        result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y));

        if (result.z < 0.0)
        {
            var oldVX = result.x;
            result.x = (1.0 - Math.abs(result.y)) * CesiumMath.signNotZero(oldVX);
            result.y = (1.0 - Math.abs(oldVX)) * CesiumMath.signNotZero(result.y);
        }

        return Cartesian3.normalize(result, result);
    };

    /**
     * Packs an oct encoded vector into a single floating-point number.
     *
     * @param {Cartesian2} encoded The oct encoded vector.
     * @returns {Number} The oct encoded vector packed into a single float.
     *
     * @exception {DeveloperError} encoded is required.
     */
    AttributeCompression.octPackFloat = function(encoded) {
                if (!defined(encoded)) {
            throw new DeveloperError('encoded is required.');
        }
                return 256.0 * encoded.x + encoded.y;
    };

    var scratchEncodeCart2 = new Cartesian2();

    /**
     * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding and
     * stores those values in a single float-point number.
     *
     * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
     * @returns {Number} The 2 byte oct-encoded unit length vector.
     *
     * @exception {DeveloperError} vector must be defined.
     * @exception {DeveloperError} vector must be normalized.
     */
    AttributeCompression.octEncodeFloat = function(vector) {
        AttributeCompression.octEncode(vector, scratchEncodeCart2);
        return AttributeCompression.octPackFloat(scratchEncodeCart2);
    };

    /**
     * Decodes a unit-length vector in 'oct' encoding packed in a floating-point number to a normalized 3-component vector.
     *
     * @param {Number} value The oct-encoded unit length vector stored as a single floating-point number.
     * @param {Cartesian3} result The decoded and normalized vector
     * @returns {Cartesian3} The decoded and normalized vector.
     *
     * @exception {DeveloperError} value must be defined.
     * @exception {DeveloperError} result must be defined.
     */
    AttributeCompression.octDecodeFloat = function(value, result) {
                if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        
        var temp = value / 256.0;
        var x = Math.floor(temp);
        var y = (temp - x) * 256.0;

        return AttributeCompression.octDecode(x, y, result);
    };

    /**
     * Encodes three normalized vectors into 6 SNORM values in the range of [0-255] following the 'oct' encoding and
     * packs those into two floating-point numbers.
     *
     * @param {Cartesian3} v1 A normalized vector to be compressed.
     * @param {Cartesian3} v2 A normalized vector to be compressed.
     * @param {Cartesian3} v3 A normalized vector to be compressed.
     * @param {Cartesian2} result The 'oct' encoded vectors packed into two floating-point numbers.
     * @returns {Cartesian2} The 'oct' encoded vectors packed into two floating-point numbers.
     *
     * @exception {DeveloperError} v1 must be defined.
     * @exception {DeveloperError} v2 must be defined.
     * @exception {DeveloperError} v3 must be defined.
     * @exception {DeveloperError} result must be defined.
     */
    AttributeCompression.octPack = function(v1, v2, v3, result) {
                if (!defined(v1)) {
            throw new DeveloperError('v1 is required.');
        }
        if (!defined(v2)) {
            throw new DeveloperError('v2 is required.');
        }
        if (!defined(v3)) {
            throw new DeveloperError('v3 is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        var encoded1 = AttributeCompression.octEncodeFloat(v1);
        var encoded2 = AttributeCompression.octEncodeFloat(v2);

        var encoded3 = AttributeCompression.octEncode(v3, scratchEncodeCart2);
        result.x = 65536.0 * encoded3.x + encoded1;
        result.y = 65536.0 * encoded3.y + encoded2;
        return result;
    };

    /**
     * Decodes three unit-length vectors in 'oct' encoding packed into a floating-point number to a normalized 3-component vector.
     *
     * @param {Cartesian2} packed The three oct-encoded unit length vectors stored as two floating-point number.
     * @param {Cartesian3} v1 One decoded and normalized vector.
     * @param {Cartesian3} v2 One decoded and normalized vector.
     * @param {Cartesian3} v3 One decoded and normalized vector.
     *
     * @exception {DeveloperError} packed must be defined.
     * @exception {DeveloperError} v1 must be defined.
     * @exception {DeveloperError} v2 must be defined.
     * @exception {DeveloperError} v3 must be defined.
     */
    AttributeCompression.octUnpack = function(packed, v1, v2, v3) {
                if (!defined(packed)) {
            throw new DeveloperError('packed is required.');
        }
        if (!defined(v1)) {
            throw new DeveloperError('v1 is required.');
        }
        if (!defined(v2)) {
            throw new DeveloperError('v2 is required.');
        }
        if (!defined(v3)) {
            throw new DeveloperError('v3 is required.');
        }
        
        var temp = packed.x / 65536.0;
        var x = Math.floor(temp);
        var encodedFloat1 = (temp - x) * 65536.0;

        temp = packed.y / 65536.0;
        var y = Math.floor(temp);
        var encodedFloat2 = (temp - y) * 65536.0;

        AttributeCompression.octDecodeFloat(encodedFloat1, v1);
        AttributeCompression.octDecodeFloat(encodedFloat2, v2);
        AttributeCompression.octDecode(x, y, v3);
    };

    /**
     * Pack texture coordinates into a single float. The texture coordinates will only preserve 12 bits of precision.
     *
     * @param {Cartesian2} textureCoordinates The texture coordinates to compress
     * @returns {Number} The packed texture coordinates.
     *
     * @exception {DeveloperError} textureCoordinates is required.
     */
    AttributeCompression.compressTextureCoordinates = function(textureCoordinates) {
                if (!defined(textureCoordinates)) {
            throw new DeveloperError('textureCoordinates is required.');
        }
        
        var x = textureCoordinates.x === 1.0 ? 4095.0 : (textureCoordinates.x * 4096.0) | 0;
        var y = textureCoordinates.y === 1.0 ? 4095.0 : (textureCoordinates.y * 4096.0) | 0;
        return 4096.0 * x + y;
    };

    /**
     * Decompresses texture coordinates that were packed into a single float.
     *
     * @param {Number} compressed The compressed texture coordinates.
     * @param {Cartesian2} result The decompressed texture coordinates.
     * @returns {Cartesian2} The modified result parameter.
     *
     * @exception {DeveloperError} compressed is required.
     * @exception {DeveloperError} result is required.
     */
    AttributeCompression.decompressTextureCoordinates = function(compressed, result) {
                if (!defined(compressed)) {
            throw new DeveloperError('compressed is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        
        var temp = compressed / 4096.0;
        result.x = Math.floor(temp) / 4096.0;
        result.y = temp - Math.floor(temp);
        return result;
    };

    return AttributeCompression;
});
/*global define*/
define('Core/barycentricCoordinates',[
        './Cartesian2',
        './Cartesian3',
        './defined',
        './DeveloperError'
    ], function(
        Cartesian2,
        Cartesian3,
        defined,
        DeveloperError) {
    "use strict";

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();

    /**
     * Computes the barycentric coordinates for a point with respect to a triangle.
     *
     * @exports barycentricCoordinates
     *
     * @param {Cartesian2|Cartesian3} point The point to test.
     * @param {Cartesian2|Cartesian3} p0 The first point of the triangle, corresponding to the barycentric x-axis.
     * @param {Cartesian2|Cartesian3} p1 The second point of the triangle, corresponding to the barycentric y-axis.
     * @param {Cartesian2|Cartesian3} p2 The third point of the triangle, corresponding to the barycentric z-axis.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @example
     * // Returns Cartesian3.UNIT_X
     * var p = new Cesium.Cartesian3(-1.0, 0.0, 0.0);
     * var b = Cesium.barycentricCoordinates(p,
     *   new Cesium.Cartesian3(-1.0, 0.0, 0.0),
     *   new Cesium.Cartesian3( 1.0, 0.0, 0.0),
     *   new Cesium.Cartesian3( 0.0, 1.0, 1.0));
     */
    var barycentricCoordinates = function(point, p0, p1, p2, result) {
                if (!defined(point) || !defined(p0) || !defined(p1) || !defined(p2)) {
            throw new DeveloperError('point, p0, p1, and p2 are required.');
        }
        

        if (!defined(result)) {
            result = new Cartesian3();
        }

        // Implementation based on http://www.blackpawn.com/texts/pointinpoly/default.html.
        var v0, v1, v2;
        var dot00, dot01, dot02, dot11, dot12;

        if(!defined(p0.z)) {
          v0 = Cartesian2.subtract(p1, p0, scratchCartesian1);
          v1 = Cartesian2.subtract(p2, p0, scratchCartesian2);
          v2 = Cartesian2.subtract(point, p0, scratchCartesian3);

          dot00 = Cartesian2.dot(v0, v0);
          dot01 = Cartesian2.dot(v0, v1);
          dot02 = Cartesian2.dot(v0, v2);
          dot11 = Cartesian2.dot(v1, v1);
          dot12 = Cartesian2.dot(v1, v2);
        } else {
          v0 = Cartesian3.subtract(p1, p0, scratchCartesian1);
          v1 = Cartesian3.subtract(p2, p0, scratchCartesian2);
          v2 = Cartesian3.subtract(point, p0, scratchCartesian3);

          dot00 = Cartesian3.dot(v0, v0);
          dot01 = Cartesian3.dot(v0, v1);
          dot02 = Cartesian3.dot(v0, v2);
          dot11 = Cartesian3.dot(v1, v1);
          dot12 = Cartesian3.dot(v1, v2);
        }

        var q = 1.0 / (dot00 * dot11 - dot01 * dot01);
        result.y = (dot11 * dot02 - dot01 * dot12) * q;
        result.z = (dot00 * dot12 - dot01 * dot02) * q;
        result.x = 1.0 - result.y - result.z;
        return result;
    };

    return barycentricCoordinates;
});

/*global define*/
define('Core/EncodedCartesian3',[
        './Cartesian3',
        './defined',
        './DeveloperError'
    ], function(
        Cartesian3,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * A fixed-point encoding of a {@link Cartesian3} with 64-bit floating-point components, as two {@link Cartesian3}
     * values that, when converted to 32-bit floating-point and added, approximate the original input.
     * <p>
     * This is used to encode positions in vertex buffers for rendering without jittering artifacts
     * as described in {@link http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/|Precisions, Precisions}.
     * </p>
     *
     * @alias EncodedCartesian3
     * @constructor
     *
     * @private
     */
    var EncodedCartesian3 = function() {
        /**
         * The high bits for each component.  Bits 0 to 22 store the whole value.  Bits 23 to 31 are not used.
         *
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.high = Cartesian3.clone(Cartesian3.ZERO);

        /**
         * The low bits for each component.  Bits 7 to 22 store the whole value, and bits 0 to 6 store the fraction.  Bits 23 to 31 are not used.
         *
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.low = Cartesian3.clone(Cartesian3.ZERO);
    };

    /**
     * Encodes a 64-bit floating-point value as two floating-point values that, when converted to
     * 32-bit floating-point and added, approximate the original input.  The returned object
     * has <code>high</code> and <code>low</code> properties for the high and low bits, respectively.
     * <p>
     * The fixed-point encoding follows {@link http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/|Precisions, Precisions}.
     * </p>
     *
     * @param {Number} value The floating-point value to encode.
     * @param {Object} [result] The object onto which to store the result.
     * @returns {Object} The modified result parameter or a new instance if one was not provided.
     *
     * @example
     * var value = 1234567.1234567;
     * var splitValue = Cesium.EncodedCartesian3.encode(value);
     */
    EncodedCartesian3.encode = function(value, result) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        
        if (!defined(result)) {
            result = {
                high : 0.0,
                low : 0.0
            };
        }

        var doubleHigh;
        if (value >= 0.0) {
            doubleHigh = Math.floor(value / 65536.0) * 65536.0;
            result.high = doubleHigh;
            result.low = value - doubleHigh;
        } else {
            doubleHigh = Math.floor(-value / 65536.0) * 65536.0;
            result.high = -doubleHigh;
            result.low = value + doubleHigh;
        }

        return result;
    };

    var scratchEncode = {
        high : 0.0,
        low : 0.0
    };

    /**
     * Encodes a {@link Cartesian3} with 64-bit floating-point components as two {@link Cartesian3}
     * values that, when converted to 32-bit floating-point and added, approximate the original input.
     * <p>
     * The fixed-point encoding follows {@link http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/|Precisions, Precisions}.
     * </p>
     *
     * @param {Cartesian3} cartesian The cartesian to encode.
     * @param {EncodedCartesian3} [result] The object onto which to store the result.
     * @returns {EncodedCartesian3} The modified result parameter or a new EncodedCartesian3 instance if one was not provided.
     *
     * @example
     * var cart = new Cesium.Cartesian3(-10000000.0, 0.0, 10000000.0);
     * var encoded = Cesium.EncodedCartesian3.fromCartesian(cart);
     */
    EncodedCartesian3.fromCartesian = function(cartesian, result) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        
        if (!defined(result)) {
            result = new EncodedCartesian3();
        }

        var high = result.high;
        var low = result.low;

        EncodedCartesian3.encode(cartesian.x, scratchEncode);
        high.x = scratchEncode.high;
        low.x = scratchEncode.low;

        EncodedCartesian3.encode(cartesian.y, scratchEncode);
        high.y = scratchEncode.high;
        low.y = scratchEncode.low;

        EncodedCartesian3.encode(cartesian.z, scratchEncode);
        high.z = scratchEncode.high;
        low.z = scratchEncode.low;

        return result;
    };

    var encodedP = new EncodedCartesian3();

    /**
     * Encodes the provided <code>cartesian</code>, and writes it to an array with <code>high</code>
     * components followed by <code>low</code> components, i.e. <code>[high.x, high.y, high.z, low.x, low.y, low.z]</code>.
     * <p>
     * This is used to create interleaved high-precision position vertex attributes.
     * </p>
     *
     * @param {Cartesian3} cartesian The cartesian to encode.
     * @param {Number[]} cartesianArray The array to write to.
     * @param {Number} index The index into the array to start writing.  Six elements will be written.
     *
     * @exception {DeveloperError} index must be a number greater than or equal to 0.
     *
     * @example
     * var positions = [
     *    new Cesium.Cartesian3(),
     *    // ...
     * ];
     * var encodedPositions = new Float32Array(2 * 3 * positions.length);
     * var j = 0;
     * for (var i = 0; i < positions.length; ++i) {
     *   Cesium.EncodedCartesian3.writeElement(positions[i], encodedPositions, j);
     *   j += 6;
     * }
     */
    EncodedCartesian3.writeElements = function(cartesian, cartesianArray, index) {
                if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(cartesianArray)) {
            throw new DeveloperError('cartesianArray is required');
        }
        if (typeof index !== 'number' || index < 0) {
            throw new DeveloperError('index must be a number greater than or equal to 0.');
        }
        
        EncodedCartesian3.fromCartesian(cartesian, encodedP);
        var high = encodedP.high;
        var low = encodedP.low;

        cartesianArray[index] = high.x;
        cartesianArray[index + 1] = high.y;
        cartesianArray[index + 2] = high.z;
        cartesianArray[index + 3] = low.x;
        cartesianArray[index + 4] = low.y;
        cartesianArray[index + 5] = low.z;
    };

    return EncodedCartesian3;
});

/*global define*/
define('Core/IndexDatatype',[
        './defined',
        './DeveloperError',
        './freezeObject',
        './Math'
    ], function(
        defined,
        DeveloperError,
        freezeObject,
        CesiumMath) {
    "use strict";

    /**
     * Constants for WebGL index datatypes.  These corresponds to the
     * <code>type</code> parameter of {@link http://www.khronos.org/opengles/sdk/docs/man/xhtml/glDrawElements.xml|drawElements}.
     *
     * @namespace
     * @alias IndexDatatype
     */
    var IndexDatatype = {
        /**
         * 0x1401.  8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
         * of an element in <code>Uint8Array</code>.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_BYTE : 0x1401,

        /**
         * 0x1403.  16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
         * of an element in <code>Uint16Array</code>.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_SHORT : 0x1403,

        /**
         * 0x1405.  32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
         * of an element in <code>Uint32Array</code>.
         *
         * @type {Number}
         * @constant
         */
        UNSIGNED_INT : 0x1405
    };

    /**
     * Returns the size, in bytes, of the corresponding datatype.
     *
     * @param {IndexDatatype} indexDatatype The index datatype to get the size of.
     * @returns {Number} The size in bytes.
     *
     * @example
     * // Returns 2
     * var size = Cesium.IndexDatatype.getSizeInBytes(Cesium.IndexDatatype.UNSIGNED_SHORT);
     */
    IndexDatatype.getSizeInBytes = function(indexDatatype) {
        switch(indexDatatype) {
            case IndexDatatype.UNSIGNED_BYTE:
                return Uint8Array.BYTES_PER_ELEMENT;
            case IndexDatatype.UNSIGNED_SHORT:
                return Uint16Array.BYTES_PER_ELEMENT;
            case IndexDatatype.UNSIGNED_INT:
                return Uint32Array.BYTES_PER_ELEMENT;
        }

                throw new DeveloperError('indexDatatype is required and must be a valid IndexDatatype constant.');
            };

    /**
     * Validates that the provided index datatype is a valid {@link IndexDatatype}.
     *
     * @param {IndexDatatype} indexDatatype The index datatype to validate.
     * @returns {Boolean} <code>true</code> if the provided index datatype is a valid value; otherwise, <code>false</code>.
     *
     * @example
     * if (!Cesium.IndexDatatype.validate(indexDatatype)) {
     *   throw new Cesium.DeveloperError('indexDatatype must be a valid value.');
     * }
     */
    IndexDatatype.validate = function(indexDatatype) {
        return defined(indexDatatype) &&
               (indexDatatype === IndexDatatype.UNSIGNED_BYTE ||
                indexDatatype === IndexDatatype.UNSIGNED_SHORT ||
                indexDatatype === IndexDatatype.UNSIGNED_INT);
    };

    /**
     * Creates a typed array that will store indices, using either <code><Uint16Array</code>
     * or <code>Uint32Array</code> depending on the number of vertices.
     *
     * @param {Number} numberOfVertices Number of vertices that the indices will reference.
     * @param {Any} indicesLengthOrArray Passed through to the typed array constructor.
     * @returns {Uint16Aray|Uint32Array} A <code>Uint16Array</code> or <code>Uint32Array</code> constructed with <code>indicesLengthOrArray</code>.
     *
     * @example
     * this.indices = Cesium.IndexDatatype.createTypedArray(positions.length / 3, numberOfIndices);
     */
    IndexDatatype.createTypedArray = function(numberOfVertices, indicesLengthOrArray) {
                if (!defined(numberOfVertices)) {
            throw new DeveloperError('numberOfVertices is required.');
        }
        
        if (numberOfVertices > CesiumMath.SIXTY_FOUR_KILOBYTES) {
            return new Uint32Array(indicesLengthOrArray);
        }

        return new Uint16Array(indicesLengthOrArray);
    };

    /**
     * Creates a typed array from a source array buffer.  The resulting typed array will store indices, using either <code><Uint16Array</code>
     * or <code>Uint32Array</code> depending on the number of vertices.
     *
     * @param {Number} numberOfVertices Number of vertices that the indices will reference.
     * @param {ArrayBuffer} sourceArray Passed through to the typed array constructor.
     * @param {byteOffset} byteOffset Passed through to the typed array constructor.
     * @param {length} length Passed through to the typed array constructor.
     * @returns {Uint16Aray|Uint32Array} A <code>Uint16Array</code> or <code>Uint32Array</code> constructed with <code>sourceArray</code>, <code>byteOffset</code>, and <code>length</code>.
     *
     */
    IndexDatatype.createTypedArrayFromArrayBuffer = function(numberOfVertices, sourceArray, byteOffset, length) {
                if (!defined(numberOfVertices)) {
            throw new DeveloperError('numberOfVertices is required.');
        }
        if (!defined(sourceArray)) {
            throw new DeveloperError('sourceArray is required.');
        }
        if (!defined(byteOffset)) {
            throw new DeveloperError('byteOffset is required.');
        }
        
        if (numberOfVertices > CesiumMath.SIXTY_FOUR_KILOBYTES) {
            return new Uint32Array(sourceArray, byteOffset, length);
        }

        return new Uint16Array(sourceArray, byteOffset, length);
    };

    return freezeObject(IndexDatatype);
});

/*global define*/
define('Core/QuadraticRealPolynomial',[
        './DeveloperError',
        './Math'
    ], function(
        DeveloperError,
        CesiumMath) {
    "use strict";

    /**
     * Defines functions for 2nd order polynomial functions of one variable with only real coefficients.
     *
     * @namespace
     * @alias QuadraticRealPolynomial
     */
    var QuadraticRealPolynomial = {};

    /**
     * Provides the discriminant of the quadratic equation from the supplied coefficients.
     *
     * @param {Number} a The coefficient of the 2nd order monomial.
     * @param {Number} b The coefficient of the 1st order monomial.
     * @param {Number} c The coefficient of the 0th order monomial.
     * @returns {Number} The value of the discriminant.
     */
    QuadraticRealPolynomial.computeDiscriminant = function(a, b, c) {
                if (typeof a !== 'number') {
            throw new DeveloperError('a is a required number.');
        }
        if (typeof b !== 'number') {
            throw new DeveloperError('b is a required number.');
        }
        if (typeof c !== 'number') {
            throw new DeveloperError('c is a required number.');
        }
        
        var discriminant = b * b - 4.0 * a * c;
        return discriminant;
    };

    function addWithCancellationCheck(left, right, tolerance) {
        var difference = left + right;
        if ((CesiumMath.sign(left) !== CesiumMath.sign(right)) &&
                Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < tolerance) {
            return 0.0;
        }

        return difference;
    }

    /**
     * Provides the real valued roots of the quadratic polynomial with the provided coefficients.
     *
     * @param {Number} a The coefficient of the 2nd order monomial.
     * @param {Number} b The coefficient of the 1st order monomial.
     * @param {Number} c The coefficient of the 0th order monomial.
     * @returns {Number[]} The real valued roots.
     */
    QuadraticRealPolynomial.computeRealRoots = function(a, b, c) {
                if (typeof a !== 'number') {
            throw new DeveloperError('a is a required number.');
        }
        if (typeof b !== 'number') {
            throw new DeveloperError('b is a required number.');
        }
        if (typeof c !== 'number') {
            throw new DeveloperError('c is a required number.');
        }
        
        var ratio;
        if (a === 0.0) {
            if (b === 0.0) {
                // Constant function: c = 0.
                return [];
            }

            // Linear function: b * x + c = 0.
            return [-c / b];
        } else if (b === 0.0) {
            if (c === 0.0) {
                // 2nd order monomial: a * x^2 = 0.
                return [0.0, 0.0];
            }

            var cMagnitude = Math.abs(c);
            var aMagnitude = Math.abs(a);

            if ((cMagnitude < aMagnitude) && (cMagnitude / aMagnitude < CesiumMath.EPSILON14)) { // c ~= 0.0.
                // 2nd order monomial: a * x^2 = 0.
                return [0.0, 0.0];
            } else if ((cMagnitude > aMagnitude) && (aMagnitude / cMagnitude < CesiumMath.EPSILON14)) { // a ~= 0.0.
                // Constant function: c = 0.
                return [];
            }

            // a * x^2 + c = 0
            ratio = -c / a;

            if (ratio < 0.0) {
                // Both roots are complex.
                return [];
            }

            // Both roots are real.
            var root = Math.sqrt(ratio);
            return [-root, root];
        } else if (c === 0.0) {
            // a * x^2 + b * x = 0
            ratio = -b / a;
            if (ratio < 0.0) {
                return [ratio, 0.0];
            }

            return [0.0, ratio];
        }

        // a * x^2 + b * x + c = 0
        var b2 = b * b;
        var four_ac = 4.0 * a * c;
        var radicand = addWithCancellationCheck(b2, -four_ac, CesiumMath.EPSILON14);

        if (radicand < 0.0) {
            // Both roots are complex.
            return [];
        }

        var q = -0.5 * addWithCancellationCheck(b, CesiumMath.sign(b) * Math.sqrt(radicand), CesiumMath.EPSILON14);
        if (b > 0.0) {
            return [q / a, c / q];
        }

        return [c / q, q / a];
    };

    return QuadraticRealPolynomial;
});
/*global define*/
define('Core/CubicRealPolynomial',[
        './DeveloperError',
        './QuadraticRealPolynomial'
    ], function(
        DeveloperError,
        QuadraticRealPolynomial) {
    "use strict";

    /**
     * Defines functions for 3rd order polynomial functions of one variable with only real coefficients.
     *
     * @namespace
     * @alias CubicRealPolynomial
     */
    var CubicRealPolynomial = {};

    /**
     * Provides the discriminant of the cubic equation from the supplied coefficients.
     *
     * @param {Number} a The coefficient of the 3rd order monomial.
     * @param {Number} b The coefficient of the 2nd order monomial.
     * @param {Number} c The coefficient of the 1st order monomial.
     * @param {Number} d The coefficient of the 0th order monomial.
     * @returns {Number} The value of the discriminant.
     */
    CubicRealPolynomial.computeDiscriminant = function(a, b, c, d) {
                if (typeof a !== 'number') {
            throw new DeveloperError('a is a required number.');
        }
        if (typeof b !== 'number') {
            throw new DeveloperError('b is a required number.');
        }
        if (typeof c !== 'number') {
            throw new DeveloperError('c is a required number.');
        }
        if (typeof d !== 'number') {
            throw new DeveloperError('d is a required number.');
        }
        
        var a2 = a * a;
        var b2 = b * b;
        var c2 = c * c;
        var d2 = d * d;

        var discriminant = 18.0 * a * b * c * d + b2 * c2 - 27.0 * a2 * d2 - 4.0 * (a * c2 * c + b2 * b * d);
        return discriminant;
    };

    function computeRealRoots(a, b, c, d) {
        var A = a;
        var B = b / 3.0;
        var C = c / 3.0;
        var D = d;

        var AC = A * C;
        var BD = B * D;
        var B2 = B * B;
        var C2 = C * C;
        var delta1 = A * C - B2;
        var delta2 = A * D - B * C;
        var delta3 = B * D - C2;

        var discriminant = 4.0 * delta1 * delta3 - delta2 * delta2;
        var temp;
        var temp1;

        if (discriminant < 0.0) {
            var ABar;
            var CBar;
            var DBar;

            if (B2 * BD >= AC * C2) {
                ABar = A;
                CBar = delta1;
                DBar = -2.0 * B * delta1 + A * delta2;
            } else {
                ABar = D;
                CBar = delta3;
                DBar = -D * delta2 + 2.0 * C * delta3;
            }

            var s = (DBar < 0.0) ? -1.0 : 1.0; // This is not Math.Sign()!
            var temp0 = -s * Math.abs(ABar) * Math.sqrt(-discriminant);
            temp1 = -DBar + temp0;

            var x = temp1 / 2.0;
            var p = x < 0.0 ? -Math.pow(-x, 1.0 / 3.0) : Math.pow(x, 1.0 / 3.0);
            var q = (temp1 === temp0) ? -p : -CBar / p;

            temp = (CBar <= 0.0) ? p + q : -DBar / (p * p + q * q + CBar);

            if (B2 * BD >= AC * C2) {
                return [(temp - B) / A];
            }

            return [-D / (temp + C)];
        }

        var CBarA = delta1;
        var DBarA = -2.0 * B * delta1 + A * delta2;

        var CBarD = delta3;
        var DBarD = -D * delta2 + 2.0 * C * delta3;

        var squareRootOfDiscriminant = Math.sqrt(discriminant);
        var halfSquareRootOf3 = Math.sqrt(3.0) / 2.0;

        var theta = Math.abs(Math.atan2(A * squareRootOfDiscriminant, -DBarA) / 3.0);
        temp = 2.0 * Math.sqrt(-CBarA);
        var cosine = Math.cos(theta);
        temp1 = temp * cosine;
        var temp3 = temp * (-cosine / 2.0 - halfSquareRootOf3 * Math.sin(theta));

        var numeratorLarge = (temp1 + temp3 > 2.0 * B) ? temp1 - B : temp3 - B;
        var denominatorLarge = A;

        var root1 = numeratorLarge / denominatorLarge;

        theta = Math.abs(Math.atan2(D * squareRootOfDiscriminant, -DBarD) / 3.0);
        temp = 2.0 * Math.sqrt(-CBarD);
        cosine = Math.cos(theta);
        temp1 = temp * cosine;
        temp3 = temp * (-cosine / 2.0 - halfSquareRootOf3 * Math.sin(theta));

        var numeratorSmall = -D;
        var denominatorSmall = (temp1 + temp3 < 2.0 * C) ? temp1 + C : temp3 + C;

        var root3 = numeratorSmall / denominatorSmall;

        var E = denominatorLarge * denominatorSmall;
        var F = -numeratorLarge * denominatorSmall - denominatorLarge * numeratorSmall;
        var G = numeratorLarge * numeratorSmall;

        var root2 = (C * F - B * G) / (-B * F + C * E);

        if (root1 <= root2) {
            if (root1 <= root3) {
                if (root2 <= root3) {
                    return [root1, root2, root3];
                }
                return [root1, root3, root2];
            }
            return [root3, root1, root2];
        }
        if (root1 <= root3) {
            return [root2, root1, root3];
        }
        if (root2 <= root3) {
            return [root2, root3, root1];
        }
        return [root3, root2, root1];
    }

    /**
     * Provides the real valued roots of the cubic polynomial with the provided coefficients.
     *
     * @param {Number} a The coefficient of the 3rd order monomial.
     * @param {Number} b The coefficient of the 2nd order monomial.
     * @param {Number} c The coefficient of the 1st order monomial.
     * @param {Number} d The coefficient of the 0th order monomial.
     * @returns {Number[]} The real valued roots.
     */
    CubicRealPolynomial.computeRealRoots = function(a, b, c, d) {
                if (typeof a !== 'number') {
            throw new DeveloperError('a is a required number.');
        }
        if (typeof b !== 'number') {
            throw new DeveloperError('b is a required number.');
        }
        if (typeof c !== 'number') {
            throw new DeveloperError('c is a required number.');
        }
        if (typeof d !== 'number') {
            throw new DeveloperError('d is a required number.');
        }
        
        var roots;
        var ratio;
        if (a === 0.0) {
            // Quadratic function: b * x^2 + c * x + d = 0.
            return QuadraticRealPolynomial.computeRealRoots(b, c, d);
        } else if (b === 0.0) {
            if (c === 0.0) {
                if (d === 0.0) {
                    // 3rd order monomial: a * x^3 = 0.
                    return [0.0, 0.0, 0.0];
                }

                // a * x^3 + d = 0
                ratio = -d / a;
                var root = (ratio < 0.0) ? -Math.pow(-ratio, 1.0 / 3.0) : Math.pow(ratio, 1.0 / 3.0);
                return [root, root, root];
            } else if (d === 0.0) {
                // x * (a * x^2 + c) = 0.
                roots = QuadraticRealPolynomial.computeRealRoots(a, 0, c);

                // Return the roots in ascending order.
                if (roots.Length === 0) {
                    return [0.0];
                }
                return [roots[0], 0.0, roots[1]];
            }

            // Deflated cubic polynomial: a * x^3 + c * x + d= 0.
            return computeRealRoots(a, 0, c, d);
        } else if (c === 0.0) {
            if (d === 0.0) {
                // x^2 * (a * x + b) = 0.
                ratio = -b / a;
                if (ratio < 0.0) {
                    return [ratio, 0.0, 0.0];
                }
                return [0.0, 0.0, ratio];
            }
            // a * x^3 + b * x^2 + d = 0.
            return computeRealRoots(a, b, 0, d);
        } else if (d === 0.0) {
            // x * (a * x^2 + b * x + c) = 0
            roots = QuadraticRealPolynomial.computeRealRoots(a, b, c);

            // Return the roots in ascending order.
            if (roots.length === 0) {
                return [0.0];
            } else if (roots[1] <= 0.0) {
                return [roots[0], roots[1], 0.0];
            } else if (roots[0] >= 0.0) {
                return [0.0, roots[0], roots[1]];
            }
            return [roots[0], 0.0, roots[1]];
        }

        return computeRealRoots(a, b, c, d);
    };

    return CubicRealPolynomial;
});
/*global define*/
define('Core/QuarticRealPolynomial',[
        './CubicRealPolynomial',
        './DeveloperError',
        './Math',
        './QuadraticRealPolynomial'
    ], function(
        CubicRealPolynomial,
        DeveloperError,
        CesiumMath,
        QuadraticRealPolynomial) {
    "use strict";

    /**
     * Defines functions for 4th order polynomial functions of one variable with only real coefficients.
     *
     * @namespace
     * @alias QuarticRealPolynomial
     */
    var QuarticRealPolynomial = {};

    /**
     * Provides the discriminant of the quartic equation from the supplied coefficients.
     *
     * @param {Number} a The coefficient of the 4th order monomial.
     * @param {Number} b The coefficient of the 3rd order monomial.
     * @param {Number} c The coefficient of the 2nd order monomial.
     * @param {Number} d The coefficient of the 1st order monomial.
     * @param {Number} e The coefficient of the 0th order monomial.
     * @returns {Number} The value of the discriminant.
     */
    QuarticRealPolynomial.computeDiscriminant = function(a, b, c, d, e) {
                if (typeof a !== 'number') {
            throw new DeveloperError('a is a required number.');
        }
        if (typeof b !== 'number') {
            throw new DeveloperError('b is a required number.');
        }
        if (typeof c !== 'number') {
            throw new DeveloperError('c is a required number.');
        }
        if (typeof d !== 'number') {
            throw new DeveloperError('d is a required number.');
        }
        if (typeof e !== 'number') {
            throw new DeveloperError('e is a required number.');
        }
        
        var a2 = a * a;
        var a3 = a2 * a;
        var b2 = b * b;
        var b3 = b2 * b;
        var c2 = c * c;
        var c3 = c2 * c;
        var d2 = d * d;
        var d3 = d2 * d;
        var e2 = e * e;
        var e3 = e2 * e;

        var discriminant = (b2 * c2 * d2 - 4.0 * b3 * d3 - 4.0 * a * c3 * d2 + 18 * a * b * c * d3 - 27.0 * a2 * d2 * d2 + 256.0 * a3 * e3) +
            e * (18.0 * b3 * c * d - 4.0 * b2 * c3 + 16.0 * a * c2 * c2 - 80.0 * a * b * c2 * d - 6.0 * a * b2 * d2 + 144.0 * a2 * c * d2) +
            e2 * (144.0 * a * b2 * c - 27.0 * b2 * b2 - 128.0 * a2 * c2 - 192.0 * a2 * b * d);
        return discriminant;
    };

    function original(a3, a2, a1, a0) {
        var a3Squared = a3 * a3;

        var p = a2 - 3.0 * a3Squared / 8.0;
        var q = a1 - a2 * a3 / 2.0 + a3Squared * a3 / 8.0;
        var r = a0 - a1 * a3 / 4.0 + a2 * a3Squared / 16.0 - 3.0 * a3Squared * a3Squared / 256.0;

        // Find the roots of the cubic equations:  h^6 + 2 p h^4 + (p^2 - 4 r) h^2 - q^2 = 0.
        var cubicRoots = CubicRealPolynomial.computeRealRoots(1.0, 2.0 * p, p * p - 4.0 * r, -q * q);

        if (cubicRoots.length > 0) {
            var temp = -a3 / 4.0;

            // Use the largest positive root.
            var hSquared = cubicRoots[cubicRoots.length - 1];

            if (Math.abs(hSquared) < CesiumMath.EPSILON14) {
                // y^4 + p y^2 + r = 0.
                var roots = QuadraticRealPolynomial.computeRealRoots(1.0, p, r);

                if (roots.length === 2) {
                    var root0 = roots[0];
                    var root1 = roots[1];

                    var y;
                    if (root0 >= 0.0 && root1 >= 0.0) {
                        var y0 = Math.sqrt(root0);
                        var y1 = Math.sqrt(root1);

                        return [temp - y1, temp - y0, temp + y0, temp + y1];
                    } else if (root0 >= 0.0 && root1 < 0.0) {
                        y = Math.sqrt(root0);
                        return [temp - y, temp + y];
                    } else if (root0 < 0.0 && root1 >= 0.0) {
                        y = Math.sqrt(root1);
                        return [temp - y, temp + y];
                    }
                }
                return [];
            } else if (hSquared > 0.0) {
                var h = Math.sqrt(hSquared);

                var m = (p + hSquared - q / h) / 2.0;
                var n = (p + hSquared + q / h) / 2.0;

                // Now solve the two quadratic factors:  (y^2 + h y + m)(y^2 - h y + n);
                var roots1 = QuadraticRealPolynomial.computeRealRoots(1.0, h, m);
                var roots2 = QuadraticRealPolynomial.computeRealRoots(1.0, -h, n);

                if (roots1.length !== 0) {
                    roots1[0] += temp;
                    roots1[1] += temp;

                    if (roots2.length !== 0) {
                        roots2[0] += temp;
                        roots2[1] += temp;

                        if (roots1[1] <= roots2[0]) {
                            return [roots1[0], roots1[1], roots2[0], roots2[1]];
                        } else if (roots2[1] <= roots1[0]) {
                            return [roots2[0], roots2[1], roots1[0], roots1[1]];
                        } else if (roots1[0] >= roots2[0] && roots1[1] <= roots2[1]) {
                            return [roots2[0], roots1[0], roots1[1], roots2[1]];
                        } else if (roots2[0] >= roots1[0] && roots2[1] <= roots1[1]) {
                            return [roots1[0], roots2[0], roots2[1], roots1[1]];
                        } else if (roots1[0] > roots2[0] && roots1[0] < roots2[1]) {
                            return [roots2[0], roots1[0], roots2[1], roots1[1]];
                        }
                        return [roots1[0], roots2[0], roots1[1], roots2[1]];
                    }
                    return roots1;
                }

                if (roots2.length !== 0) {
                    roots2[0] += temp;
                    roots2[1] += temp;

                    return roots2;
                }
                return [];
            }
        }
        return [];
    }

    function neumark(a3, a2, a1, a0) {
        var a1Squared = a1 * a1;
        var a2Squared = a2 * a2;
        var a3Squared = a3 * a3;

        var p = -2.0 * a2;
        var q = a1 * a3 + a2Squared - 4.0 * a0;
        var r = a3Squared * a0 - a1 * a2 * a3 + a1Squared;

        var cubicRoots = CubicRealPolynomial.computeRealRoots(1.0, p, q, r);

        if (cubicRoots.length > 0) {
            // Use the most positive root
            var y = cubicRoots[0];

            var temp = (a2 - y);
            var tempSquared = temp * temp;

            var g1 = a3 / 2.0;
            var h1 = temp / 2.0;

            var m = tempSquared - 4.0 * a0;
            var mError = tempSquared + 4.0 * Math.abs(a0);

            var n = a3Squared - 4.0 * y;
            var nError = a3Squared + 4.0 * Math.abs(y);

            var g2;
            var h2;

            if (y < 0.0 || (m * nError < n * mError)) {
                var squareRootOfN = Math.sqrt(n);
                g2 = squareRootOfN / 2.0;
                h2 = squareRootOfN === 0.0 ? 0.0 : (a3 * h1 - a1) / squareRootOfN;
            } else {
                var squareRootOfM = Math.sqrt(m);
                g2 = squareRootOfM === 0.0 ? 0.0 : (a3 * h1 - a1) / squareRootOfM;
                h2 = squareRootOfM / 2.0;
            }

            var G;
            var g;
            if (g1 === 0.0 && g2 === 0.0) {
                G = 0.0;
                g = 0.0;
            } else if (CesiumMath.sign(g1) === CesiumMath.sign(g2)) {
                G = g1 + g2;
                g = y / G;
            } else {
                g = g1 - g2;
                G = y / g;
            }

            var H;
            var h;
            if (h1 === 0.0 && h2 === 0.0) {
                H = 0.0;
                h = 0.0;
            } else if (CesiumMath.sign(h1) === CesiumMath.sign(h2)) {
                H = h1 + h2;
                h = a0 / H;
            } else {
                h = h1 - h2;
                H = a0 / h;
            }

            // Now solve the two quadratic factors:  (y^2 + G y + H)(y^2 + g y + h);
            var roots1 = QuadraticRealPolynomial.computeRealRoots(1.0, G, H);
            var roots2 = QuadraticRealPolynomial.computeRealRoots(1.0, g, h);

            if (roots1.length !== 0) {
                if (roots2.length !== 0) {
                    if (roots1[1] <= roots2[0]) {
                        return [roots1[0], roots1[1], roots2[0], roots2[1]];
                    } else if (roots2[1] <= roots1[0]) {
                        return [roots2[0], roots2[1], roots1[0], roots1[1]];
                    } else if (roots1[0] >= roots2[0] && roots1[1] <= roots2[1]) {
                        return [roots2[0], roots1[0], roots1[1], roots2[1]];
                    } else if (roots2[0] >= roots1[0] && roots2[1] <= roots1[1]) {
                        return [roots1[0], roots2[0], roots2[1], roots1[1]];
                    } else if (roots1[0] > roots2[0] && roots1[0] < roots2[1]) {
                        return [roots2[0], roots1[0], roots2[1], roots1[1]];
                    } else {
                        return [roots1[0], roots2[0], roots1[1], roots2[1]];
                    }
                }
                return roots1;
            }
            if (roots2.length !== 0) {
                return roots2;
            }
        }
        return [];
    }

    /**
     * Provides the real valued roots of the quartic polynomial with the provided coefficients.
     *
     * @param {Number} a The coefficient of the 4th order monomial.
     * @param {Number} b The coefficient of the 3rd order monomial.
     * @param {Number} c The coefficient of the 2nd order monomial.
     * @param {Number} d The coefficient of the 1st order monomial.
     * @param {Number} e The coefficient of the 0th order monomial.
     * @returns {Number[]} The real valued roots.
     */
    QuarticRealPolynomial.computeRealRoots = function(a, b, c, d, e) {
                if (typeof a !== 'number') {
            throw new DeveloperError('a is a required number.');
        }
        if (typeof b !== 'number') {
            throw new DeveloperError('b is a required number.');
        }
        if (typeof c !== 'number') {
            throw new DeveloperError('c is a required number.');
        }
        if (typeof d !== 'number') {
            throw new DeveloperError('d is a required number.');
        }
        if (typeof e !== 'number') {
            throw new DeveloperError('e is a required number.');
        }
        
        if (Math.abs(a) < CesiumMath.EPSILON15) {
            return CubicRealPolynomial.computeRealRoots(b, c, d, e);
        }
        var a3 = b / a;
        var a2 = c / a;
        var a1 = d / a;
        var a0 = e / a;

        var k = (a3 < 0.0) ? 1 : 0;
        k += (a2 < 0.0) ? k + 1 : k;
        k += (a1 < 0.0) ? k + 1 : k;
        k += (a0 < 0.0) ? k + 1 : k;

        switch (k) {
        case 0:
            return original(a3, a2, a1, a0);
        case 1:
            return neumark(a3, a2, a1, a0);
        case 2:
            return neumark(a3, a2, a1, a0);
        case 3:
            return original(a3, a2, a1, a0);
        case 4:
            return original(a3, a2, a1, a0);
        case 5:
            return neumark(a3, a2, a1, a0);
        case 6:
            return original(a3, a2, a1, a0);
        case 7:
            return original(a3, a2, a1, a0);
        case 8:
            return neumark(a3, a2, a1, a0);
        case 9:
            return original(a3, a2, a1, a0);
        case 10:
            return original(a3, a2, a1, a0);
        case 11:
            return neumark(a3, a2, a1, a0);
        case 12:
            return original(a3, a2, a1, a0);
        case 13:
            return original(a3, a2, a1, a0);
        case 14:
            return original(a3, a2, a1, a0);
        case 15:
            return original(a3, a2, a1, a0);
        default:
            return undefined;
        }
    };

    return QuarticRealPolynomial;
});
/*global define*/
define('Core/Ray',[
        './Cartesian3',
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Represents a ray that extends infinitely from the provided origin in the provided direction.
     * @alias Ray
     * @constructor
     *
     * @param {Cartesian3} [origin=Cartesian3.ZERO] The origin of the ray.
     * @param {Cartesian3} [direction=Cartesian3.ZERO] The direction of the ray.
     */
    var Ray = function(origin, direction) {
        direction = Cartesian3.clone(defaultValue(direction, Cartesian3.ZERO));
        if (!Cartesian3.equals(direction, Cartesian3.ZERO)) {
            Cartesian3.normalize(direction, direction);
        }

        /**
         * The origin of the ray.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.origin = Cartesian3.clone(defaultValue(origin, Cartesian3.ZERO));

        /**
         * The direction of the ray.
         * @type {Cartesian3}
         */
        this.direction = direction;
    };

    /**
     * Computes the point along the ray given by r(t) = o + t*d,
     * where o is the origin of the ray and d is the direction.
     *
     * @param {Number} t A scalar value.
     * @param {Cartesian3} [result] The object in which the result will be stored.
     * @returns The modified result parameter, or a new instance if none was provided.
     *
     * @example
     * //Get the first intersection point of a ray and an ellipsoid.
     * var intersection = Cesium.IntersectionTests.rayEllipsoid(ray, ellipsoid);
     * var point = Cesium.Ray.getPoint(ray, intersection.start);
     */
    Ray.getPoint = function(ray, t, result) {
                if (!defined(ray)){
            throw new DeveloperError('ray is requred');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is a required number');
        }
        
        if (!defined(result)) {
            result = new Cartesian3();
        }

        result = Cartesian3.multiplyByScalar(ray.direction, t, result);
        return Cartesian3.add(ray.origin, result, result);
    };

    return Ray;
});

/*global define*/
define('Core/IntersectionTests',[
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Math',
        './Matrix3',
        './QuadraticRealPolynomial',
        './QuarticRealPolynomial',
        './Ray'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        DeveloperError,
        CesiumMath,
        Matrix3,
        QuadraticRealPolynomial,
        QuarticRealPolynomial,
        Ray) {
    "use strict";

    /**
     * Functions for computing the intersection between geometries such as rays, planes, triangles, and ellipsoids.
     *
     * @namespace
     * @alias IntersectionTests
     */
    var IntersectionTests = {};

    /**
     * Computes the intersection of a ray and a plane.
     *
     * @param {Ray} ray The ray.
     * @param {Plane} plane The plane.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
     */
    IntersectionTests.rayPlane = function(ray, plane, result) {
                if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        
        if (!defined(result)) {
            result = new Cartesian3();
        }

        var origin = ray.origin;
        var direction = ray.direction;
        var normal = plane.normal;
        var denominator = Cartesian3.dot(normal, direction);

        if (Math.abs(denominator) < CesiumMath.EPSILON15) {
            // Ray is parallel to plane.  The ray may be in the polygon's plane.
            return undefined;
        }

        var t = (-plane.distance - Cartesian3.dot(normal, origin)) / denominator;

        if (t < 0) {
            return undefined;
        }

        result = Cartesian3.multiplyByScalar(direction, t, result);
        return Cartesian3.add(origin, result, result);
    };

    var scratchEdge0 = new Cartesian3();
    var scratchEdge1 = new Cartesian3();
    var scratchPVec = new Cartesian3();
    var scratchTVec = new Cartesian3();
    var scratchQVec = new Cartesian3();

    function rayTriangle(ray, p0, p1, p2, cullBackFaces) {
                if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(p0)) {
            throw new DeveloperError('p0 is required.');
        }
        if (!defined(p1)) {
            throw new DeveloperError('p1 is required.');
        }
        if (!defined(p2)) {
            throw new DeveloperError('p2 is required.');
        }
        
        cullBackFaces = defaultValue(cullBackFaces, false);

        var origin = ray.origin;
        var direction = ray.direction;

        var edge0 = Cartesian3.subtract(p1, p0, scratchEdge0);
        var edge1 = Cartesian3.subtract(p2, p0, scratchEdge1);

        var p = Cartesian3.cross(direction, edge1, scratchPVec);
        var det = Cartesian3.dot(edge0, p);

        var tvec;
        var q;

        var u;
        var v;
        var t;

        if (cullBackFaces) {
            if (det < CesiumMath.EPSILON6) {
                return undefined;
            }

            tvec = Cartesian3.subtract(origin, p0, scratchTVec);
            u = Cartesian3.dot(tvec, p);
            if (u < 0.0 || u > det) {
                return undefined;
            }

            q = Cartesian3.cross(tvec, edge0, scratchQVec);

            v = Cartesian3.dot(direction, q);
            if (v < 0.0 || u + v > det) {
                return undefined;
            }

            t = Cartesian3.dot(edge1, q) / det;
        } else {
            if (Math.abs(det) < CesiumMath.EPSILON6) {
                return undefined;
            }
            var invDet = 1.0 / det;

            tvec = Cartesian3.subtract(origin, p0, scratchTVec);
            u = Cartesian3.dot(tvec, p) * invDet;
            if (u < 0.0 || u > 1.0) {
                return undefined;
            }

            q = Cartesian3.cross(tvec, edge0, scratchQVec);

            v = Cartesian3.dot(direction, q) * invDet;
            if (v < 0.0 || u + v > 1.0) {
                return undefined;
            }

            t = Cartesian3.dot(edge1, q) * invDet;
        }

        return t;
    }

    /**
     * Computes the intersection of a ray and a triangle.
     * @memberof IntersectionTests
     *
     * @param {Ray} ray The ray.
     * @param {Cartesian3} p0 The first vertex of the triangle.
     * @param {Cartesian3} p1 The second vertex of the triangle.
     * @param {Cartesian3} p2 The third vertex of the triangle.
     * @param {Boolean} [cullBackFaces=false] If <code>true</code>, will only compute an intersection with the front face of the triangle
     *                  and return undefined for intersections with the back face.
     * @param {Cartesian3} [result] The <code>Cartesian3</code> onto which to store the result.
     * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
     */
    IntersectionTests.rayTriangle = function(ray, p0, p1, p2, cullBackFaces, result) {
        var t = rayTriangle(ray, p0, p1, p2, cullBackFaces);
        if (!defined(t) || t < 0.0) {
            return undefined;
        }

        if (!defined(result)) {
            result = new Cartesian3();
        }

        Cartesian3.multiplyByScalar(ray.direction, t, result);
        return Cartesian3.add(ray.origin, result, result);
    };

    var scratchLineSegmentTriangleRay = new Ray();

    /**
     * Computes the intersection of a line segment and a triangle.
     * @memberof IntersectionTests
     *
     * @param {Cartesian3} v0 The an end point of the line segment.
     * @param {Cartesian3} v1 The other end point of the line segment.
     * @param {Cartesian3} p0 The first vertex of the triangle.
     * @param {Cartesian3} p1 The second vertex of the triangle.
     * @param {Cartesian3} p2 The third vertex of the triangle.
     * @param {Boolean} [cullBackFaces=false] If <code>true</code>, will only compute an intersection with the front face of the triangle
     *                  and return undefined for intersections with the back face.
     * @param {Cartesian3} [result] The <code>Cartesian3</code> onto which to store the result.
     * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
     */
    IntersectionTests.lineSegmentTriangle = function(v0, v1, p0, p1, p2, cullBackFaces, result) {
                if (!defined(v0)) {
            throw new DeveloperError('v0 is required.');
        }
        if (!defined(v1)) {
            throw new DeveloperError('v1 is required.');
        }
        
        var ray = scratchLineSegmentTriangleRay;
        Cartesian3.clone(v0, ray.origin);
        Cartesian3.subtract(v1, v0, ray.direction);
        Cartesian3.normalize(ray.direction, ray.direction);

        var t = rayTriangle(ray, p0, p1, p2, cullBackFaces);
        if (!defined(t) || t < 0.0 || t > Cartesian3.distance(v0, v1)) {
            return undefined;
        }

        if (!defined(result)) {
            result = new Cartesian3();
        }

        Cartesian3.multiplyByScalar(ray.direction, t, result);
        return Cartesian3.add(ray.origin, result, result);
    };

    function solveQuadratic(a, b, c, result) {
        var det = b * b - 4.0 * a * c;
        if (det < 0.0) {
            return undefined;
        } else if (det > 0.0) {
            var denom = 1.0 / (2.0 * a);
            var disc = Math.sqrt(det);
            var root0 = (-b + disc) * denom;
            var root1 = (-b - disc) * denom;

            if (root0 < root1) {
                result.root0 = root0;
                result.root1 = root1;
            } else {
                result.root0 = root1;
                result.root1 = root0;
            }

            return result;
        }

        var root = -b / (2.0 * a);
        if (root === 0.0) {
            return undefined;
        }

        result.root0 = result.root1 = root;
        return result;
    }

    var raySphereRoots = {
        root0 : 0.0,
        root1 : 0.0
    };

    function raySphere(ray, sphere, result) {
        if (!defined(result)) {
            result = {};
        }

        var origin = ray.origin;
        var direction = ray.direction;

        var center = sphere.center;
        var radiusSquared = sphere.radius * sphere.radius;

        var diff = Cartesian3.subtract(origin, center, scratchPVec);

        var a = Cartesian3.dot(direction, direction);
        var b = 2.0 * Cartesian3.dot(direction, diff);
        var c = Cartesian3.magnitudeSquared(diff) - radiusSquared;

        var roots = solveQuadratic(a, b, c, raySphereRoots);
        if (!defined(roots)) {
            return undefined;
        }

        result.start = roots.root0;
        result.stop = roots.root1;
        return result;
    }

    /**
     * Computes the intersection points of a ray with a sphere.
     * @memberof IntersectionTests
     *
     * @param {Ray} ray The ray.
     * @param {BoundingSphere} sphere The sphere.
     * @param {Object} [result] The result onto which to store the result.
     * @returns {Object} An object with the first (<code>start</code>) and the second (<code>stop</code>) intersection scalars for points along the ray or undefined if there are no intersections.
     */
    IntersectionTests.raySphere = function(ray, sphere, result) {
                if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }
        
        result = raySphere(ray, sphere, result);
        if (!defined(result) || result.stop < 0.0) {
            return undefined;
        }

        result.start = Math.max(result.start, 0.0);
        return result;
    };

    var scratchLineSegmentRay = new Ray();

    /**
     * Computes the intersection points of a line segment with a sphere.
     * @memberof IntersectionTests
     *
     * @param {Cartesian3} p0 An end point of the line segment.
     * @param {Cartesian3} p1 The other end point of the line segment.
     * @param {BoundingSphere} sphere The sphere.
     * @param {Object} [result] The result onto which to store the result.
     * @returns {Object} An object with the first (<code>start</code>) and the second (<code>stop</code>) intersection scalars for points along the line segment or undefined if there are no intersections.
     */
    IntersectionTests.lineSegmentSphere = function(p0, p1, sphere, result) {
                if (!defined(p0)) {
            throw new DeveloperError('p0 is required.');
        }
        if (!defined(p1)) {
            throw new DeveloperError('p1 is required.');
        }
        if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }
        
        var ray = scratchLineSegmentRay;
        var origin = Cartesian3.clone(p0, ray.origin);
        var direction = Cartesian3.subtract(p1, p0, ray.direction);

        var maxT = Cartesian3.magnitude(direction);
        Cartesian3.normalize(direction, direction);

        result = raySphere(ray, sphere, result);
        if (!defined(result) || result.stop < 0.0 || result.start > maxT) {
            return undefined;
        }

        result.start = Math.max(result.start, 0.0);
        result.stop = Math.min(result.stop, maxT);
        return result;
    };

    var scratchQ = new Cartesian3();
    var scratchW = new Cartesian3();

    /**
     * Computes the intersection points of a ray with an ellipsoid.
     *
     * @param {Ray} ray The ray.
     * @param {Ellipsoid} ellipsoid The ellipsoid.
     * @returns {Object} An object with the first (<code>start</code>) and the second (<code>stop</code>) intersection scalars for points along the ray or undefined if there are no intersections.
     */
    IntersectionTests.rayEllipsoid = function(ray, ellipsoid) {
                if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(ellipsoid)) {
            throw new DeveloperError('ellipsoid is required.');
        }
        
        var inverseRadii = ellipsoid.oneOverRadii;
        var q = Cartesian3.multiplyComponents(inverseRadii, ray.origin, scratchQ);
        var w = Cartesian3.multiplyComponents(inverseRadii, ray.direction, scratchW);

        var q2 = Cartesian3.magnitudeSquared(q);
        var qw = Cartesian3.dot(q, w);

        var difference, w2, product, discriminant, temp;

        if (q2 > 1.0) {
            // Outside ellipsoid.
            if (qw >= 0.0) {
                // Looking outward or tangent (0 intersections).
                return undefined;
            }

            // qw < 0.0.
            var qw2 = qw * qw;
            difference = q2 - 1.0; // Positively valued.
            w2 = Cartesian3.magnitudeSquared(w);
            product = w2 * difference;

            if (qw2 < product) {
                // Imaginary roots (0 intersections).
                return undefined;
            } else if (qw2 > product) {
                // Distinct roots (2 intersections).
                discriminant = qw * qw - product;
                temp = -qw + Math.sqrt(discriminant); // Avoid cancellation.
                var root0 = temp / w2;
                var root1 = difference / temp;
                if (root0 < root1) {
                    return {
                        start : root0,
                        stop : root1
                    };
                }

                return {
                    start : root1,
                    stop : root0
                };
            } else {
                // qw2 == product.  Repeated roots (2 intersections).
                var root = Math.sqrt(difference / w2);
                return {
                    start : root,
                    stop : root
                };
            }
        } else if (q2 < 1.0) {
            // Inside ellipsoid (2 intersections).
            difference = q2 - 1.0; // Negatively valued.
            w2 = Cartesian3.magnitudeSquared(w);
            product = w2 * difference; // Negatively valued.

            discriminant = qw * qw - product;
            temp = -qw + Math.sqrt(discriminant); // Positively valued.
            return {
                start : 0.0,
                stop : temp / w2
            };
        } else {
            // q2 == 1.0. On ellipsoid.
            if (qw < 0.0) {
                // Looking inward.
                w2 = Cartesian3.magnitudeSquared(w);
                return {
                    start : 0.0,
                    stop : -qw / w2
                };
            }

            // qw >= 0.0.  Looking outward or tangent.
            return undefined;
        }
    };

    function addWithCancellationCheck(left, right, tolerance) {
        var difference = left + right;
        if ((CesiumMath.sign(left) !== CesiumMath.sign(right)) &&
                Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < tolerance) {
            return 0.0;
        }

        return difference;
    }

    function quadraticVectorExpression(A, b, c, x, w) {
        var xSquared = x * x;
        var wSquared = w * w;

        var l2 = (A[Matrix3.COLUMN1ROW1] - A[Matrix3.COLUMN2ROW2]) * wSquared;
        var l1 = w * (x * addWithCancellationCheck(A[Matrix3.COLUMN1ROW0], A[Matrix3.COLUMN0ROW1], CesiumMath.EPSILON15) + b.y);
        var l0 = (A[Matrix3.COLUMN0ROW0] * xSquared + A[Matrix3.COLUMN2ROW2] * wSquared) + x * b.x + c;

        var r1 = wSquared * addWithCancellationCheck(A[Matrix3.COLUMN2ROW1], A[Matrix3.COLUMN1ROW2], CesiumMath.EPSILON15);
        var r0 = w * (x * addWithCancellationCheck(A[Matrix3.COLUMN2ROW0], A[Matrix3.COLUMN0ROW2]) + b.z);

        var cosines;
        var solutions = [];
        if (r0 === 0.0 && r1 === 0.0) {
            cosines = QuadraticRealPolynomial.computeRealRoots(l2, l1, l0);
            if (cosines.length === 0) {
                return solutions;
            }

            var cosine0 = cosines[0];
            var sine0 = Math.sqrt(Math.max(1.0 - cosine0 * cosine0, 0.0));
            solutions.push(new Cartesian3(x, w * cosine0, w * -sine0));
            solutions.push(new Cartesian3(x, w * cosine0, w * sine0));

            if (cosines.length === 2) {
                var cosine1 = cosines[1];
                var sine1 = Math.sqrt(Math.max(1.0 - cosine1 * cosine1, 0.0));
                solutions.push(new Cartesian3(x, w * cosine1, w * -sine1));
                solutions.push(new Cartesian3(x, w * cosine1, w * sine1));
            }

            return solutions;
        }

        var r0Squared = r0 * r0;
        var r1Squared = r1 * r1;
        var l2Squared = l2 * l2;
        var r0r1 = r0 * r1;

        var c4 = l2Squared + r1Squared;
        var c3 = 2.0 * (l1 * l2 + r0r1);
        var c2 = 2.0 * l0 * l2 + l1 * l1 - r1Squared + r0Squared;
        var c1 = 2.0 * (l0 * l1 - r0r1);
        var c0 = l0 * l0 - r0Squared;

        if (c4 === 0.0 && c3 === 0.0 && c2 === 0.0 && c1 === 0.0) {
            return solutions;
        }

        cosines = QuarticRealPolynomial.computeRealRoots(c4, c3, c2, c1, c0);
        var length = cosines.length;
        if (length === 0) {
            return solutions;
        }

        for ( var i = 0; i < length; ++i) {
            var cosine = cosines[i];
            var cosineSquared = cosine * cosine;
            var sineSquared = Math.max(1.0 - cosineSquared, 0.0);
            var sine = Math.sqrt(sineSquared);

            //var left = l2 * cosineSquared + l1 * cosine + l0;
            var left;
            if (CesiumMath.sign(l2) === CesiumMath.sign(l0)) {
                left = addWithCancellationCheck(l2 * cosineSquared + l0, l1 * cosine, CesiumMath.EPSILON12);
            } else if (CesiumMath.sign(l0) === CesiumMath.sign(l1 * cosine)) {
                left = addWithCancellationCheck(l2 * cosineSquared, l1 * cosine + l0, CesiumMath.EPSILON12);
            } else {
                left = addWithCancellationCheck(l2 * cosineSquared + l1 * cosine, l0, CesiumMath.EPSILON12);
            }

            var right = addWithCancellationCheck(r1 * cosine, r0, CesiumMath.EPSILON15);
            var product = left * right;

            if (product < 0.0) {
                solutions.push(new Cartesian3(x, w * cosine, w * sine));
            } else if (product > 0.0) {
                solutions.push(new Cartesian3(x, w * cosine, w * -sine));
            } else if (sine !== 0.0) {
                solutions.push(new Cartesian3(x, w * cosine, w * -sine));
                solutions.push(new Cartesian3(x, w * cosine, w * sine));
                ++i;
            } else {
                solutions.push(new Cartesian3(x, w * cosine, w * sine));
            }
        }

        return solutions;
    }

    var firstAxisScratch = new Cartesian3();
    var secondAxisScratch = new Cartesian3();
    var thirdAxisScratch = new Cartesian3();
    var referenceScratch = new Cartesian3();
    var bCart = new Cartesian3();
    var bScratch = new Matrix3();
    var btScratch = new Matrix3();
    var diScratch = new Matrix3();
    var dScratch = new Matrix3();
    var cScratch = new Matrix3();
    var tempMatrix = new Matrix3();
    var aScratch = new Matrix3();
    var sScratch = new Cartesian3();
    var closestScratch = new Cartesian3();
    var surfPointScratch = new Cartographic();

    /**
     * Provides the point along the ray which is nearest to the ellipsoid.
     *
     * @param {Ray} ray The ray.
     * @param {Ellipsoid} ellipsoid The ellipsoid.
     * @returns {Cartesian} The nearest planetodetic point on the ray.
     */
    IntersectionTests.grazingAltitudeLocation = function(ray, ellipsoid) {
                if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(ellipsoid)) {
            throw new DeveloperError('ellipsoid is required.');
        }
        
        var position = ray.origin;
        var direction = ray.direction;

        var normal = ellipsoid.geodeticSurfaceNormal(position, firstAxisScratch);
        if (Cartesian3.dot(direction, normal) >= 0.0) { // The location provided is the closest point in altitude
            return position;
        }

        var intersects = defined(this.rayEllipsoid(ray, ellipsoid));

        // Compute the scaled direction vector.
        var f = ellipsoid.transformPositionToScaledSpace(direction, firstAxisScratch);

        // Constructs a basis from the unit scaled direction vector. Construct its rotation and transpose.
        var firstAxis = Cartesian3.normalize(f, f);
        var reference = Cartesian3.mostOrthogonalAxis(f, referenceScratch);
        var secondAxis = Cartesian3.normalize(Cartesian3.cross(reference, firstAxis, secondAxisScratch), secondAxisScratch);
        var thirdAxis  = Cartesian3.normalize(Cartesian3.cross(firstAxis, secondAxis, thirdAxisScratch), thirdAxisScratch);
        var B = bScratch;
        B[0] = firstAxis.x;
        B[1] = firstAxis.y;
        B[2] = firstAxis.z;
        B[3] = secondAxis.x;
        B[4] = secondAxis.y;
        B[5] = secondAxis.z;
        B[6] = thirdAxis.x;
        B[7] = thirdAxis.y;
        B[8] = thirdAxis.z;

        var B_T = Matrix3.transpose(B, btScratch);

        // Get the scaling matrix and its inverse.
        var D_I = Matrix3.fromScale(ellipsoid.radii, diScratch);
        var D = Matrix3.fromScale(ellipsoid.oneOverRadii, dScratch);

        var C = cScratch;
        C[0] = 0.0;
        C[1] = -direction.z;
        C[2] = direction.y;
        C[3] = direction.z;
        C[4] = 0.0;
        C[5] = -direction.x;
        C[6] = -direction.y;
        C[7] = direction.x;
        C[8] = 0.0;

        var temp = Matrix3.multiply(Matrix3.multiply(B_T, D, tempMatrix), C, tempMatrix);
        var A = Matrix3.multiply(Matrix3.multiply(temp, D_I, aScratch), B, aScratch);
        var b = Matrix3.multiplyByVector(temp, position, bCart);

        // Solve for the solutions to the expression in standard form:
        var solutions = quadraticVectorExpression(A, Cartesian3.negate(b, firstAxisScratch), 0.0, 0.0, 1.0);

        var s;
        var altitude;
        var length = solutions.length;
        if (length > 0) {
            var closest = Cartesian3.clone(Cartesian3.ZERO, closestScratch);
            var maximumValue = Number.NEGATIVE_INFINITY;

            for ( var i = 0; i < length; ++i) {
                s = Matrix3.multiplyByVector(D_I, Matrix3.multiplyByVector(B, solutions[i], sScratch), sScratch);
                var v = Cartesian3.normalize(Cartesian3.subtract(s, position, referenceScratch), referenceScratch);
                var dotProduct = Cartesian3.dot(v, direction);

                if (dotProduct > maximumValue) {
                    maximumValue = dotProduct;
                    closest = Cartesian3.clone(s, closest);
                }
            }

            var surfacePoint = ellipsoid.cartesianToCartographic(closest, surfPointScratch);
            maximumValue = CesiumMath.clamp(maximumValue, 0.0, 1.0);
            altitude = Cartesian3.magnitude(Cartesian3.subtract(closest, position, referenceScratch)) * Math.sqrt(1.0 - maximumValue * maximumValue);
            altitude = intersects ? -altitude : altitude;
            surfacePoint.height = altitude;
            return ellipsoid.cartographicToCartesian(surfacePoint, new Cartesian3());
        }

        return undefined;
    };

    var lineSegmentPlaneDifference = new Cartesian3();

    /**
     * Computes the intersection of a line segment and a plane.
     *
     * @param {Cartesian3} endPoint0 An end point of the line segment.
     * @param {Cartesian3} endPoint1 The other end point of the line segment.
     * @param {Plane} plane The plane.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The intersection point or undefined if there is no intersection.
     *
     * @example
     * var origin = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
     * var normal = ellipsoid.geodeticSurfaceNormal(origin);
     * var plane = Cesium.Plane.fromPointNormal(origin, normal);
     *
     * var p0 = new Cesium.Cartesian3(...);
     * var p1 = new Cesium.Cartesian3(...);
     *
     * // find the intersection of the line segment from p0 to p1 and the tangent plane at origin.
     * var intersection = Cesium.IntersectionTests.lineSegmentPlane(p0, p1, plane);
     */
    IntersectionTests.lineSegmentPlane = function(endPoint0, endPoint1, plane, result) {
                if (!defined(endPoint0)) {
            throw new DeveloperError('endPoint0 is required.');
        }
        if (!defined(endPoint1)) {
            throw new DeveloperError('endPoint1 is required.');
        }
        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        
        if (!defined(result)) {
            result = new Cartesian3();
        }

        var difference = Cartesian3.subtract(endPoint1, endPoint0, lineSegmentPlaneDifference);
        var normal = plane.normal;
        var nDotDiff = Cartesian3.dot(normal, difference);

        // check if the segment and plane are parallel
        if (Math.abs(nDotDiff) < CesiumMath.EPSILON6) {
            return undefined;
        }

        var nDotP0 = Cartesian3.dot(normal, endPoint0);
        var t = -(plane.distance + nDotP0) / nDotDiff;

        // intersection only if t is in [0, 1]
        if (t < 0.0 || t > 1.0) {
            return undefined;
        }

        // intersection is endPoint0 + t * (endPoint1 - endPoint0)
        Cartesian3.multiplyByScalar(difference, t, result);
        Cartesian3.add(endPoint0, result, result);
        return result;
    };

    /**
     * Computes the intersection of a triangle and a plane
     *
     * @param {Cartesian3} p0 First point of the triangle
     * @param {Cartesian3} p1 Second point of the triangle
     * @param {Cartesian3} p2 Third point of the triangle
     * @param {Plane} plane Intersection plane
     * @returns {Object} An object with properties <code>positions</code> and <code>indices</code>, which are arrays that represent three triangles that do not cross the plane. (Undefined if no intersection exists)
     *
     * @example
     * var origin = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
     * var normal = ellipsoid.geodeticSurfaceNormal(origin);
     * var plane = Cesium.Plane.fromPointNormal(origin, normal);
     *
     * var p0 = new Cesium.Cartesian3(...);
     * var p1 = new Cesium.Cartesian3(...);
     * var p2 = new Cesium.Cartesian3(...);
     *
     * // convert the triangle composed of points (p0, p1, p2) to three triangles that don't cross the plane
     * var triangles = Cesium.IntersectionTests.trianglePlaneIntersection(p0, p1, p2, plane);
     */
    IntersectionTests.trianglePlaneIntersection = function(p0, p1, p2, plane) {
                if ((!defined(p0)) ||
            (!defined(p1)) ||
            (!defined(p2)) ||
            (!defined(plane))) {
            throw new DeveloperError('p0, p1, p2, and plane are required.');
        }
        
        var planeNormal = plane.normal;
        var planeD = plane.distance;
        var p0Behind = (Cartesian3.dot(planeNormal, p0) + planeD) < 0.0;
        var p1Behind = (Cartesian3.dot(planeNormal, p1) + planeD) < 0.0;
        var p2Behind = (Cartesian3.dot(planeNormal, p2) + planeD) < 0.0;
        // Given these dots products, the calls to lineSegmentPlaneIntersection
        // always have defined results.

        var numBehind = 0;
        numBehind += p0Behind ? 1 : 0;
        numBehind += p1Behind ? 1 : 0;
        numBehind += p2Behind ? 1 : 0;

        var u1, u2;
        if (numBehind === 1 || numBehind === 2) {
            u1 = new Cartesian3();
            u2 = new Cartesian3();
        }

        if (numBehind === 1) {
            if (p0Behind) {
                IntersectionTests.lineSegmentPlane(p0, p1, plane, u1);
                IntersectionTests.lineSegmentPlane(p0, p2, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        0, 3, 4,

                        // In front
                        1, 2, 4,
                        1, 4, 3
                    ]
                };
            } else if (p1Behind) {
                IntersectionTests.lineSegmentPlane(p1, p2, plane, u1);
                IntersectionTests.lineSegmentPlane(p1, p0, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        1, 3, 4,

                        // In front
                        2, 0, 4,
                        2, 4, 3
                    ]
                };
            } else if (p2Behind) {
                IntersectionTests.lineSegmentPlane(p2, p0, plane, u1);
                IntersectionTests.lineSegmentPlane(p2, p1, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        2, 3, 4,

                        // In front
                        0, 1, 4,
                        0, 4, 3
                    ]
                };
            }
        } else if (numBehind === 2) {
            if (!p0Behind) {
                IntersectionTests.lineSegmentPlane(p1, p0, plane, u1);
                IntersectionTests.lineSegmentPlane(p2, p0, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        1, 2, 4,
                        1, 4, 3,

                        // In front
                        0, 3, 4
                    ]
                };
            } else if (!p1Behind) {
                IntersectionTests.lineSegmentPlane(p2, p1, plane, u1);
                IntersectionTests.lineSegmentPlane(p0, p1, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        2, 0, 4,
                        2, 4, 3,

                        // In front
                        1, 3, 4
                    ]
                };
            } else if (!p2Behind) {
                IntersectionTests.lineSegmentPlane(p0, p2, plane, u1);
                IntersectionTests.lineSegmentPlane(p1, p2, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        0, 1, 4,
                        0, 4, 3,

                        // In front
                        2, 3, 4
                    ]
                };
            }
        }

        // if numBehind is 3, the triangle is completely behind the plane;
        // otherwise, it is completely in front (numBehind is 0).
        return undefined;
    };

    return IntersectionTests;
});

/*global define*/
define('Core/Plane',[
        './Cartesian3',
        './defined',
        './DeveloperError'
    ], function(
        Cartesian3,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * A plane in Hessian Normal Form defined by
     * <pre>
     * ax + by + cz + d = 0
     * </pre>
     * where (a, b, c) is the plane's <code>normal</code>, d is the signed
     * <code>distance</code> to the plane, and (x, y, z) is any point on
     * the plane.
     *
     * @alias Plane
     * @constructor
     *
     * @param {Cartesian3} normal The plane's normal (normalized).
     * @param {Number} distance The shortest distance from the origin to the plane.  The sign of
     * <code>distance</code> determines which side of the plane the origin
     * is on.  If <code>distance</code> is positive, the origin is in the half-space
     * in the direction of the normal; if negative, the origin is in the half-space
     * opposite to the normal; if zero, the plane passes through the origin.
     *
     * @example
     * // The plane x=0
     * var plane = new Cesium.Plane(Cesium.Cartesian3.UNIT_X, 0.0);
     */
    var Plane = function(normal, distance) {
                if (!defined(normal))  {
            throw new DeveloperError('normal is required.');
        }
        if (!defined(distance)) {
            throw new DeveloperError('distance is required.');
        }
        
        /**
         * The plane's normal.
         *
         * @type {Cartesian3}
         */
        this.normal = Cartesian3.clone(normal);

        /**
         * The shortest distance from the origin to the plane.  The sign of
         * <code>distance</code> determines which side of the plane the origin
         * is on.  If <code>distance</code> is positive, the origin is in the half-space
         * in the direction of the normal; if negative, the origin is in the half-space
         * opposite to the normal; if zero, the plane passes through the origin.
         *
         * @type {Number}
         */
        this.distance = distance;
    };

    /**
     * Creates a plane from a normal and a point on the plane.
     *
     * @param {Cartesian3} point The point on the plane.
     * @param {Cartesian3} normal The plane's normal (normalized).
     * @param {Plane} [result] The object onto which to store the result.
     * @returns {Plane} A new plane instance or the modified result parameter.
     *
     * @example
     * var point = Cesium.Cartesian3.fromDegrees(-72.0, 40.0);
     * var normal = ellipsoid.geodeticSurfaceNormal(point);
     * var tangentPlane = Cesium.Plane.fromPointNormal(point, normal);
     */
    Plane.fromPointNormal = function(point, normal, result) {
                if (!defined(point)) {
            throw new DeveloperError('point is required.');
        }
        if (!defined(normal)) {
            throw new DeveloperError('normal is required.');
        }
        
        var distance = -Cartesian3.dot(normal, point);

        if (!defined(result)) {
            return new Plane(normal, distance);
        }

        Cartesian3.clone(normal, result.normal);
        result.distance = distance;
        return result;
    };

    /**
     * Computes the signed shortest distance of a point to a plane.
     * The sign of the distance determines which side of the plane the point
     * is on.  If the distance is positive, the point is in the half-space
     * in the direction of the normal; if negative, the point is in the half-space
     * opposite to the normal; if zero, the plane passes through the point.
     *
     * @param {Plane} plane The plane.
     * @param {Cartesian3} point The point.
     * @returns {Number} The signed shortest distance of the point to the plane.
     */
    Plane.getPointDistance = function(plane, point) {
                if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        if (!defined(point)) {
            throw new DeveloperError('point is required.');
        }
        
        return Cartesian3.dot(plane.normal, point) + plane.distance;
    };

    return Plane;
});

/*global define*/
define('Core/Tipsify',[
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Encapsulates an algorithm to optimize triangles for the post
     * vertex-shader cache.  This is based on the 2007 SIGGRAPH paper
     * 'Fast Triangle Reordering for Vertex Locality and Reduced Overdraw.'
     * The runtime is linear but several passes are made.
     *
     * @namespace
     * @alias Tipsify
     *
     * @see <a href='http://gfx.cs.princeton.edu/pubs/Sander_2007_%3ETR/tipsy.pdf'>
     * Fast Triangle Reordering for Vertex Locality and Reduced Overdraw</a>
     * by Sander, Nehab, and Barczak
     *
     * @private
     */
    var Tipsify = {};

    /**
     * Calculates the average cache miss ratio (ACMR) for a given set of indices.
     *
     * @param {Object} options Object with the following properties:
     * @param {Number[]} options.indices Lists triads of numbers corresponding to the indices of the vertices
     *                        in the vertex buffer that define the geometry's triangles.
     * @param {Number} [options.maximumIndex] The maximum value of the elements in <code>args.indices</code>.
     *                                     If not supplied, this value will be computed.
     * @param {Number} [options.cacheSize=24] The number of vertices that can be stored in the cache at any one time.
     * @returns {Number} The average cache miss ratio (ACMR).
     *
     * @exception {DeveloperError} indices length must be a multiple of three.
     * @exception {DeveloperError} cacheSize must be greater than two.
     *
     * @example
     * var indices = [0, 1, 2, 3, 4, 5];
     * var maxIndex = 5;
     * var cacheSize = 3;
     * var acmr = Cesium.Tipsify.calculateACMR({indices : indices, maxIndex : maxIndex, cacheSize : cacheSize});
     */
    Tipsify.calculateACMR = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var indices = options.indices;
        var maximumIndex = options.maximumIndex;
        var cacheSize = defaultValue(options.cacheSize, 24);

                if (!defined(indices)) {
            throw new DeveloperError('indices is required.');
        }
        
        var numIndices = indices.length;

                if (numIndices < 3 || numIndices % 3 !== 0) {
            throw new DeveloperError('indices length must be a multiple of three.');
        }
        if (maximumIndex <= 0) {
            throw new DeveloperError('maximumIndex must be greater than zero.');
        }
        if (cacheSize < 3) {
            throw new DeveloperError('cacheSize must be greater than two.');
        }
        
        // Compute the maximumIndex if not given
        if (!defined(maximumIndex)) {
            maximumIndex = 0;
            var currentIndex = 0;
            var intoIndices = indices[currentIndex];
            while (currentIndex < numIndices) {
                if (intoIndices > maximumIndex) {
                    maximumIndex = intoIndices;
                }
                ++currentIndex;
                intoIndices = indices[currentIndex];
            }
        }

        // Vertex time stamps
        var vertexTimeStamps = [];
        for ( var i = 0; i < maximumIndex + 1; i++) {
            vertexTimeStamps[i] = 0;
        }

        // Cache processing
        var s = cacheSize + 1;
        for ( var j = 0; j < numIndices; ++j) {
            if ((s - vertexTimeStamps[indices[j]]) > cacheSize) {
                vertexTimeStamps[indices[j]] = s;
                ++s;
            }
        }

        return (s - cacheSize + 1) / (numIndices / 3);
    };

    /**
     * Optimizes triangles for the post-vertex shader cache.
     *
     * @param {Number[]} options.indices Lists triads of numbers corresponding to the indices of the vertices
     *                        in the vertex buffer that define the geometry's triangles.
     * @param {Number} [options.maximumIndex] The maximum value of the elements in <code>args.indices</code>.
     *                                     If not supplied, this value will be computed.
     * @param {Number} [options.cacheSize=24] The number of vertices that can be stored in the cache at any one time.
     * @returns {Number[]} A list of the input indices in an optimized order.
     *
     * @exception {DeveloperError} indices length must be a multiple of three.
     * @exception {DeveloperError} cacheSize must be greater than two.
     *
     * @example
     * var indices = [0, 1, 2, 3, 4, 5];
     * var maxIndex = 5;
     * var cacheSize = 3;
     * var reorderedIndices = Cesium.Tipsify.tipsify({indices : indices, maxIndex : maxIndex, cacheSize : cacheSize});
     */
    Tipsify.tipsify = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var indices = options.indices;
        var maximumIndex = options.maximumIndex;
        var cacheSize = defaultValue(options.cacheSize, 24);

        var cursor;

        function skipDeadEnd(vertices, deadEnd, indices, maximumIndexPlusOne) {
            while (deadEnd.length >= 1) {
                // while the stack is not empty
                var d = deadEnd[deadEnd.length - 1]; // top of the stack
                deadEnd.splice(deadEnd.length - 1, 1); // pop the stack

                if (vertices[d].numLiveTriangles > 0) {
                    return d;
                }
            }

            while (cursor < maximumIndexPlusOne) {
                if (vertices[cursor].numLiveTriangles > 0) {
                    ++cursor;
                    return cursor - 1;
                }
                ++cursor;
            }
            return -1;
        }

        function getNextVertex(indices, cacheSize, oneRing, vertices, s, deadEnd, maximumIndexPlusOne) {
            var n = -1;
            var p;
            var m = -1;
            var itOneRing = 0;
            while (itOneRing < oneRing.length) {
                var index = oneRing[itOneRing];
                if (vertices[index].numLiveTriangles) {
                    p = 0;
                    if ((s - vertices[index].timeStamp + (2 * vertices[index].numLiveTriangles)) <= cacheSize) {
                        p = s - vertices[index].timeStamp;
                    }
                    if ((p > m) || (m === -1)) {
                        m = p;
                        n = index;
                    }
                }
                ++itOneRing;
            }
            if (n === -1) {
                return skipDeadEnd(vertices, deadEnd, indices, maximumIndexPlusOne);
            }
            return n;
        }

                if (!defined(indices)) {
            throw new DeveloperError('indices is required.');
        }
        
        var numIndices = indices.length;

                if (numIndices < 3 || numIndices % 3 !== 0) {
            throw new DeveloperError('indices length must be a multiple of three.');
        }
        if (maximumIndex <= 0) {
            throw new DeveloperError('maximumIndex must be greater than zero.');
        }
        if (cacheSize < 3) {
            throw new DeveloperError('cacheSize must be greater than two.');
        }
        
        // Determine maximum index
        var maximumIndexPlusOne = 0;
        var currentIndex = 0;
        var intoIndices = indices[currentIndex];
        var endIndex = numIndices;
        if (defined(maximumIndex)) {
            maximumIndexPlusOne = maximumIndex + 1;
        } else {
            while (currentIndex < endIndex) {
                if (intoIndices > maximumIndexPlusOne) {
                    maximumIndexPlusOne = intoIndices;
                }
                ++currentIndex;
                intoIndices = indices[currentIndex];
            }
            if (maximumIndexPlusOne === -1) {
                return 0;
            }
            ++maximumIndexPlusOne;
        }

        // Vertices
        var vertices = [];
        for ( var i = 0; i < maximumIndexPlusOne; i++) {
            vertices[i] = {
                numLiveTriangles : 0,
                timeStamp : 0,
                vertexTriangles : []
            };
        }
        currentIndex = 0;
        var triangle = 0;
        while (currentIndex < endIndex) {
            vertices[indices[currentIndex]].vertexTriangles.push(triangle);
            ++(vertices[indices[currentIndex]]).numLiveTriangles;
            vertices[indices[currentIndex + 1]].vertexTriangles.push(triangle);
            ++(vertices[indices[currentIndex + 1]]).numLiveTriangles;
            vertices[indices[currentIndex + 2]].vertexTriangles.push(triangle);
            ++(vertices[indices[currentIndex + 2]]).numLiveTriangles;
            ++triangle;
            currentIndex += 3;
        }

        // Starting index
        var f = 0;

        // Time Stamp
        var s = cacheSize + 1;
        cursor = 1;

        // Process
        var oneRing = [];
        var deadEnd = []; //Stack
        var vertex;
        var intoVertices;
        var currentOutputIndex = 0;
        var outputIndices = [];
        var numTriangles = numIndices / 3;
        var triangleEmitted = [];
        for (i = 0; i < numTriangles; i++) {
            triangleEmitted[i] = false;
        }
        var index;
        var limit;
        while (f !== -1) {
            oneRing = [];
            intoVertices = vertices[f];
            limit = intoVertices.vertexTriangles.length;
            for ( var k = 0; k < limit; ++k) {
                triangle = intoVertices.vertexTriangles[k];
                if (!triangleEmitted[triangle]) {
                    triangleEmitted[triangle] = true;
                    currentIndex = triangle + triangle + triangle;
                    for ( var j = 0; j < 3; ++j) {
                        // Set this index as a possible next index
                        index = indices[currentIndex];
                        oneRing.push(index);
                        deadEnd.push(index);

                        // Output index
                        outputIndices[currentOutputIndex] = index;
                        ++currentOutputIndex;

                        // Cache processing
                        vertex = vertices[index];
                        --vertex.numLiveTriangles;
                        if ((s - vertex.timeStamp) > cacheSize) {
                            vertex.timeStamp = s;
                            ++s;
                        }
                        ++currentIndex;
                    }
                }
            }
            f = getNextVertex(indices, cacheSize, oneRing, vertices, s, deadEnd, maximumIndexPlusOne);
        }

        return outputIndices;
    };

    return Tipsify;
});

/*global define*/
define('Core/GeometryPipeline',[
        './AttributeCompression',
        './barycentricCoordinates',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './Cartographic',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './EncodedCartesian3',
        './GeographicProjection',
        './Geometry',
        './GeometryAttribute',
        './GeometryInstance',
        './GeometryType',
        './IndexDatatype',
        './Intersect',
        './IntersectionTests',
        './Math',
        './Matrix3',
        './Matrix4',
        './Plane',
        './PrimitiveType',
        './Tipsify'
    ], function(
        AttributeCompression,
        barycentricCoordinates,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        EncodedCartesian3,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        GeometryInstance,
        GeometryType,
        IndexDatatype,
        Intersect,
        IntersectionTests,
        CesiumMath,
        Matrix3,
        Matrix4,
        Plane,
        PrimitiveType,
        Tipsify) {
    "use strict";

    /**
     * Content pipeline functions for geometries.
     *
     * @namespace
     * @alias GeometryPipeline
     *
     * @see Geometry
     */
    var GeometryPipeline = {};

    function addTriangle(lines, index, i0, i1, i2) {
        lines[index++] = i0;
        lines[index++] = i1;

        lines[index++] = i1;
        lines[index++] = i2;

        lines[index++] = i2;
        lines[index] = i0;
    }

    function trianglesToLines(triangles) {
        var count = triangles.length;
        var size = (count / 3) * 6;
        var lines = IndexDatatype.createTypedArray(count, size);

        var index = 0;
        for ( var i = 0; i < count; i += 3, index += 6) {
            addTriangle(lines, index, triangles[i], triangles[i + 1], triangles[i + 2]);
        }

        return lines;
    }

    function triangleStripToLines(triangles) {
        var count = triangles.length;
        if (count >= 3) {
            var size = (count - 2) * 6;
            var lines = IndexDatatype.createTypedArray(count, size);

            addTriangle(lines, 0, triangles[0], triangles[1], triangles[2]);
            var index = 6;

            for ( var i = 3; i < count; ++i, index += 6) {
                addTriangle(lines, index, triangles[i - 1], triangles[i], triangles[i - 2]);
            }

            return lines;
        }

        return new Uint16Array();
    }

    function triangleFanToLines(triangles) {
        if (triangles.length > 0) {
            var count = triangles.length - 1;
            var size = (count - 1) * 6;
            var lines = IndexDatatype.createTypedArray(count, size);

            var base = triangles[0];
            var index = 0;
            for ( var i = 1; i < count; ++i, index += 6) {
                addTriangle(lines, index, base, triangles[i], triangles[i + 1]);
            }

            return lines;
        }

        return new Uint16Array();
    }

    /**
     * Converts a geometry's triangle indices to line indices.  If the geometry has an <code>indices</code>
     * and its <code>primitiveType</code> is <code>TRIANGLES</code>, <code>TRIANGLE_STRIP</code>,
     * <code>TRIANGLE_FAN</code>, it is converted to <code>LINES</code>; otherwise, the geometry is not changed.
     * <p>
     * This is commonly used to create a wireframe geometry for visual debugging.
     * </p>
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its triangle indices converted to lines.
     *
     * @exception {DeveloperError} geometry.primitiveType must be TRIANGLES, TRIANGLE_STRIP, or TRIANGLE_FAN.
     *
     * @example
     * geometry = Cesium.GeometryPipeline.toWireframe(geometry);
     */
    GeometryPipeline.toWireframe = function(geometry) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        
        var indices = geometry.indices;
        if (defined(indices)) {
            switch (geometry.primitiveType) {
                case PrimitiveType.TRIANGLES:
                    geometry.indices = trianglesToLines(indices);
                    break;
                case PrimitiveType.TRIANGLE_STRIP:
                    geometry.indices = triangleStripToLines(indices);
                    break;
                case PrimitiveType.TRIANGLE_FAN:
                    geometry.indices = triangleFanToLines(indices);
                    break;
                default:
                    throw new DeveloperError('geometry.primitiveType must be TRIANGLES, TRIANGLE_STRIP, or TRIANGLE_FAN.');
            }

            geometry.primitiveType = PrimitiveType.LINES;
        }

        return geometry;
    };

    /**
     * Creates a new {@link Geometry} with <code>LINES</code> representing the provided
     * attribute (<code>attributeName</code>) for the provided geometry.  This is used to
     * visualize vector attributes like normals, binormals, and tangents.
     *
     * @param {Geometry} geometry The <code>Geometry</code> instance with the attribute.
     * @param {String} [attributeName='normal'] The name of the attribute.
     * @param {Number} [length=10000.0] The length of each line segment in meters.  This can be negative to point the vector in the opposite direction.
     * @returns {Geometry} A new <code>Geometry</code> instance with line segments for the vector.
     *
     * @exception {DeveloperError} geometry.attributes must have an attribute with the same name as the attributeName parameter.
     *
     * @example
     * var geometry = Cesium.GeometryPipeline.createLineSegmentsForVectors(instance.geometry, 'binormal', 100000.0),
     */
    GeometryPipeline.createLineSegmentsForVectors = function(geometry, attributeName, length) {
        attributeName = defaultValue(attributeName, 'normal');

                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if (!defined(geometry.attributes.position)) {
            throw new DeveloperError('geometry.attributes.position is required.');
        }
        if (!defined(geometry.attributes[attributeName])) {
            throw new DeveloperError('geometry.attributes must have an attribute with the same name as the attributeName parameter, ' + attributeName + '.');
        }
        
        length = defaultValue(length, 10000.0);

        var positions = geometry.attributes.position.values;
        var vectors = geometry.attributes[attributeName].values;
        var positionsLength = positions.length;

        var newPositions = new Float64Array(2 * positionsLength);

        var j = 0;
        for (var i = 0; i < positionsLength; i += 3) {
            newPositions[j++] = positions[i];
            newPositions[j++] = positions[i + 1];
            newPositions[j++] = positions[i + 2];

            newPositions[j++] = positions[i] + (vectors[i] * length);
            newPositions[j++] = positions[i + 1] + (vectors[i + 1] * length);
            newPositions[j++] = positions[i + 2] + (vectors[i + 2] * length);
        }

        var newBoundingSphere;
        var bs = geometry.boundingSphere;
        if (defined(bs)) {
            newBoundingSphere = new BoundingSphere(bs.center, bs.radius + length);
        }

        return new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : newPositions
                })
            },
            primitiveType : PrimitiveType.LINES,
            boundingSphere : newBoundingSphere
        });
    };

    /**
     * Creates an object that maps attribute names to unique locations (indices)
     * for matching vertex attributes and shader programs.
     *
     * @param {Geometry} geometry The geometry, which is not modified, to create the object for.
     * @returns {Object} An object with attribute name / index pairs.
     *
     * @example
     * var attributeLocations = Cesium.GeometryPipeline.createAttributeLocations(geometry);
     * // Example output
     * // {
     * //   'position' : 0,
     * //   'normal' : 1
     * // }
     */
    GeometryPipeline.createAttributeLocations = function(geometry) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        
        // There can be a WebGL performance hit when attribute 0 is disabled, so
        // assign attribute locations to well-known attributes.
        var semantics = [
            'position',
            'positionHigh',
            'positionLow',

            // From VertexFormat.position - after 2D projection and high-precision encoding
            'position3DHigh',
            'position3DLow',
            'position2DHigh',
            'position2DLow',

            // From Primitive
            'pickColor',

            // From VertexFormat
            'normal',
            'st',
            'binormal',
            'tangent',

            // From compressing texture coordinates and normals
            'compressedAttributes'
        ];

        var attributes = geometry.attributes;
        var indices = {};
        var j = 0;
        var i;
        var len = semantics.length;

        // Attribute locations for well-known attributes
        for (i = 0; i < len; ++i) {
            var semantic = semantics[i];

            if (defined(attributes[semantic])) {
                indices[semantic] = j++;
            }
        }

        // Locations for custom attributes
        for (var name in attributes) {
            if (attributes.hasOwnProperty(name) && (!defined(indices[name]))) {
                indices[name] = j++;
            }
        }

        return indices;
    };

    /**
     * Reorders a geometry's attributes and <code>indices</code> to achieve better performance from the GPU's pre-vertex-shader cache.
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its attributes and indices reordered for the GPU's pre-vertex-shader cache.
     *
     * @exception {DeveloperError} Each attribute array in geometry.attributes must have the same number of attributes.
     *
     * @see GeometryPipeline.reorderForPostVertexCache
     *
     * @example
     * geometry = Cesium.GeometryPipeline.reorderForPreVertexCache(geometry);
     */
    GeometryPipeline.reorderForPreVertexCache = function(geometry) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        
        var numVertices = Geometry.computeNumberOfVertices(geometry);

        var indices = geometry.indices;
        if (defined(indices)) {
            var indexCrossReferenceOldToNew = new Int32Array(numVertices);
            for ( var i = 0; i < numVertices; i++) {
                indexCrossReferenceOldToNew[i] = -1;
            }

            // Construct cross reference and reorder indices
            var indicesIn = indices;
            var numIndices = indicesIn.length;
            var indicesOut = IndexDatatype.createTypedArray(numVertices, numIndices);

            var intoIndicesIn = 0;
            var intoIndicesOut = 0;
            var nextIndex = 0;
            var tempIndex;
            while (intoIndicesIn < numIndices) {
                tempIndex = indexCrossReferenceOldToNew[indicesIn[intoIndicesIn]];
                if (tempIndex !== -1) {
                    indicesOut[intoIndicesOut] = tempIndex;
                } else {
                    tempIndex = indicesIn[intoIndicesIn];
                    indexCrossReferenceOldToNew[tempIndex] = nextIndex;

                    indicesOut[intoIndicesOut] = nextIndex;
                    ++nextIndex;
                }
                ++intoIndicesIn;
                ++intoIndicesOut;
            }
            geometry.indices = indicesOut;

            // Reorder attributes
            var attributes = geometry.attributes;
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) &&
                        defined(attributes[property]) &&
                        defined(attributes[property].values)) {

                    var attribute = attributes[property];
                    var elementsIn = attribute.values;
                    var intoElementsIn = 0;
                    var numComponents = attribute.componentsPerAttribute;
                    var elementsOut = ComponentDatatype.createTypedArray(attribute.componentDatatype, nextIndex * numComponents);
                    while (intoElementsIn < numVertices) {
                        var temp = indexCrossReferenceOldToNew[intoElementsIn];
                        if (temp !== -1) {
                            for (i = 0; i < numComponents; i++) {
                                elementsOut[numComponents * temp + i] = elementsIn[numComponents * intoElementsIn + i];
                            }
                        }
                        ++intoElementsIn;
                    }
                    attribute.values = elementsOut;
                }
            }
        }

        return geometry;
    };

    /**
     * Reorders a geometry's <code>indices</code> to achieve better performance from the GPU's
     * post vertex-shader cache by using the Tipsify algorithm.  If the geometry <code>primitiveType</code>
     * is not <code>TRIANGLES</code> or the geometry does not have an <code>indices</code>, this function has no effect.
     *
     * @param {Geometry} geometry The geometry to modify.
     * @param {Number} [cacheCapacity=24] The number of vertices that can be held in the GPU's vertex cache.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its indices reordered for the post-vertex-shader cache.
     *
     * @exception {DeveloperError} cacheCapacity must be greater than two.
     *
     * @see GeometryPipeline.reorderForPreVertexCache
     * @see {@link http://gfx.cs.princeton.edu/pubs/Sander_2007_%3ETR/tipsy.pdf|Fast Triangle Reordering for Vertex Locality and Reduced Overdraw}
     * by Sander, Nehab, and Barczak
     *
     * @example
     * geometry = Cesium.GeometryPipeline.reorderForPostVertexCache(geometry);
     */
    GeometryPipeline.reorderForPostVertexCache = function(geometry, cacheCapacity) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        
        var indices = geometry.indices;
        if ((geometry.primitiveType === PrimitiveType.TRIANGLES) && (defined(indices))) {
            var numIndices = indices.length;
            var maximumIndex = 0;
            for ( var j = 0; j < numIndices; j++) {
                if (indices[j] > maximumIndex) {
                    maximumIndex = indices[j];
                }
            }
            geometry.indices = Tipsify.tipsify({
                indices : indices,
                maximumIndex : maximumIndex,
                cacheSize : cacheCapacity
            });
        }

        return geometry;
    };

    function copyAttributesDescriptions(attributes) {
        var newAttributes = {};

        for ( var attribute in attributes) {
            if (attributes.hasOwnProperty(attribute) &&
                    defined(attributes[attribute]) &&
                    defined(attributes[attribute].values)) {

                var attr = attributes[attribute];
                newAttributes[attribute] = new GeometryAttribute({
                    componentDatatype : attr.componentDatatype,
                    componentsPerAttribute : attr.componentsPerAttribute,
                    normalize : attr.normalize,
                    values : []
                });
            }
        }

        return newAttributes;
    }

    function copyVertex(destinationAttributes, sourceAttributes, index) {
        for ( var attribute in sourceAttributes) {
            if (sourceAttributes.hasOwnProperty(attribute) &&
                    defined(sourceAttributes[attribute]) &&
                    defined(sourceAttributes[attribute].values)) {

                var attr = sourceAttributes[attribute];

                for ( var k = 0; k < attr.componentsPerAttribute; ++k) {
                    destinationAttributes[attribute].values.push(attr.values[(index * attr.componentsPerAttribute) + k]);
                }
            }
        }
    }

    /**
     * Splits a geometry into multiple geometries, if necessary, to ensure that indices in the
     * <code>indices</code> fit into unsigned shorts.  This is used to meet the WebGL requirements
     * when unsigned int indices are not supported.
     * <p>
     * If the geometry does not have any <code>indices</code>, this function has no effect.
     * </p>
     *
     * @param {Geometry} geometry The geometry to be split into multiple geometries.
     * @returns {Geometry[]} An array of geometries, each with indices that fit into unsigned shorts.
     *
     * @exception {DeveloperError} geometry.primitiveType must equal to PrimitiveType.TRIANGLES, PrimitiveType.LINES, or PrimitiveType.POINTS
     * @exception {DeveloperError} All geometry attribute lists must have the same number of attributes.
     *
     * @example
     * var geometries = Cesium.GeometryPipeline.fitToUnsignedShortIndices(geometry);
     */
    GeometryPipeline.fitToUnsignedShortIndices = function(geometry) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if ((defined(geometry.indices)) &&
            ((geometry.primitiveType !== PrimitiveType.TRIANGLES) &&
             (geometry.primitiveType !== PrimitiveType.LINES) &&
             (geometry.primitiveType !== PrimitiveType.POINTS))) {
            throw new DeveloperError('geometry.primitiveType must equal to PrimitiveType.TRIANGLES, PrimitiveType.LINES, or PrimitiveType.POINTS.');
        }
        
        var geometries = [];

        // If there's an index list and more than 64K attributes, it is possible that
        // some indices are outside the range of unsigned short [0, 64K - 1]
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);
        if (defined(geometry.indices) && (numberOfVertices > CesiumMath.SIXTY_FOUR_KILOBYTES)) {
            var oldToNewIndex = [];
            var newIndices = [];
            var currentIndex = 0;
            var newAttributes = copyAttributesDescriptions(geometry.attributes);

            var originalIndices = geometry.indices;
            var numberOfIndices = originalIndices.length;

            var indicesPerPrimitive;

            if (geometry.primitiveType === PrimitiveType.TRIANGLES) {
                indicesPerPrimitive = 3;
            } else if (geometry.primitiveType === PrimitiveType.LINES) {
                indicesPerPrimitive = 2;
            } else if (geometry.primitiveType === PrimitiveType.POINTS) {
                indicesPerPrimitive = 1;
            }

            for ( var j = 0; j < numberOfIndices; j += indicesPerPrimitive) {
                for (var k = 0; k < indicesPerPrimitive; ++k) {
                    var x = originalIndices[j + k];
                    var i = oldToNewIndex[x];
                    if (!defined(i)) {
                        i = currentIndex++;
                        oldToNewIndex[x] = i;
                        copyVertex(newAttributes, geometry.attributes, x);
                    }
                    newIndices.push(i);
                }

                if (currentIndex + indicesPerPrimitive > CesiumMath.SIXTY_FOUR_KILOBYTES) {
                    geometries.push(new Geometry({
                        attributes : newAttributes,
                        indices : newIndices,
                        primitiveType : geometry.primitiveType,
                        boundingSphere : geometry.boundingSphere,
                        boundingSphereCV : geometry.boundingSphereCV
                    }));

                    // Reset for next vertex-array
                    oldToNewIndex = [];
                    newIndices = [];
                    currentIndex = 0;
                    newAttributes = copyAttributesDescriptions(geometry.attributes);
                }
            }

            if (newIndices.length !== 0) {
                geometries.push(new Geometry({
                    attributes : newAttributes,
                    indices : newIndices,
                    primitiveType : geometry.primitiveType,
                    boundingSphere : geometry.boundingSphere,
                    boundingSphereCV : geometry.boundingSphereCV
                }));
            }
        } else {
            // No need to split into multiple geometries
            geometries.push(geometry);
        }

        return geometries;
    };

    var scratchProjectTo2DCartesian3 = new Cartesian3();
    var scratchProjectTo2DCartographic = new Cartographic();

    /**
     * Projects a geometry's 3D <code>position</code> attribute to 2D, replacing the <code>position</code>
     * attribute with separate <code>position3D</code> and <code>position2D</code> attributes.
     * <p>
     * If the geometry does not have a <code>position</code>, this function has no effect.
     * </p>
     *
     * @param {Geometry} geometry The geometry to modify.
     * @param {String} attributeName The name of the attribute.
     * @param {String} attributeName3D The name of the attribute in 3D.
     * @param {String} attributeName2D The name of the attribute in 2D.
     * @param {Object} [projection=new GeographicProjection()] The projection to use.
     * @returns {Geometry} The modified <code>geometry</code> argument with <code>position3D</code> and <code>position2D</code> attributes.
     *
     * @exception {DeveloperError} geometry must have attribute matching the attributeName argument.
     * @exception {DeveloperError} The attribute componentDatatype must be ComponentDatatype.DOUBLE.
     * @exception {DeveloperError} Could not project a point to 2D.
     *
     * @example
     * geometry = Cesium.GeometryPipeline.projectTo2D(geometry, 'position', 'position3D', 'position2D');
     */
    GeometryPipeline.projectTo2D = function(geometry, attributeName, attributeName3D, attributeName2D, projection) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if (!defined(attributeName)) {
            throw new DeveloperError('attributeName is required.');
        }
        if (!defined(attributeName3D)) {
            throw new DeveloperError('attributeName3D is required.');
        }
        if (!defined(attributeName2D)) {
            throw new DeveloperError('attributeName2D is required.');
        }
        if (!defined(geometry.attributes[attributeName])) {
            throw new DeveloperError('geometry must have attribute matching the attributeName argument: ' + attributeName + '.');
        }
        if (geometry.attributes[attributeName].componentDatatype !== ComponentDatatype.DOUBLE) {
            throw new DeveloperError('The attribute componentDatatype must be ComponentDatatype.DOUBLE.');
        }
        
        var attribute = geometry.attributes[attributeName];
        projection = (defined(projection)) ? projection : new GeographicProjection();
        var ellipsoid = projection.ellipsoid;

        // Project original values to 2D.
        var values3D = attribute.values;
        var projectedValues = new Float64Array(values3D.length);
        var index = 0;

        for ( var i = 0; i < values3D.length; i += 3) {
            var value = Cartesian3.fromArray(values3D, i, scratchProjectTo2DCartesian3);

            var lonLat = ellipsoid.cartesianToCartographic(value, scratchProjectTo2DCartographic);
            if (!defined(lonLat)) {
                throw new DeveloperError('Could not project point (' + value.x + ', ' + value.y + ', ' + value.z + ') to 2D.');
            }

            var projectedLonLat = projection.project(lonLat, scratchProjectTo2DCartesian3);

            projectedValues[index++] = projectedLonLat.x;
            projectedValues[index++] = projectedLonLat.y;
            projectedValues[index++] = projectedLonLat.z;
        }

        // Rename original cartesians to WGS84 cartesians.
        geometry.attributes[attributeName3D] = attribute;

        // Replace original cartesians with 2D projected cartesians
        geometry.attributes[attributeName2D] = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : projectedValues
        });
        delete geometry.attributes[attributeName];

        return geometry;
    };

    var encodedResult = {
        high : 0.0,
        low : 0.0
    };

    /**
     * Encodes floating-point geometry attribute values as two separate attributes to improve
     * rendering precision.
     * <p>
     * This is commonly used to create high-precision position vertex attributes.
     * </p>
     *
     * @param {Geometry} geometry The geometry to modify.
     * @param {String} attributeName The name of the attribute.
     * @param {String} attributeHighName The name of the attribute for the encoded high bits.
     * @param {String} attributeLowName The name of the attribute for the encoded low bits.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its encoded attribute.
     *
     * @exception {DeveloperError} geometry must have attribute matching the attributeName argument.
     * @exception {DeveloperError} The attribute componentDatatype must be ComponentDatatype.DOUBLE.
     *
     * @example
     * geometry = Cesium.GeometryPipeline.encodeAttribute(geometry, 'position3D', 'position3DHigh', 'position3DLow');
     */
    GeometryPipeline.encodeAttribute = function(geometry, attributeName, attributeHighName, attributeLowName) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if (!defined(attributeName)) {
            throw new DeveloperError('attributeName is required.');
        }
        if (!defined(attributeHighName)) {
            throw new DeveloperError('attributeHighName is required.');
        }
        if (!defined(attributeLowName)) {
            throw new DeveloperError('attributeLowName is required.');
        }
        if (!defined(geometry.attributes[attributeName])) {
            throw new DeveloperError('geometry must have attribute matching the attributeName argument: ' + attributeName + '.');
        }
        if (geometry.attributes[attributeName].componentDatatype !== ComponentDatatype.DOUBLE) {
            throw new DeveloperError('The attribute componentDatatype must be ComponentDatatype.DOUBLE.');
        }
        
        var attribute = geometry.attributes[attributeName];
        var values = attribute.values;
        var length = values.length;
        var highValues = new Float32Array(length);
        var lowValues = new Float32Array(length);

        for (var i = 0; i < length; ++i) {
            EncodedCartesian3.encode(values[i], encodedResult);
            highValues[i] = encodedResult.high;
            lowValues[i] = encodedResult.low;
        }

        var componentsPerAttribute = attribute.componentsPerAttribute;

        geometry.attributes[attributeHighName] = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : componentsPerAttribute,
            values : highValues
        });
        geometry.attributes[attributeLowName] = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : componentsPerAttribute,
            values : lowValues
        });
        delete geometry.attributes[attributeName];

        return geometry;
    };

    var scratchCartesian3 = new Cartesian3();

    function transformPoint(matrix, attribute) {
        if (defined(attribute)) {
            var values = attribute.values;
            var length = values.length;
            for (var i = 0; i < length; i += 3) {
                Cartesian3.unpack(values, i, scratchCartesian3);
                Matrix4.multiplyByPoint(matrix, scratchCartesian3, scratchCartesian3);
                Cartesian3.pack(scratchCartesian3, values, i);
            }
        }
    }

    function transformVector(matrix, attribute) {
        if (defined(attribute)) {
            var values = attribute.values;
            var length = values.length;
            for (var i = 0; i < length; i += 3) {
                Cartesian3.unpack(values, i, scratchCartesian3);
                Matrix3.multiplyByVector(matrix, scratchCartesian3, scratchCartesian3);
                scratchCartesian3 = Cartesian3.normalize(scratchCartesian3, scratchCartesian3);
                Cartesian3.pack(scratchCartesian3, values, i);
            }
        }
    }

    var inverseTranspose = new Matrix4();
    var normalMatrix = new Matrix3();

    /**
     * Transforms a geometry instance to world coordinates.  This is used as a prerequisite
     * to batch together several instances with {@link GeometryPipeline.combineInstances}.  This changes
     * the instance's <code>modelMatrix</code> to {@link Matrix4.IDENTITY} and transforms the
     * following attributes if they are present: <code>position</code>, <code>normal</code>,
     * <code>binormal</code>, and <code>tangent</code>.
     *
     * @param {GeometryInstance} instance The geometry instance to modify.
     * @returns {GeometryInstance} The modified <code>instance</code> argument, with its attributes transforms to world coordinates.
     *
     * @see GeometryPipeline.combineInstances
     *
     * @example
     * for (var i = 0; i < instances.length; ++i) {
     *   Cesium.GeometryPipeline.transformToWorldCoordinates(instances[i]);
     * }
     * var geometries = Cesium.GeometryPipeline.combineInstances(instances);
     */
    GeometryPipeline.transformToWorldCoordinates = function(instance) {
                if (!defined(instance)) {
            throw new DeveloperError('instance is required.');
        }
        
        var modelMatrix = instance.modelMatrix;

        if (Matrix4.equals(modelMatrix, Matrix4.IDENTITY)) {
            // Already in world coordinates
            return instance;
        }

        var attributes = instance.geometry.attributes;

        // Transform attributes in known vertex formats
        transformPoint(modelMatrix, attributes.position);
        transformPoint(modelMatrix, attributes.prevPosition);
        transformPoint(modelMatrix, attributes.nextPosition);

        if ((defined(attributes.normal)) ||
            (defined(attributes.binormal)) ||
            (defined(attributes.tangent))) {

            Matrix4.inverse(modelMatrix, inverseTranspose);
            Matrix4.transpose(inverseTranspose, inverseTranspose);
            Matrix4.getRotation(inverseTranspose, normalMatrix);

            transformVector(normalMatrix, attributes.normal);
            transformVector(normalMatrix, attributes.binormal);
            transformVector(normalMatrix, attributes.tangent);
        }

        var boundingSphere = instance.geometry.boundingSphere;

        if (defined(boundingSphere)) {
            instance.geometry.boundingSphere = BoundingSphere.transform(boundingSphere, modelMatrix, boundingSphere);
        }

        instance.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);

        return instance;
    };

    function findAttributesInAllGeometries(instances, propertyName) {
        var length = instances.length;

        var attributesInAllGeometries = {};

        var attributes0 = instances[0][propertyName].attributes;
        var name;

        for (name in attributes0) {
            if (attributes0.hasOwnProperty(name) &&
                    defined(attributes0[name]) &&
                    defined(attributes0[name].values)) {

                var attribute = attributes0[name];
                var numberOfComponents = attribute.values.length;
                var inAllGeometries = true;

                // Does this same attribute exist in all geometries?
                for (var i = 1; i < length; ++i) {
                    var otherAttribute = instances[i][propertyName].attributes[name];

                    if ((!defined(otherAttribute)) ||
                        (attribute.componentDatatype !== otherAttribute.componentDatatype) ||
                        (attribute.componentsPerAttribute !== otherAttribute.componentsPerAttribute) ||
                        (attribute.normalize !== otherAttribute.normalize)) {

                        inAllGeometries = false;
                        break;
                    }

                    numberOfComponents += otherAttribute.values.length;
                }

                if (inAllGeometries) {
                    attributesInAllGeometries[name] = new GeometryAttribute({
                        componentDatatype : attribute.componentDatatype,
                        componentsPerAttribute : attribute.componentsPerAttribute,
                        normalize : attribute.normalize,
                        values : ComponentDatatype.createTypedArray(attribute.componentDatatype, numberOfComponents)
                    });
                }
            }
        }

        return attributesInAllGeometries;
    }

    var tempScratch = new Cartesian3();

    function combineGeometries(instances, propertyName) {
        var length = instances.length;

        var name;
        var i;
        var j;
        var k;

        var m = instances[0].modelMatrix;
        var haveIndices = (defined(instances[0][propertyName].indices));
        var primitiveType = instances[0][propertyName].primitiveType;

                for (i = 1; i < length; ++i) {
            if (!Matrix4.equals(instances[i].modelMatrix, m)) {
                throw new DeveloperError('All instances must have the same modelMatrix.');
            }
            if ((defined(instances[i][propertyName].indices)) !== haveIndices) {
                throw new DeveloperError('All instance geometries must have an indices or not have one.');
            }
            if (instances[i][propertyName].primitiveType !== primitiveType) {
                throw new DeveloperError('All instance geometries must have the same primitiveType.');
            }
        }
        
        // Find subset of attributes in all geometries
        var attributes = findAttributesInAllGeometries(instances, propertyName);
        var values;
        var sourceValues;
        var sourceValuesLength;

        // Combine attributes from each geometry into a single typed array
        for (name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                values = attributes[name].values;

                k = 0;
                for (i = 0; i < length; ++i) {
                    sourceValues = instances[i][propertyName].attributes[name].values;
                    sourceValuesLength = sourceValues.length;

                    for (j = 0; j < sourceValuesLength; ++j) {
                        values[k++] = sourceValues[j];
                    }
                }
            }
        }

        // Combine index lists
        var indices;

        if (haveIndices) {
            var numberOfIndices = 0;
            for (i = 0; i < length; ++i) {
                numberOfIndices += instances[i][propertyName].indices.length;
            }

            var numberOfVertices = Geometry.computeNumberOfVertices(new Geometry({
                attributes : attributes,
                primitiveType : PrimitiveType.POINTS
            }));
            var destIndices = IndexDatatype.createTypedArray(numberOfVertices, numberOfIndices);

            var destOffset = 0;
            var offset = 0;

            for (i = 0; i < length; ++i) {
                var sourceIndices = instances[i][propertyName].indices;
                var sourceIndicesLen = sourceIndices.length;

                for (k = 0; k < sourceIndicesLen; ++k) {
                    destIndices[destOffset++] = offset + sourceIndices[k];
                }

                offset += Geometry.computeNumberOfVertices(instances[i][propertyName]);
            }

            indices = destIndices;
        }

        // Create bounding sphere that includes all instances
        var center = new Cartesian3();
        var radius = 0.0;
        var bs;

        for (i = 0; i < length; ++i) {
            bs = instances[i][propertyName].boundingSphere;
            if (!defined(bs)) {
                // If any geometries have an undefined bounding sphere, then so does the combined geometry
                center = undefined;
                break;
            }

            Cartesian3.add(bs.center, center, center);
        }

        if (defined(center)) {
            Cartesian3.divideByScalar(center, length, center);

            for (i = 0; i < length; ++i) {
                bs = instances[i][propertyName].boundingSphere;
                var tempRadius = Cartesian3.magnitude(Cartesian3.subtract(bs.center, center, tempScratch)) + bs.radius;

                if (tempRadius > radius) {
                    radius = tempRadius;
                }
            }
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : primitiveType,
            boundingSphere : (defined(center)) ? new BoundingSphere(center, radius) : undefined
        });
    }

    /**
     * Combines geometry from several {@link GeometryInstance} objects into one geometry.
     * This concatenates the attributes, concatenates and adjusts the indices, and creates
     * a bounding sphere encompassing all instances.
     * <p>
     * If the instances do not have the same attributes, a subset of attributes common
     * to all instances is used, and the others are ignored.
     * </p>
     * <p>
     * This is used by {@link Primitive} to efficiently render a large amount of static data.
     * </p>
     *
     * @private
     *
     * @param {GeometryInstance[]} [instances] The array of {@link GeometryInstance} objects whose geometry will be combined.
     * @returns {Geometry} A single geometry created from the provided geometry instances.
     *
     * @exception {DeveloperError} All instances must have the same modelMatrix.
     * @exception {DeveloperError} All instance geometries must have an indices or not have one.
     * @exception {DeveloperError} All instance geometries must have the same primitiveType.
     *
     * @see GeometryPipeline.transformToWorldCoordinates
     *
     * @example
     * for (var i = 0; i < instances.length; ++i) {
     *   Cesium.GeometryPipeline.transformToWorldCoordinates(instances[i]);
     * }
     * var geometries = Cesium.GeometryPipeline.combineInstances(instances);
     */
    GeometryPipeline.combineInstances = function(instances) {
                if ((!defined(instances)) || (instances.length < 1)) {
            throw new DeveloperError('instances is required and must have length greater than zero.');
        }
        
        var instanceGeometry = [];
        var instanceSplitGeometry = [];
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            if (defined(instance.geometry)) {
                instanceGeometry.push(instance);
            } else {
                instanceSplitGeometry.push(instance);
            }
        }

        var geometries = [];
        if (instanceGeometry.length > 0) {
            geometries.push(combineGeometries(instanceGeometry, 'geometry'));
        }

        if (instanceSplitGeometry.length > 0) {
            geometries.push(combineGeometries(instanceSplitGeometry, 'westHemisphereGeometry'));
            geometries.push(combineGeometries(instanceSplitGeometry, 'eastHemisphereGeometry'));
        }

        return geometries;
    };

    var normal = new Cartesian3();
    var v0 = new Cartesian3();
    var v1 = new Cartesian3();
    var v2 = new Cartesian3();

    /**
     * Computes per-vertex normals for a geometry containing <code>TRIANGLES</code> by averaging the normals of
     * all triangles incident to the vertex.  The result is a new <code>normal</code> attribute added to the geometry.
     * This assumes a counter-clockwise winding order.
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument with the computed <code>normal</code> attribute.
     *
     * @exception {DeveloperError} geometry.indices length must be greater than 0 and be a multiple of 3.
     * @exception {DeveloperError} geometry.primitiveType must be {@link PrimitiveType.TRIANGLES}.
     *
     * @example
     * Cesium.GeometryPipeline.computeNormal(geometry);
     */
    GeometryPipeline.computeNormal = function(geometry) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        if (!defined(geometry.attributes.position) || !defined(geometry.attributes.position.values)) {
            throw new DeveloperError('geometry.attributes.position.values is required.');
        }
        if (!defined(geometry.indices)) {
            throw new DeveloperError('geometry.indices is required.');
        }
        if (geometry.indices.length < 2 || geometry.indices.length % 3 !== 0) {
            throw new DeveloperError('geometry.indices length must be greater than 0 and be a multiple of 3.');
        }
        if (geometry.primitiveType !== PrimitiveType.TRIANGLES) {
            throw new DeveloperError('geometry.primitiveType must be PrimitiveType.TRIANGLES.');
        }
        
        var indices = geometry.indices;
        var attributes = geometry.attributes;
        var vertices = attributes.position.values;
        var numVertices = attributes.position.values.length / 3;
        var numIndices = indices.length;
        var normalsPerVertex = new Array(numVertices);
        var normalsPerTriangle = new Array(numIndices / 3);
        var normalIndices = new Array(numIndices);

        for ( var i = 0; i < numVertices; i++) {
            normalsPerVertex[i] = {
                indexOffset : 0,
                count : 0,
                currentCount : 0
            };
        }

        var j = 0;
        for (i = 0; i < numIndices; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];
            var i03 = i0 * 3;
            var i13 = i1 * 3;
            var i23 = i2 * 3;

            v0.x = vertices[i03];
            v0.y = vertices[i03 + 1];
            v0.z = vertices[i03 + 2];
            v1.x = vertices[i13];
            v1.y = vertices[i13 + 1];
            v1.z = vertices[i13 + 2];
            v2.x = vertices[i23];
            v2.y = vertices[i23 + 1];
            v2.z = vertices[i23 + 2];

            normalsPerVertex[i0].count++;
            normalsPerVertex[i1].count++;
            normalsPerVertex[i2].count++;

            Cartesian3.subtract(v1, v0, v1);
            Cartesian3.subtract(v2, v0, v2);
            normalsPerTriangle[j] = Cartesian3.cross(v1, v2, new Cartesian3());
            j++;
        }

        var indexOffset = 0;
        for (i = 0; i < numVertices; i++) {
            normalsPerVertex[i].indexOffset += indexOffset;
            indexOffset += normalsPerVertex[i].count;
        }

        j = 0;
        var vertexNormalData;
        for (i = 0; i < numIndices; i += 3) {
            vertexNormalData = normalsPerVertex[indices[i]];
            var index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
            normalIndices[index] = j;
            vertexNormalData.currentCount++;

            vertexNormalData = normalsPerVertex[indices[i + 1]];
            index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
            normalIndices[index] = j;
            vertexNormalData.currentCount++;

            vertexNormalData = normalsPerVertex[indices[i + 2]];
            index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
            normalIndices[index] = j;
            vertexNormalData.currentCount++;

            j++;
        }

        var normalValues = new Float32Array(numVertices * 3);
        for (i = 0; i < numVertices; i++) {
            var i3 = i * 3;
            vertexNormalData = normalsPerVertex[i];
            if (vertexNormalData.count > 0) {
                Cartesian3.clone(Cartesian3.ZERO, normal);
                for (j = 0; j < vertexNormalData.count; j++) {
                    Cartesian3.add(normal, normalsPerTriangle[normalIndices[vertexNormalData.indexOffset + j]], normal);
                }
                Cartesian3.normalize(normal, normal);
                normalValues[i3] = normal.x;
                normalValues[i3 + 1] = normal.y;
                normalValues[i3 + 2] = normal.z;
            } else {
                normalValues[i3] = 0.0;
                normalValues[i3 + 1] = 0.0;
                normalValues[i3 + 2] = 1.0;
            }
        }

        geometry.attributes.normal = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : normalValues
        });

        return geometry;
    };

    var normalScratch = new Cartesian3();
    var normalScale = new Cartesian3();
    var tScratch = new Cartesian3();

    /**
     * Computes per-vertex binormals and tangents for a geometry containing <code>TRIANGLES</code>.
     * The result is new <code>binormal</code> and <code>tangent</code> attributes added to the geometry.
     * This assumes a counter-clockwise winding order.
     * <p>
     * Based on <a href="http://www.terathon.com/code/tangent.html">Computing Tangent Space Basis Vectors
     * for an Arbitrary Mesh</a> by Eric Lengyel.
     * </p>
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument with the computed <code>binormal</code> and <code>tangent</code> attributes.
     *
     * @exception {DeveloperError} geometry.indices length must be greater than 0 and be a multiple of 3.
     * @exception {DeveloperError} geometry.primitiveType must be {@link PrimitiveType.TRIANGLES}.
     *
     * @example
     * Cesium.GeometryPipeline.computeBinormalAndTangent(geometry);
     */
    GeometryPipeline.computeBinormalAndTangent = function(geometry) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        
        var attributes = geometry.attributes;
        var indices = geometry.indices;

                if (!defined(attributes.position) || !defined(attributes.position.values)) {
            throw new DeveloperError('geometry.attributes.position.values is required.');
        }
        if (!defined(attributes.normal) || !defined(attributes.normal.values)) {
            throw new DeveloperError('geometry.attributes.normal.values is required.');
        }
        if (!defined(attributes.st) || !defined(attributes.st.values)) {
            throw new DeveloperError('geometry.attributes.st.values is required.');
        }
        if (!defined(indices)) {
            throw new DeveloperError('geometry.indices is required.');
        }
        if (indices.length < 2 || indices.length % 3 !== 0) {
            throw new DeveloperError('geometry.indices length must be greater than 0 and be a multiple of 3.');
        }
        if (geometry.primitiveType !== PrimitiveType.TRIANGLES) {
            throw new DeveloperError('geometry.primitiveType must be PrimitiveType.TRIANGLES.');
        }
        
        var vertices = geometry.attributes.position.values;
        var normals = geometry.attributes.normal.values;
        var st = geometry.attributes.st.values;

        var numVertices = geometry.attributes.position.values.length / 3;
        var numIndices = indices.length;
        var tan1 = new Array(numVertices * 3);

        for ( var i = 0; i < tan1.length; i++) {
            tan1[i] = 0;
        }

        var i03;
        var i13;
        var i23;
        for (i = 0; i < numIndices; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];
            i03 = i0 * 3;
            i13 = i1 * 3;
            i23 = i2 * 3;
            var i02 = i0 * 2;
            var i12 = i1 * 2;
            var i22 = i2 * 2;

            var ux = vertices[i03];
            var uy = vertices[i03 + 1];
            var uz = vertices[i03 + 2];

            var wx = st[i02];
            var wy = st[i02 + 1];
            var t1 = st[i12 + 1] - wy;
            var t2 = st[i22 + 1] - wy;

            var r = 1.0 / ((st[i12] - wx) * t2 - (st[i22] - wx) * t1);
            var sdirx = (t2 * (vertices[i13] - ux) - t1 * (vertices[i23] - ux)) * r;
            var sdiry = (t2 * (vertices[i13 + 1] - uy) - t1 * (vertices[i23 + 1] - uy)) * r;
            var sdirz = (t2 * (vertices[i13 + 2] - uz) - t1 * (vertices[i23 + 2] - uz)) * r;

            tan1[i03] += sdirx;
            tan1[i03 + 1] += sdiry;
            tan1[i03 + 2] += sdirz;

            tan1[i13] += sdirx;
            tan1[i13 + 1] += sdiry;
            tan1[i13 + 2] += sdirz;

            tan1[i23] += sdirx;
            tan1[i23 + 1] += sdiry;
            tan1[i23 + 2] += sdirz;
        }

        var binormalValues = new Float32Array(numVertices * 3);
        var tangentValues = new Float32Array(numVertices * 3);

        for (i = 0; i < numVertices; i++) {
            i03 = i * 3;
            i13 = i03 + 1;
            i23 = i03 + 2;

            var n = Cartesian3.fromArray(normals, i03, normalScratch);
            var t = Cartesian3.fromArray(tan1, i03, tScratch);
            var scalar = Cartesian3.dot(n, t);
            Cartesian3.multiplyByScalar(n, scalar, normalScale);
            Cartesian3.normalize(Cartesian3.subtract(t, normalScale, t), t);

            tangentValues[i03] = t.x;
            tangentValues[i13] = t.y;
            tangentValues[i23] = t.z;

            Cartesian3.normalize(Cartesian3.cross(n, t, t), t);

            binormalValues[i03] = t.x;
            binormalValues[i13] = t.y;
            binormalValues[i23] = t.z;
        }

        geometry.attributes.tangent = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : tangentValues
        });

        geometry.attributes.binormal = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : binormalValues
        });

        return geometry;
    };

    var scratchCartesian2 = new Cartesian2();
    var toEncode1 = new Cartesian3();
    var toEncode2 = new Cartesian3();
    var toEncode3 = new Cartesian3();

    /**
     * Compresses and packs geometry normal attribute values to save memory.
     *
     * @param {Geometry} geometry The geometry to modify.
     * @returns {Geometry} The modified <code>geometry</code> argument, with its normals compressed and packed.
     *
     * @example
     * geometry = Cesium.GeometryPipeline.compressVertices(geometry);
     */
    GeometryPipeline.compressVertices = function(geometry) {
                if (!defined(geometry)) {
            throw new DeveloperError('geometry is required.');
        }
        
        var normalAttribute = geometry.attributes.normal;
        var stAttribute = geometry.attributes.st;
        if (!defined(normalAttribute) && !defined(stAttribute)) {
            return geometry;
        }

        var tangentAttribute = geometry.attributes.tangent;
        var binormalAttribute = geometry.attributes.binormal;

        var normals;
        var st;
        var tangents;
        var binormals;

        if (defined(normalAttribute)) {
            normals = normalAttribute.values;
        }
        if (defined(stAttribute)) {
            st = stAttribute.values;
        }
        if (defined(tangentAttribute)) {
            tangents = tangentAttribute.values;
        }
        if (binormalAttribute) {
            binormals = binormalAttribute.values;
        }

        var length = defined(normals) ? normals.length : st.length;
        var numComponents = defined(normals) ? 3.0 : 2.0;
        var numVertices = length / numComponents;

        var compressedLength = numVertices;
        var numCompressedComponents = defined(st) && defined(normals) ? 2.0 : 1.0;
        numCompressedComponents += defined(tangents) || defined(binormals) ? 1.0 : 0.0;
        compressedLength *= numCompressedComponents;

        var compressedAttributes = new Float32Array(compressedLength);

        var normalIndex = 0;
        for (var i = 0; i < numVertices; ++i) {
            if (defined(st)) {
                Cartesian2.fromArray(st, i * 2.0, scratchCartesian2);
                compressedAttributes[normalIndex++] = AttributeCompression.compressTextureCoordinates(scratchCartesian2);
            }

            var index = i * 3.0;
            if (defined(normals) && defined(tangents) && defined(binormals)) {
                Cartesian3.fromArray(normals, index, toEncode1);
                Cartesian3.fromArray(tangents, index, toEncode2);
                Cartesian3.fromArray(binormals, index, toEncode3);

                AttributeCompression.octPack(toEncode1, toEncode2, toEncode3, scratchCartesian2);
                compressedAttributes[normalIndex++] = scratchCartesian2.x;
                compressedAttributes[normalIndex++] = scratchCartesian2.y;
            } else {
                if (defined(normals)) {
                    Cartesian3.fromArray(normals, index, toEncode1);
                    compressedAttributes[normalIndex++] = AttributeCompression.octEncodeFloat(toEncode1);
                }

                if (defined(tangents)) {
                    Cartesian3.fromArray(tangents, index, toEncode1);
                    compressedAttributes[normalIndex++] = AttributeCompression.octEncodeFloat(toEncode1);
                }

                if (defined(binormals)) {
                    Cartesian3.fromArray(binormals, index, toEncode1);
                    compressedAttributes[normalIndex++] = AttributeCompression.octEncodeFloat(toEncode1);
                }
            }
        }

        geometry.attributes.compressedAttributes = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : numCompressedComponents,
            values : compressedAttributes
        });

        if (defined(normals)) {
            delete geometry.attributes.normal;
        }
        if (defined(st)) {
            delete geometry.attributes.st;
        }
        if (defined(tangents)) {
            delete geometry.attributes.tangent;
        }
        if (defined(binormals)) {
            delete geometry.attributes.binormal;
        }

        return geometry;
    };

    function indexTriangles(geometry) {
        if (defined(geometry.indices)) {
            return geometry;
        }
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

                if (numberOfVertices < 3) {
            throw new DeveloperError('The number of vertices must be at least three.');
        }
        if (numberOfVertices % 3 !== 0) {
            throw new DeveloperError('The number of vertices must be a multiple of three.');
        }
        
        var indices = IndexDatatype.createTypedArray(numberOfVertices, numberOfVertices);
        for (var i = 0; i < numberOfVertices; ++i) {
            indices[i] = i;
        }

        geometry.indices = indices;
        return geometry;
    }

    function indexTriangleFan(geometry) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

                if (numberOfVertices < 3) {
            throw new DeveloperError('The number of vertices must be at least three.');
        }
        
        var indices = IndexDatatype.createTypedArray(numberOfVertices, (numberOfVertices - 2) * 3);
        indices[0] = 1;
        indices[1] = 0;
        indices[2] = 2;

        var indicesIndex = 3;
        for (var i = 3; i < numberOfVertices; ++i) {
            indices[indicesIndex++] = i - 1;
            indices[indicesIndex++] = 0;
            indices[indicesIndex++] = i;
        }

        geometry.indices = indices;
        geometry.primitiveType = PrimitiveType.TRIANGLES;
        return geometry;
    }

    function indexTriangleStrip(geometry) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

                if (numberOfVertices < 3) {
            throw new DeveloperError('The number of vertices must be at least 3.');
        }
        
        var indices = IndexDatatype.createTypedArray(numberOfVertices, (numberOfVertices - 2) * 3);
        indices[0] = 0;
        indices[1] = 1;
        indices[2] = 2;

        if (numberOfVertices > 3) {
            indices[3] = 0;
            indices[4] = 2;
            indices[5] = 3;
        }

        var indicesIndex = 6;
        for (var i = 3; i < numberOfVertices - 1; i += 2) {
            indices[indicesIndex++] = i;
            indices[indicesIndex++] = i - 1;
            indices[indicesIndex++] = i + 1;

            if (i + 2 < numberOfVertices) {
                indices[indicesIndex++] = i;
                indices[indicesIndex++] = i + 1;
                indices[indicesIndex++] = i + 2;
            }
        }

        geometry.indices = indices;
        geometry.primitiveType = PrimitiveType.TRIANGLES;
        return geometry;
    }

    function indexLines(geometry) {
        if (defined(geometry.indices)) {
            return geometry;
        }
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

                if (numberOfVertices < 2) {
            throw new DeveloperError('The number of vertices must be at least two.');
        }
        if (numberOfVertices % 2 !== 0) {
            throw new DeveloperError('The number of vertices must be a multiple of 2.');
        }
        
        var indices = IndexDatatype.createTypedArray(numberOfVertices, numberOfVertices);
        for (var i = 0; i < numberOfVertices; ++i) {
            indices[i] = i;
        }

        geometry.indices = indices;
        return geometry;
    }

    function indexLineStrip(geometry) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

                if (numberOfVertices < 2) {
            throw new DeveloperError('The number of vertices must be at least two.');
        }
        
        var indices = IndexDatatype.createTypedArray(numberOfVertices, (numberOfVertices - 1) * 2);
        indices[0] = 0;
        indices[1] = 1;
        var indicesIndex = 2;
        for (var i = 2; i < numberOfVertices; ++i) {
            indices[indicesIndex++] = i - 1;
            indices[indicesIndex++] = i;
        }

        geometry.indices = indices;
        geometry.primitiveType = PrimitiveType.LINES;
        return geometry;
    }

    function indexLineLoop(geometry) {
        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

                if (numberOfVertices < 2) {
            throw new DeveloperError('The number of vertices must be at least two.');
        }
        
        var indices = IndexDatatype.createTypedArray(numberOfVertices, numberOfVertices * 2);

        indices[0] = 0;
        indices[1] = 1;

        var indicesIndex = 2;
        for (var i = 2; i < numberOfVertices; ++i) {
            indices[indicesIndex++] = i - 1;
            indices[indicesIndex++] = i;
        }

        indices[indicesIndex++] = numberOfVertices - 1;
        indices[indicesIndex] = 0;

        geometry.indices = indices;
        geometry.primitiveType = PrimitiveType.LINES;
        return geometry;
    }

    function indexPrimitive(geometry) {
        switch (geometry.primitiveType) {
        case PrimitiveType.TRIANGLE_FAN:
            return indexTriangleFan(geometry);
        case PrimitiveType.TRIANGLE_STRIP:
            return indexTriangleStrip(geometry);
        case PrimitiveType.TRIANGLES:
            return indexTriangles(geometry);
        case PrimitiveType.LINE_STRIP:
            return indexLineStrip(geometry);
        case PrimitiveType.LINE_LOOP:
            return indexLineLoop(geometry);
        case PrimitiveType.LINES:
            return indexLines(geometry);
        }

        return geometry;
    }

    function offsetPointFromXZPlane(p, isBehind) {
        if (Math.abs(p.y) < CesiumMath.EPSILON6){
            if (isBehind) {
                p.y = -CesiumMath.EPSILON6;
            } else {
                p.y = CesiumMath.EPSILON6;
            }
        }
    }

    function offsetTriangleFromXZPlane(p0, p1, p2) {
        if (p0.y !== 0.0 && p1.y !== 0.0 && p2.y !== 0.0) {
            offsetPointFromXZPlane(p0, p0.y < 0.0);
            offsetPointFromXZPlane(p1, p1.y < 0.0);
            offsetPointFromXZPlane(p2, p2.y < 0.0);
            return;
        }

        var p0y = Math.abs(p0.y);
        var p1y = Math.abs(p1.y);
        var p2y = Math.abs(p2.y);

        var sign;
        if (p0y > p1y) {
            if (p0y > p2y) {
                sign = CesiumMath.sign(p0.y);
            } else {
                sign = CesiumMath.sign(p2.y);
            }
        } else if (p1y > p2y) {
            sign = CesiumMath.sign(p1.y);
        } else {
            sign = CesiumMath.sign(p2.y);
        }

        var isBehind = sign < 0.0;
        offsetPointFromXZPlane(p0, isBehind);
        offsetPointFromXZPlane(p1, isBehind);
        offsetPointFromXZPlane(p2, isBehind);
    }

    var c3 = new Cartesian3();
    function getXZIntersectionOffsetPoints(p, p1, u1, v1) {
        Cartesian3.add(p, Cartesian3.multiplyByScalar(Cartesian3.subtract(p1, p, c3), p.y/(p.y-p1.y), c3), u1);
        Cartesian3.clone(u1, v1);
        offsetPointFromXZPlane(u1, true);
        offsetPointFromXZPlane(v1, false);
    }

    var u1 = new Cartesian3();
    var u2 = new Cartesian3();
    var q1 = new Cartesian3();
    var q2 = new Cartesian3();

    var splitTriangleResult = {
        positions : new Array(7),
        indices : new Array(3 * 3)
    };

    function splitTriangle(p0, p1, p2) {
        // In WGS84 coordinates, for a triangle approximately on the
        // ellipsoid to cross the IDL, first it needs to be on the
        // negative side of the plane x = 0.
        if ((p0.x >= 0.0) || (p1.x >= 0.0) || (p2.x >= 0.0)) {
            return undefined;
        }

        offsetTriangleFromXZPlane(p0, p1, p2);

        var p0Behind = p0.y < 0.0;
        var p1Behind = p1.y < 0.0;
        var p2Behind = p2.y < 0.0;

        var numBehind = 0;
        numBehind += p0Behind ? 1 : 0;
        numBehind += p1Behind ? 1 : 0;
        numBehind += p2Behind ? 1 : 0;

        var indices = splitTriangleResult.indices;

        if (numBehind === 1) {
            indices[1] = 3;
            indices[2] = 4;
            indices[5] = 6;
            indices[7] = 6;
            indices[8] = 5;

            if (p0Behind) {
                getXZIntersectionOffsetPoints(p0, p1, u1, q1);
                getXZIntersectionOffsetPoints(p0, p2, u2, q2);

                indices[0] = 0;
                indices[3] = 1;
                indices[4] = 2;
                indices[6] = 1;
            } else if (p1Behind) {
                getXZIntersectionOffsetPoints(p1, p2, u1, q1);
                getXZIntersectionOffsetPoints(p1, p0, u2, q2);

                indices[0] = 1;
                indices[3] = 2;
                indices[4] = 0;
                indices[6] = 2;
            } else if (p2Behind) {
                getXZIntersectionOffsetPoints(p2, p0, u1, q1);
                getXZIntersectionOffsetPoints(p2, p1, u2, q2);

                indices[0] = 2;
                indices[3] = 0;
                indices[4] = 1;
                indices[6] = 0;
            }
        } else if (numBehind === 2) {
            indices[2] = 4;
            indices[4] = 4;
            indices[5] = 3;
            indices[7] = 5;
            indices[8] = 6;

            if (!p0Behind) {
                getXZIntersectionOffsetPoints(p0, p1, u1, q1);
                getXZIntersectionOffsetPoints(p0, p2, u2, q2);

                indices[0] = 1;
                indices[1] = 2;
                indices[3] = 1;
                indices[6] = 0;
            } else if (!p1Behind) {
                getXZIntersectionOffsetPoints(p1, p2, u1, q1);
                getXZIntersectionOffsetPoints(p1, p0, u2, q2);

                indices[0] = 2;
                indices[1] = 0;
                indices[3] = 2;
                indices[6] = 1;
            } else if (!p2Behind) {
                getXZIntersectionOffsetPoints(p2, p0, u1, q1);
                getXZIntersectionOffsetPoints(p2, p1, u2, q2);

                indices[0] = 0;
                indices[1] = 1;
                indices[3] = 0;
                indices[6] = 2;
            }
        }

        var positions = splitTriangleResult.positions;
        positions[0] = p0;
        positions[1] = p1;
        positions[2] = p2;
        positions.length = 3;

        if (numBehind === 1 || numBehind === 2) {
            positions[3] = u1;
            positions[4] = u2;
            positions[5] = q1;
            positions[6] = q2;
            positions.length = 7;
        }

        return splitTriangleResult;
    }

    function updateGeometryAfterSplit(geometry, computeBoundingSphere) {
        var attributes = geometry.attributes;

        if (attributes.position.values.length === 0) {
            return undefined;
        }

        for (var property in attributes) {
            if (attributes.hasOwnProperty(property) &&
                    defined(attributes[property]) &&
                    defined(attributes[property].values)) {

                var attribute = attributes[property];
                attribute.values = ComponentDatatype.createTypedArray(attribute.componentDatatype, attribute.values);
            }
        }

        var numberOfVertices = Geometry.computeNumberOfVertices(geometry);
        geometry.indices = IndexDatatype.createTypedArray(numberOfVertices, geometry.indices);

        if (computeBoundingSphere) {
            geometry.boundingSphere = BoundingSphere.fromVertices(attributes.position.values);
        }

        return geometry;
    }

    function copyGeometryForSplit(geometry) {
        var attributes = geometry.attributes;
        var copiedAttributes = {};

        for (var property in attributes) {
            if (attributes.hasOwnProperty(property) &&
                    defined(attributes[property]) &&
                    defined(attributes[property].values)) {

                var attribute = attributes[property];
                copiedAttributes[property] = new GeometryAttribute({
                    componentDatatype : attribute.componentDatatype,
                    componentsPerAttribute : attribute.componentsPerAttribute,
                    normalize : attribute.normalize,
                    values : []
                });
            }
        }

        return new Geometry({
            attributes : copiedAttributes,
            indices : [],
            primitiveType : geometry.primitiveType
        });
    }

    function updateInstanceAfterSplit(instance, westGeometry, eastGeometry) {
        var computeBoundingSphere = defined(instance.geometry.boundingSphere);

        westGeometry = updateGeometryAfterSplit(westGeometry, computeBoundingSphere);
        eastGeometry = updateGeometryAfterSplit(eastGeometry, computeBoundingSphere);

        if (defined(eastGeometry) && !defined(westGeometry)) {
            instance.geometry = eastGeometry;
        } else if (!defined(eastGeometry) && defined(westGeometry)) {
            instance.geometry = westGeometry;
        } else {
            instance.westHemisphereGeometry = westGeometry;
            instance.eastHemisphereGeometry = eastGeometry;
            instance.geometry = undefined;
        }
    }

    var p0Scratch = new Cartesian3();
    var p1Scratch = new Cartesian3();
    var p2Scratch = new Cartesian3();
    var barycentricScratch = new Cartesian3();
    var s0Scratch = new Cartesian2();
    var s1Scratch = new Cartesian2();
    var s2Scratch = new Cartesian2();

    function computeTriangleAttributes(i0, i1, i2, point, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex) {
        if (!defined(normals) && !defined(binormals) && !defined(tangents) && !defined(texCoords)) {
            return;
        }

        var p0 = Cartesian3.fromArray(positions, i0 * 3, p0Scratch);
        var p1 = Cartesian3.fromArray(positions, i1 * 3, p1Scratch);
        var p2 = Cartesian3.fromArray(positions, i2 * 3, p2Scratch);
        var coords = barycentricCoordinates(point, p0, p1, p2, barycentricScratch);

        if (defined(normals)) {
            var n0 = Cartesian3.fromArray(normals, i0 * 3, p0Scratch);
            var n1 = Cartesian3.fromArray(normals, i1 * 3, p1Scratch);
            var n2 = Cartesian3.fromArray(normals, i2 * 3, p2Scratch);

            Cartesian3.multiplyByScalar(n0, coords.x, n0);
            Cartesian3.multiplyByScalar(n1, coords.y, n1);
            Cartesian3.multiplyByScalar(n2, coords.z, n2);

            var normal = Cartesian3.add(n0, n1, n0);
            Cartesian3.add(normal, n2, normal);
            Cartesian3.normalize(normal, normal);

            Cartesian3.pack(normal, currentAttributes.normal.values, insertedIndex * 3);
        }

        if (defined(binormals)) {
            var b0 = Cartesian3.fromArray(binormals, i0 * 3, p0Scratch);
            var b1 = Cartesian3.fromArray(binormals, i1 * 3, p1Scratch);
            var b2 = Cartesian3.fromArray(binormals, i2 * 3, p2Scratch);

            Cartesian3.multiplyByScalar(b0, coords.x, b0);
            Cartesian3.multiplyByScalar(b1, coords.y, b1);
            Cartesian3.multiplyByScalar(b2, coords.z, b2);

            var binormal = Cartesian3.add(b0, b1, b0);
            Cartesian3.add(binormal, b2, binormal);
            Cartesian3.normalize(binormal, binormal);

            Cartesian3.pack(binormal, currentAttributes.binormal.values, insertedIndex * 3);
        }

        if (defined(tangents)) {
            var t0 = Cartesian3.fromArray(tangents, i0 * 3, p0Scratch);
            var t1 = Cartesian3.fromArray(tangents, i1 * 3, p1Scratch);
            var t2 = Cartesian3.fromArray(tangents, i2 * 3, p2Scratch);

            Cartesian3.multiplyByScalar(t0, coords.x, t0);
            Cartesian3.multiplyByScalar(t1, coords.y, t1);
            Cartesian3.multiplyByScalar(t2, coords.z, t2);

            var tangent = Cartesian3.add(t0, t1, t0);
            Cartesian3.add(tangent, t2, tangent);
            Cartesian3.normalize(tangent, tangent);

            Cartesian3.pack(tangent, currentAttributes.tangent.values, insertedIndex * 3);
        }

        if (defined(texCoords)) {
            var s0 = Cartesian2.fromArray(texCoords, i0 * 2, s0Scratch);
            var s1 = Cartesian2.fromArray(texCoords, i1 * 2, s1Scratch);
            var s2 = Cartesian2.fromArray(texCoords, i2 * 2, s2Scratch);

            Cartesian2.multiplyByScalar(s0, coords.x, s0);
            Cartesian2.multiplyByScalar(s1, coords.y, s1);
            Cartesian2.multiplyByScalar(s2, coords.z, s2);

            var texCoord = Cartesian2.add(s0, s1, s0);
            Cartesian2.add(texCoord, s2, texCoord);

            Cartesian2.pack(texCoord, currentAttributes.st.values, insertedIndex * 2);
        }
    }

    function insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, currentIndex, point) {
        var insertIndex = currentAttributes.position.values.length / 3;

        if (currentIndex !== -1) {
            var prevIndex = indices[currentIndex];
            var newIndex = currentIndexMap[prevIndex];

            if (newIndex === -1) {
                currentIndexMap[prevIndex] = insertIndex;
                currentAttributes.position.values.push(point.x, point.y, point.z);
                currentIndices.push(insertIndex);
                return insertIndex;
            }

            currentIndices.push(newIndex);
            return newIndex;
        }

        currentAttributes.position.values.push(point.x, point.y, point.z);
        currentIndices.push(insertIndex);
        return insertIndex;
    }

    function splitLongitudeTriangles(instance) {
        var geometry = instance.geometry;
        var attributes = geometry.attributes;
        var positions = attributes.position.values;
        var normals = (defined(attributes.normal)) ? attributes.normal.values : undefined;
        var binormals = (defined(attributes.binormal)) ? attributes.binormal.values : undefined;
        var tangents = (defined(attributes.tangent)) ? attributes.tangent.values : undefined;
        var texCoords = (defined(attributes.st)) ? attributes.st.values : undefined;
        var indices = geometry.indices;

        var eastGeometry = copyGeometryForSplit(geometry);
        var westGeometry = copyGeometryForSplit(geometry);

        var currentAttributes;
        var currentIndices;
        var currentIndexMap;
        var insertedIndex;
        var i;

        var westGeometryIndexMap = [];
        westGeometryIndexMap.length = positions.length / 3;

        var eastGeometryIndexMap = [];
        eastGeometryIndexMap.length = positions.length / 3;

        for (i = 0; i < westGeometryIndexMap.length; ++i) {
            westGeometryIndexMap[i] = -1;
            eastGeometryIndexMap[i] = -1;
        }

        var len = indices.length;
        for (i = 0; i < len; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            var p0 = Cartesian3.fromArray(positions, i0 * 3);
            var p1 = Cartesian3.fromArray(positions, i1 * 3);
            var p2 = Cartesian3.fromArray(positions, i2 * 3);

            var result = splitTriangle(p0, p1, p2);
            if (defined(result) && result.positions.length > 3) {
                var resultPositions = result.positions;
                var resultIndices = result.indices;
                var resultLength = resultIndices.length;

                for (var j = 0; j < resultLength; ++j) {
                    var resultIndex = resultIndices[j];
                    var point = resultPositions[resultIndex];

                    if (point.y < 0.0) {
                        currentAttributes = westGeometry.attributes;
                        currentIndices = westGeometry.indices;
                        currentIndexMap = westGeometryIndexMap;
                    } else {
                        currentAttributes = eastGeometry.attributes;
                        currentIndices = eastGeometry.indices;
                        currentIndexMap = eastGeometryIndexMap;
                    }

                    insertedIndex = insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, resultIndex < 3 ? i + resultIndex : -1, point);
                    computeTriangleAttributes(i0, i1, i2, point, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex);
                }
            } else {
                if (defined(result)) {
                    p0 = result.positions[0];
                    p1 = result.positions[1];
                    p2 = result.positions[2];
                }

                if (p0.y < 0.0) {
                    currentAttributes = westGeometry.attributes;
                    currentIndices = westGeometry.indices;
                    currentIndexMap = westGeometryIndexMap;
                } else {
                    currentAttributes = eastGeometry.attributes;
                    currentIndices = eastGeometry.indices;
                    currentIndexMap = eastGeometryIndexMap;
                }

                insertedIndex = insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i, p0);
                computeTriangleAttributes(i0, i1, i2, p0, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex);

                insertedIndex = insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i + 1, p1);
                computeTriangleAttributes(i0, i1, i2, p1, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex);

                insertedIndex = insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i + 2, p2);
                computeTriangleAttributes(i0, i1, i2, p2, positions, normals, binormals, tangents, texCoords, currentAttributes, insertedIndex);
            }
        }

        updateInstanceAfterSplit(instance, westGeometry, eastGeometry);
    }

    var xzPlane = Plane.fromPointNormal(Cartesian3.ZERO, Cartesian3.UNIT_Y);

    var offsetScratch = new Cartesian3();
    var offsetPointScratch = new Cartesian3();

    function splitLongitudeLines(instance) {
        var geometry = instance.geometry;
        var attributes = geometry.attributes;
        var positions = attributes.position.values;
        var indices = geometry.indices;

        var eastGeometry = copyGeometryForSplit(geometry);
        var westGeometry = copyGeometryForSplit(geometry);

        var i;
        var index;
        var length = indices.length;

        var westGeometryIndexMap = [];
        westGeometryIndexMap.length = positions.length / 3;

        var eastGeometryIndexMap = [];
        eastGeometryIndexMap.length = positions.length / 3;

        for (i = 0; i < westGeometryIndexMap.length; ++i) {
            westGeometryIndexMap[i] = -1;
            eastGeometryIndexMap[i] = -1;
        }

        for (i = 0; i < length; i += 2) {
            var i0 = indices[i];
            var i1 = indices[i + 1];

            var p0 = Cartesian3.fromArray(positions, i0 * 3, p0Scratch);
            var p1 = Cartesian3.fromArray(positions, i1 * 3, p1Scratch);

            if (Math.abs(p0.y) < CesiumMath.EPSILON6){
                if (p0.y < 0.0) {
                    p0.y = -CesiumMath.EPSILON6;
                } else {
                    p0.y = CesiumMath.EPSILON6;
                }
            }

            if (Math.abs(p1.y) < CesiumMath.EPSILON6){
                if (p1.y < 0.0) {
                    p1.y = -CesiumMath.EPSILON6;
                } else {
                    p1.y = CesiumMath.EPSILON6;
                }
            }

            var p0Attributes = eastGeometry.attributes;
            var p0Indices = eastGeometry.indices;
            var p0IndexMap = eastGeometryIndexMap;
            var p1Attributes = westGeometry.attributes;
            var p1Indices = westGeometry.indices;
            var p1IndexMap = westGeometryIndexMap;

            var intersection = IntersectionTests.lineSegmentPlane(p0, p1, xzPlane, p2Scratch);
            if (defined(intersection)) {
                // move point on the xz-plane slightly away from the plane
                var offset = Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, 5.0 * CesiumMath.EPSILON9, offsetScratch);
                if (p0.y < 0.0) {
                    Cartesian3.negate(offset, offset);

                    p0Attributes = westGeometry.attributes;
                    p0Indices = westGeometry.indices;
                    p0IndexMap = westGeometryIndexMap;
                    p1Attributes = eastGeometry.attributes;
                    p1Indices = eastGeometry.indices;
                    p1IndexMap = eastGeometryIndexMap;
                }

                var offsetPoint = Cartesian3.add(intersection, offset, offsetPointScratch);
                insertSplitPoint(p0Attributes, p0Indices, p0IndexMap, indices, i, p0);
                insertSplitPoint(p0Attributes, p0Indices, p0IndexMap, indices, -1, offsetPoint);

                Cartesian3.negate(offset, offset);
                Cartesian3.add(intersection, offset, offsetPoint);
                insertSplitPoint(p1Attributes, p1Indices, p1IndexMap, indices, -1, offsetPoint);
                insertSplitPoint(p1Attributes, p1Indices, p1IndexMap, indices, i + 1, p1);
            } else {
                var currentAttributes;
                var currentIndices;
                var currentIndexMap;

                if (p0.y < 0.0) {
                    currentAttributes = westGeometry.attributes;
                    currentIndices = westGeometry.indices;
                    currentIndexMap = westGeometryIndexMap;
                } else {
                    currentAttributes = eastGeometry.attributes;
                    currentIndices = eastGeometry.indices;
                    currentIndexMap = eastGeometryIndexMap;
                }

                insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i, p0);
                insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, i + 1, p1);
            }
        }

        updateInstanceAfterSplit(instance, westGeometry, eastGeometry);
    }

    var cartesian2Scratch0 = new Cartesian2();
    var cartesian2Scratch1 = new Cartesian2();

    var cartesian3Scratch0 = new Cartesian3();
    var cartesian3Scratch1 = new Cartesian3();
    var cartesian3Scratch2 = new Cartesian3();
    var cartesian3Scratch3 = new Cartesian3();
    var cartesian3Scratch4 = new Cartesian3();
    var cartesian3Scratch5 = new Cartesian3();
    var cartesian3Scratch6 = new Cartesian3();

    var cartesian4Scratch0 = new Cartesian4();
    var cartesian4Scratch1 = new Cartesian4();

    function splitLongitudePolyline(instance) {
        var geometry = instance.geometry;
        var attributes = geometry.attributes;
        var positions = attributes.position.values;
        var prevPositions = attributes.prevPosition.values;
        var nextPositions = attributes.nextPosition.values;
        var expandAndWidths = attributes.expandAndWidth.values;
        var indices = geometry.indices;

        var texCoords = (defined(attributes.st)) ? attributes.st.values : undefined;
        var colors = (defined(attributes.color)) ? attributes.color.values : undefined;

        var eastGeometry = copyGeometryForSplit(geometry);
        var westGeometry = copyGeometryForSplit(geometry);

        var i;
        var j;
        var index;

        var length = positions.length / 3;
        for (i = 0; i < length; i += 4) {
            var i0 = i;
            var i1 = i + 1;
            var i2 = i + 2;
            var i3 = i + 3;

            var p0 = Cartesian3.fromArray(positions, i0 * 3, cartesian3Scratch0);
            var p1 = Cartesian3.fromArray(positions, i1 * 3, cartesian3Scratch1);
            var p2 = Cartesian3.fromArray(positions, i2 * 3, cartesian3Scratch2);
            var p3 = Cartesian3.fromArray(positions, i3 * 3, cartesian3Scratch3);

            if (Math.abs(p0.y) < CesiumMath.EPSILON6) {
                p0.y = CesiumMath.EPSILON6 * (p2.y < 0.0 ? -1.0 : 1.0);
                p1.y = p0.y;
            }

            if (Math.abs(p2.y) < CesiumMath.EPSILON6) {
                p2.y = CesiumMath.EPSILON6 * (p0.y < 0.0 ? -1.0 : 1.0);
                p3.y = p2.y;
            }

            var p0Attributes = eastGeometry.attributes;
            var p0Indices = eastGeometry.indices;
            var p2Attributes = westGeometry.attributes;
            var p2Indices = westGeometry.indices;

            var intersection = IntersectionTests.lineSegmentPlane(p0, p2, xzPlane, cartesian3Scratch4);
            if (defined(intersection)) {
                // move point on the xz-plane slightly away from the plane
                var offset = Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, 5.0 * CesiumMath.EPSILON9, cartesian3Scratch5);
                if (p0.y < 0.0) {
                    Cartesian3.negate(offset, offset);
                    p0Attributes = westGeometry.attributes;
                    p0Indices = westGeometry.indices;
                    p2Attributes = eastGeometry.attributes;
                    p2Indices = eastGeometry.indices;
                }

                var offsetPoint = Cartesian3.add(intersection, offset, cartesian3Scratch6);
                p0Attributes.position.values.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
                p0Attributes.position.values.push(offsetPoint.x, offsetPoint.y, offsetPoint.z);
                p0Attributes.position.values.push(offsetPoint.x, offsetPoint.y, offsetPoint.z);

                Cartesian3.negate(offset, offset);
                Cartesian3.add(intersection, offset, offsetPoint);
                p2Attributes.position.values.push(offsetPoint.x, offsetPoint.y, offsetPoint.z);
                p2Attributes.position.values.push(offsetPoint.x, offsetPoint.y, offsetPoint.z);
                p2Attributes.position.values.push(p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);

                for (j = i0 * 3; j < i0 * 3 + 2 * 3; ++j) {
                    p0Attributes.prevPosition.values.push(prevPositions[j]);
                }
                p0Attributes.prevPosition.values.push(p0.x, p0.y, p0.z, p0.x, p0.y, p0.z);
                p2Attributes.prevPosition.values.push(p0.x, p0.y, p0.z, p0.x, p0.y, p0.z);
                for (j = i2 * 3; j < i2 * 3 + 2 * 3; ++j) {
                    p2Attributes.prevPosition.values.push(prevPositions[j]);
                }

                for (j = i0 * 3; j < i0 * 3 + 2 * 3; ++j) {
                    p0Attributes.nextPosition.values.push(nextPositions[j]);
                }
                p0Attributes.nextPosition.values.push(p2.x, p2.y, p2.z, p2.x, p2.y, p2.z);
                p2Attributes.nextPosition.values.push(p2.x, p2.y, p2.z, p2.x, p2.y, p2.z);
                for (j = i2 * 3; j < i2 * 3 + 2 * 3; ++j) {
                    p2Attributes.nextPosition.values.push(nextPositions[j]);
                }

                var ew0 = Cartesian2.fromArray(expandAndWidths, i0 * 2, cartesian2Scratch0);
                var width = Math.abs(ew0.y);

                p0Attributes.expandAndWidth.values.push(-1,  width, 1,  width);
                p0Attributes.expandAndWidth.values.push(-1, -width, 1, -width);
                p2Attributes.expandAndWidth.values.push(-1,  width, 1,  width);
                p2Attributes.expandAndWidth.values.push(-1, -width, 1, -width);

                var t = Cartesian3.magnitudeSquared(Cartesian3.subtract(intersection, p0, cartesian3Scratch3));
                t /= Cartesian3.magnitudeSquared(Cartesian3.subtract(p2, p0, cartesian3Scratch3));

                if (defined(colors)) {
                    var c0 = Cartesian4.fromArray(colors, i0 * 4, cartesian4Scratch0);
                    var c2 = Cartesian4.fromArray(colors, i2 * 4, cartesian4Scratch0);

                    var r = CesiumMath.lerp(c0.x, c2.x, t);
                    var g = CesiumMath.lerp(c0.y, c2.y, t);
                    var b = CesiumMath.lerp(c0.z, c2.z, t);
                    var a = CesiumMath.lerp(c0.w, c2.w, t);

                    for (j = i0 * 4; j < i0 * 4 + 2 * 4; ++j) {
                        p0Attributes.color.values.push(colors[j]);
                    }
                    p0Attributes.color.values.push(r, g, b, a);
                    p0Attributes.color.values.push(r, g, b, a);
                    p2Attributes.color.values.push(r, g, b, a);
                    p2Attributes.color.values.push(r, g, b, a);
                    for (j = i2 * 4; j < i2 * 4 + 2 * 4; ++j) {
                        p2Attributes.color.values.push(colors[j]);
                    }
                }

                if (defined(texCoords)) {
                    var s0 = Cartesian2.fromArray(texCoords, i0 * 2, cartesian2Scratch0);
                    var s3 = Cartesian2.fromArray(texCoords, (i + 3) * 2, cartesian2Scratch1);

                    var sx = CesiumMath.lerp(s0.x, s3.x, t);

                    for (j = i0 * 2; j < i0 * 2 + 2 * 2; ++j) {
                        p0Attributes.st.values.push(texCoords[j]);
                    }
                    p0Attributes.st.values.push(sx, s0.y);
                    p0Attributes.st.values.push(sx, s3.y);
                    p2Attributes.st.values.push(sx, s0.y);
                    p2Attributes.st.values.push(sx, s3.y);
                    for (j = i2 * 2; j < i2 * 2 + 2 * 2; ++j) {
                        p2Attributes.st.values.push(texCoords[j]);
                    }
                }

                index = p0Attributes.position.values.length / 3 - 4;
                p0Indices.push(index, index + 2, index + 1);
                p0Indices.push(index + 1, index + 2, index + 3);

                index = p2Attributes.position.values.length / 3 - 4;
                p2Indices.push(index, index + 2, index + 1);
                p2Indices.push(index + 1, index + 2, index + 3);
            } else {
                var currentAttributes;
                var currentIndices;

                if (p0.y < 0.0) {
                    currentAttributes = westGeometry.attributes;
                    currentIndices = westGeometry.indices;
                } else {
                    currentAttributes = eastGeometry.attributes;
                    currentIndices = eastGeometry.indices;
                }

                currentAttributes.position.values.push(p0.x, p0.y, p0.z);
                currentAttributes.position.values.push(p1.x, p1.y, p1.z);
                currentAttributes.position.values.push(p2.x, p2.y, p2.z);
                currentAttributes.position.values.push(p3.x, p3.y, p3.z);

                for (j = i * 3; j < i * 3 + 4 * 3; ++j) {
                    currentAttributes.prevPosition.values.push(prevPositions[j]);
                    currentAttributes.nextPosition.values.push(nextPositions[j]);
                }

                for (j = i * 2; j < i * 2 + 4 * 2; ++j) {
                    currentAttributes.expandAndWidth.values.push(expandAndWidths[j]);
                    if (defined(texCoords)) {
                        currentAttributes.st.values.push(texCoords[j]);
                    }
                }

                if (defined(colors)) {
                    for (j = i * 4; j < i * 4 + 4 * 4; ++j) {
                        currentAttributes.color.values.push(colors[j]);
                    }
                }

                index = currentAttributes.position.values.length / 3 - 4;
                currentIndices.push(index, index + 2, index + 1);
                currentIndices.push(index + 1, index + 2, index + 3);
            }
        }

        updateInstanceAfterSplit(instance, westGeometry, eastGeometry);
    }

    /**
     * Splits the instances's geometry, by introducing new vertices and indices,that
     * intersect the International Date Line and Prime Meridian so that no primitives cross longitude
     * -180/180 degrees.  This is not required for 3D drawing, but is required for
     * correcting drawing in 2D and Columbus view.
     *
     * @private
     *
     * @param {GeometryInstance} instance The instance to modify.
     * @returns {GeometryInstance} The modified <code>instance</code> argument, with it's geometry split at the International Date Line.
     *
     * @example
     * instance = Cesium.GeometryPipeline.splitLongitude(instance);
     */
    GeometryPipeline.splitLongitude = function(instance) {
                if (!defined(instance)) {
            throw new DeveloperError('instance is required.');
        }
        
        var geometry = instance.geometry;
        var boundingSphere = geometry.boundingSphere;
        if (defined(boundingSphere)) {
            var minX = boundingSphere.center.x - boundingSphere.radius;
            if (minX > 0 || BoundingSphere.intersect(boundingSphere, Cartesian4.UNIT_Y) !== Intersect.INTERSECTING) {
                return instance;
            }
        }

        if (geometry.geometryType !== GeometryType.NONE) {
            switch (geometry.geometryType) {
            case GeometryType.POLYLINES:
                splitLongitudePolyline(instance);
                break;
            case GeometryType.TRIANGLES:
                splitLongitudeTriangles(instance);
                break;
            case GeometryType.LINES:
                splitLongitudeLines(instance);
                break;
            }
        } else {
            indexPrimitive(geometry);
            if (geometry.primitiveType === PrimitiveType.TRIANGLES) {
                splitLongitudeTriangles(instance);
            } else if (geometry.primitiveType === PrimitiveType.LINES) {
                splitLongitudeLines(instance);
            }
        }

        return instance;
    };

    return GeometryPipeline;
});

/*global define*/
define('Core/VertexFormat',[
        './defaultValue',
        './defined',
        './DeveloperError',
        './freezeObject'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        freezeObject) {
    "use strict";

    /**
     * A vertex format defines what attributes make up a vertex.  A VertexFormat can be provided
     * to a {@link Geometry} to request that certain properties be computed, e.g., just position,
     * position and normal, etc.
     *
     * @param {Object} [options] An object with boolean properties corresponding to VertexFormat properties as shown in the code example.
     *
     * @alias VertexFormat
     * @constructor
     *
     * @example
     * // Create a vertex format with position and 2D texture coordinate attributes.
     * var format = new Cesium.VertexFormat({
     *   position : true,
     *   st : true
     * });
     *
     * @see Geometry#attributes
     * @see Packable
     */
    var VertexFormat = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * When <code>true</code>, the vertex has a 3D position attribute.
         * <p>
         * 64-bit floating-point (for precision).  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.position = defaultValue(options.position, false);

        /**
         * When <code>true</code>, the vertex has a normal attribute (normalized), which is commonly used for lighting.
         * <p>
         * 32-bit floating-point.  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.normal = defaultValue(options.normal, false);

        /**
         * When <code>true</code>, the vertex has a 2D texture coordinate attribute.
         * <p>
         * 32-bit floating-point.  2 components per attribute
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.st = defaultValue(options.st, false);

        /**
         * When <code>true</code>, the vertex has a binormal attribute (normalized), which is used for tangent-space effects like bump mapping.
         * <p>
         * 32-bit floating-point.  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.binormal = defaultValue(options.binormal, false);

        /**
         * When <code>true</code>, the vertex has a tangent attribute (normalized), which is used for tangent-space effects like bump mapping.
         * <p>
         * 32-bit floating-point.  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.tangent = defaultValue(options.tangent, false);

        /**
         * When <code>true</code>, the vertex has an RGB color attribute.
         * <p>
         * 8-bit unsigned byte.  3 components per attribute.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.color = defaultValue(options.color, false);
    };

    /**
     * An immutable vertex format with only a position attribute.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     */
    VertexFormat.POSITION_ONLY = freezeObject(new VertexFormat({
        position : true
    }));

    /**
     * An immutable vertex format with position and normal attributes.
     * This is compatible with per-instance color appearances like {@link PerInstanceColorAppearance}.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#normal
     */
    VertexFormat.POSITION_AND_NORMAL = freezeObject(new VertexFormat({
        position : true,
        normal : true
    }));

    /**
     * An immutable vertex format with position, normal, and st attributes.
     * This is compatible with {@link MaterialAppearance} when {@link MaterialAppearance#materialSupport}
     * is <code>TEXTURED/code>.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#normal
     * @see VertexFormat#st
     */
    VertexFormat.POSITION_NORMAL_AND_ST = freezeObject(new VertexFormat({
        position : true,
        normal : true,
        st : true
    }));

    /**
     * An immutable vertex format with position and st attributes.
     * This is compatible with {@link EllipsoidSurfaceAppearance}.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#st
     */
    VertexFormat.POSITION_AND_ST = freezeObject(new VertexFormat({
        position : true,
        st : true
    }));

    /**
     * An immutable vertex format with position and color attributes.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#color
     */
    VertexFormat.POSITION_AND_COLOR = freezeObject(new VertexFormat({
        position : true,
        color : true
    }));

    /**
     * An immutable vertex format with well-known attributes: position, normal, st, binormal, and tangent.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#normal
     * @see VertexFormat#st
     * @see VertexFormat#binormal
     * @see VertexFormat#tangent
     */
    VertexFormat.ALL = freezeObject(new VertexFormat({
        position : true,
        normal : true,
        st : true,
        binormal : true,
        tangent  : true
    }));

    /**
     * An immutable vertex format with position, normal, and st attributes.
     * This is compatible with most appearances and materials; however
     * normal and st attributes are not always required.  When this is
     * known in advance, another <code>VertexFormat</code> should be used.
     *
     * @type {VertexFormat}
     * @constant
     *
     * @see VertexFormat#position
     * @see VertexFormat#normal
     */
    VertexFormat.DEFAULT = VertexFormat.POSITION_NORMAL_AND_ST;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    VertexFormat.packedLength = 6;

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    VertexFormat.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value.position ? 1.0 : 0.0;
        array[startingIndex++] = value.normal ? 1.0 : 0.0;
        array[startingIndex++] = value.st ? 1.0 : 0.0;
        array[startingIndex++] = value.binormal ? 1.0 : 0.0;
        array[startingIndex++] = value.tangent ? 1.0 : 0.0;
        array[startingIndex++] = value.color ? 1.0 : 0.0;
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {VertexFormat} [result] The object into which to store the result.
     */
    VertexFormat.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        if (!defined(result)) {
            result = new VertexFormat();
        }

        result.position = array[startingIndex++] === 1.0;
        result.normal   = array[startingIndex++] === 1.0;
        result.st       = array[startingIndex++] === 1.0;
        result.binormal = array[startingIndex++] === 1.0;
        result.tangent  = array[startingIndex++] === 1.0;
        result.color    = array[startingIndex++] === 1.0;
        return result;
    };

    /**
     * Duplicates a VertexFormat instance.
     *
     * @param {VertexFormat} cartesian The vertex format to duplicate.
     * @param {VertexFormat} [result] The object onto which to store the result.
     * @returns {VertexFormat} The modified result parameter or a new VertexFormat instance if one was not provided. (Returns undefined if vertexFormat is undefined)
     */
    VertexFormat.clone = function(vertexFormat, result) {
        if (!defined(vertexFormat)) {
            return undefined;
        }
        if (!defined(result)) {
            result = new VertexFormat();
        }

        result.position = vertexFormat.position;
        result.normal = vertexFormat.normal;
        result.st = vertexFormat.st;
        result.binormal = vertexFormat.binormal;
        result.tangent = vertexFormat.tangent;
        result.color = vertexFormat.color;
        return result;
    };

    return VertexFormat;
});
/*global define*/
define('Core/EllipseGeometry',[
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './EllipseGeometryLibrary',
        './Ellipsoid',
        './GeographicProjection',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstance',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './Matrix3',
        './PrimitiveType',
        './Quaternion',
        './VertexFormat'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        EllipseGeometryLibrary,
        Ellipsoid,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        Matrix3,
        PrimitiveType,
        Quaternion,
        VertexFormat) {
    "use strict";

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();
    var texCoordScratch = new Cartesian2();
    var textureMatrixScratch = new Matrix3();
    var quaternionScratch = new Quaternion();

    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();

    var scratchCartographic = new Cartographic();
    var projectedCenterScratch = new Cartesian3();

    var scratchMinTexCoord = new Cartesian2();
    var scratchMaxTexCoord = new Cartesian2();

    function computeTopBottomAttributes(positions, options, extrude) {
        var vertexFormat = options.vertexFormat;
        var center = options.center;
        var semiMajorAxis = options.semiMajorAxis;
        var semiMinorAxis = options.semiMinorAxis;
        var ellipsoid = options.ellipsoid;
        var stRotation = options.stRotation;
        var size = (extrude) ? positions.length / 3 * 2 : positions.length / 3;

        var textureCoordinates = (vertexFormat.st) ? new Float32Array(size * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Float32Array(size * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(size * 3) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(size * 3) : undefined;

        var textureCoordIndex = 0;

        // Raise positions to a height above the ellipsoid and compute the
        // texture coordinates, normals, tangents, and binormals.
        var normal = scratchNormal;
        var tangent = scratchTangent;
        var binormal = scratchBinormal;

        var projection = new GeographicProjection(ellipsoid);
        var projectedCenter = projection.project(ellipsoid.cartesianToCartographic(center, scratchCartographic), projectedCenterScratch);

        var geodeticNormal = ellipsoid.scaleToGeodeticSurface(center, scratchCartesian1);
        ellipsoid.geodeticSurfaceNormal(geodeticNormal, geodeticNormal);
        var rotation = Quaternion.fromAxisAngle(geodeticNormal, stRotation, quaternionScratch);
        var textureMatrix = Matrix3.fromQuaternion(rotation, textureMatrixScratch);

        var minTexCoord = Cartesian2.fromElements(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, scratchMinTexCoord);
        var maxTexCoord = Cartesian2.fromElements(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, scratchMaxTexCoord);

        var length = positions.length;
        var bottomOffset = (extrude) ? length : 0;
        var stOffset = bottomOffset / 3 * 2;
        for ( var i = 0; i < length; i += 3) {
            var i1 = i + 1;
            var i2 = i + 2;
            var position = Cartesian3.fromArray(positions, i, scratchCartesian1);

            if (vertexFormat.st) {
                var rotatedPoint = Matrix3.multiplyByVector(textureMatrix, position, scratchCartesian2);
                var projectedPoint = projection.project(ellipsoid.cartesianToCartographic(rotatedPoint, scratchCartographic), scratchCartesian3);
                Cartesian3.subtract(projectedPoint, projectedCenter, projectedPoint);

                texCoordScratch.x = (projectedPoint.x + semiMajorAxis) / (2.0 * semiMajorAxis);
                texCoordScratch.y = (projectedPoint.y + semiMinorAxis) / (2.0 * semiMinorAxis);

                minTexCoord.x = Math.min(texCoordScratch.x, minTexCoord.x);
                minTexCoord.y = Math.min(texCoordScratch.y, minTexCoord.y);
                maxTexCoord.x = Math.max(texCoordScratch.x, maxTexCoord.x);
                maxTexCoord.y = Math.max(texCoordScratch.y, maxTexCoord.y);

                if (extrude) {
                    textureCoordinates[textureCoordIndex + stOffset] = texCoordScratch.x;
                    textureCoordinates[textureCoordIndex + 1 + stOffset] = texCoordScratch.y;
                }

                textureCoordinates[textureCoordIndex++] = texCoordScratch.x;
                textureCoordinates[textureCoordIndex++] = texCoordScratch.y;
            }

            normal = ellipsoid.geodeticSurfaceNormal(position, normal);

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                if (vertexFormat.tangent || vertexFormat.binormal) {
                    tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                    Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                }
                if (vertexFormat.normal) {
                    normals[i] = normal.x;
                    normals[i1] = normal.y;
                    normals[i2] = normal.z;
                    if (extrude) {
                        normals[i + bottomOffset] = -normal.x;
                        normals[i1 + bottomOffset] = -normal.y;
                        normals[i2 + bottomOffset] = -normal.z;
                    }
                }

                if (vertexFormat.tangent) {
                    tangents[i] = tangent.x;
                    tangents[i1] = tangent.y;
                    tangents[i2] = tangent.z;
                    if (extrude) {
                        tangents[i + bottomOffset] = -tangent.x;
                        tangents[i1 + bottomOffset] = -tangent.y;
                        tangents[i2 + bottomOffset] = -tangent.z;
                    }
                }

                if (vertexFormat.binormal) {
                    binormal = Cartesian3.cross(normal, tangent, binormal);
                    binormals[i] = binormal.x;
                    binormals[i1] = binormal.y;
                    binormals[i2] = binormal.z;
                    if (extrude) {
                        binormals[i + bottomOffset] = binormal.x;
                        binormals[i1 + bottomOffset] = binormal.y;
                        binormals[i2 + bottomOffset] = binormal.z;
                    }
                }
            }
        }

        if (vertexFormat.st) {
            length = textureCoordinates.length;
            for (var k = 0; k < length; k += 2) {
                textureCoordinates[k] = (textureCoordinates[k] - minTexCoord.x) / (maxTexCoord.x - minTexCoord.x);
                textureCoordinates[k + 1] = (textureCoordinates[k + 1] - minTexCoord.y) / (maxTexCoord.y - minTexCoord.y);
            }
        }

        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            var finalPositions = EllipseGeometryLibrary.raisePositionsToHeight(positions, options, extrude);
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : finalPositions
            });
        }

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }

        if (vertexFormat.tangent) {
            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : tangents
            });
        }

        if (vertexFormat.binormal) {
            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : binormals
            });
        }
        return attributes;
    }


    function topIndices(numPts) {
        // The number of triangles in the ellipse on the positive x half-space and for
        // the column of triangles in the middle is:
        //
        // numTriangles = 4 + 8 + 12 + ... = 4 + (4 + 4) + (4 + 4 + 4) + ... = 4 * (1 + 2 + 3 + ...)
        //              = 4 * ((n * ( n + 1)) / 2)
        // numColumnTriangles = 2 * 2 * n
        // total = 2 * numTrangles + numcolumnTriangles
        //
        // Substitute (numPts - 1.0) for n above
        var indices = new Array(2 * numPts * (numPts + 1));
        var indicesIndex = 0;
        var prevIndex;
        var numInterior;
        var positionIndex;
        var i;
        var j;
        // Indices triangles to the 'left' of the north vector
        for (i = 1; i < numPts; ++i) {
            positionIndex = i * (i + 1);
            prevIndex = (i - 1) * i;

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = prevIndex;
            indices[indicesIndex++] = positionIndex;

            numInterior = 2 * i;
            for (j = 0; j < numInterior - 1; ++j) {

                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = prevIndex;
                indices[indicesIndex++] = positionIndex;
            }

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = prevIndex;
            indices[indicesIndex++] = positionIndex;
        }

        // Indices for central column of triangles
        numInterior = numPts * 2;
        ++positionIndex;
        ++prevIndex;
        for (i = 0; i < numInterior - 1; ++i) {
            indices[indicesIndex++] = positionIndex;
            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = prevIndex;

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = prevIndex;
            indices[indicesIndex++] = positionIndex;
        }

        // Reverse the process creating indices to the 'right' of the north vector
        ++prevIndex;
        ++positionIndex;
        for (i = numPts - 1; i > 0; --i) {
            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = prevIndex;
            indices[indicesIndex++] = positionIndex;

            numInterior = 2 * i;
            for (j = 0; j < numInterior - 1; ++j) {
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = prevIndex;
                indices[indicesIndex++] = positionIndex;
            }

            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = positionIndex++;
        }
        return indices;
    }

    var boundingSphereCenter = new Cartesian3();
    function computeEllipse(options) {
        var center = options.center;
        boundingSphereCenter = Cartesian3.multiplyByScalar(options.ellipsoid.geodeticSurfaceNormal(center, boundingSphereCenter), options.height, boundingSphereCenter);
        boundingSphereCenter = Cartesian3.add(center, boundingSphereCenter, boundingSphereCenter);
        var boundingSphere = new BoundingSphere(boundingSphereCenter, options.semiMajorAxis);
        var cep = EllipseGeometryLibrary.computeEllipsePositions(options, true, false);
        var positions = cep.positions;
        var numPts = cep.numPts;
        var attributes = computeTopBottomAttributes(positions, options, false);
        var indices = topIndices(numPts);
        indices = IndexDatatype.createTypedArray(positions.length / 3, indices);
        return {
            boundingSphere : boundingSphere,
            attributes : attributes,
            indices : indices
        };
    }

    function computeWallAttributes(positions, options) {
        var vertexFormat = options.vertexFormat;
        var center = options.center;
        var semiMajorAxis = options.semiMajorAxis;
        var semiMinorAxis = options.semiMinorAxis;
        var ellipsoid = options.ellipsoid;
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var stRotation = options.stRotation;
        var size = positions.length / 3 * 2;

        var finalPositions = new Float64Array(size * 3);
        var textureCoordinates = (vertexFormat.st) ? new Float32Array(size * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Float32Array(size * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(size * 3) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(size * 3) : undefined;

        var textureCoordIndex = 0;

        // Raise positions to a height above the ellipsoid and compute the
        // texture coordinates, normals, tangents, and binormals.
        var normal = scratchNormal;
        var tangent = scratchTangent;
        var binormal = scratchBinormal;

        var projection = new GeographicProjection(ellipsoid);
        var projectedCenter = projection.project(ellipsoid.cartesianToCartographic(center, scratchCartographic), projectedCenterScratch);

        var geodeticNormal = ellipsoid.scaleToGeodeticSurface(center, scratchCartesian1);
        ellipsoid.geodeticSurfaceNormal(geodeticNormal, geodeticNormal);
        var rotation = Quaternion.fromAxisAngle(geodeticNormal, stRotation, quaternionScratch);
        var textureMatrix = Matrix3.fromQuaternion(rotation, textureMatrixScratch);

        var minTexCoord = Cartesian2.fromElements(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, scratchMinTexCoord);
        var maxTexCoord = Cartesian2.fromElements(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, scratchMaxTexCoord);

        var length = positions.length;
        var stOffset = length / 3 * 2;
        for ( var i = 0; i < length; i += 3) {
            var i1 = i + 1;
            var i2 = i + 2;
            var position = Cartesian3.fromArray(positions, i, scratchCartesian1);
            var extrudedPosition;

            if (vertexFormat.st) {
                var rotatedPoint = Matrix3.multiplyByVector(textureMatrix, position, scratchCartesian2);
                var projectedPoint = projection.project(ellipsoid.cartesianToCartographic(rotatedPoint, scratchCartographic), scratchCartesian3);
                Cartesian3.subtract(projectedPoint, projectedCenter, projectedPoint);

                texCoordScratch.x = (projectedPoint.x + semiMajorAxis) / (2.0 * semiMajorAxis);
                texCoordScratch.y = (projectedPoint.y + semiMinorAxis) / (2.0 * semiMinorAxis);

                minTexCoord.x = Math.min(texCoordScratch.x, minTexCoord.x);
                minTexCoord.y = Math.min(texCoordScratch.y, minTexCoord.y);
                maxTexCoord.x = Math.max(texCoordScratch.x, maxTexCoord.x);
                maxTexCoord.y = Math.max(texCoordScratch.y, maxTexCoord.y);

                textureCoordinates[textureCoordIndex + stOffset] = texCoordScratch.x;
                textureCoordinates[textureCoordIndex + 1 + stOffset] = texCoordScratch.y;

                textureCoordinates[textureCoordIndex++] = texCoordScratch.x;
                textureCoordinates[textureCoordIndex++] = texCoordScratch.y;
            }

            position = ellipsoid.scaleToGeodeticSurface(position, position);
            extrudedPosition = Cartesian3.clone(position, scratchCartesian2);
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            var scaledNormal = Cartesian3.multiplyByScalar(normal, height, scratchCartesian4);
            position = Cartesian3.add(position, scaledNormal, position);
            scaledNormal = Cartesian3.multiplyByScalar(normal, extrudedHeight, scaledNormal);
            extrudedPosition = Cartesian3.add(extrudedPosition, scaledNormal, extrudedPosition);

            if (vertexFormat.position) {
                finalPositions[i + length] = extrudedPosition.x;
                finalPositions[i1 + length] = extrudedPosition.y;
                finalPositions[i2 + length] = extrudedPosition.z;

                finalPositions[i] = position.x;
                finalPositions[i1] = position.y;
                finalPositions[i2] = position.z;
            }

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {

                binormal = Cartesian3.clone(normal, binormal);
                var next = Cartesian3.fromArray(positions, (i + 3) % length, scratchCartesian4);
                Cartesian3.subtract(next, position, next);
                var bottom = Cartesian3.subtract(extrudedPosition, position, scratchCartesian3);

                normal = Cartesian3.normalize(Cartesian3.cross(bottom, next, normal), normal);

                if (vertexFormat.normal) {
                    normals[i] = normal.x;
                    normals[i1] = normal.y;
                    normals[i2] = normal.z;

                    normals[i + length] = normal.x;
                    normals[i1 + length] = normal.y;
                    normals[i2 + length] = normal.z;
                }

                if (vertexFormat.tangent) {
                    tangent = Cartesian3.normalize(Cartesian3.cross(binormal, normal, tangent), tangent);
                    tangents[i] = tangent.x;
                    tangents[i1] = tangent.y;
                    tangents[i2] = tangent.z;

                    tangents[i + length] = tangent.x;
                    tangents[i + 1 + length] = tangent.y;
                    tangents[i + 2 + length] = tangent.z;
                }

                if (vertexFormat.binormal) {
                    binormals[i] = binormal.x;
                    binormals[i1] = binormal.y;
                    binormals[i2] = binormal.z;

                    binormals[i + length] = binormal.x;
                    binormals[i1 + length] = binormal.y;
                    binormals[i2 + length] = binormal.z;
                }
            }
        }

        if (vertexFormat.st) {
            length = textureCoordinates.length;
            for (var k = 0; k < length; k += 2) {
                textureCoordinates[k] = (textureCoordinates[k] - minTexCoord.x) / (maxTexCoord.x - minTexCoord.x);
                textureCoordinates[k + 1] = (textureCoordinates[k + 1] - minTexCoord.y) / (maxTexCoord.y - minTexCoord.y);
            }
        }

        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : finalPositions
            });
        }

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }

        if (vertexFormat.tangent) {
            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : tangents
            });
        }

        if (vertexFormat.binormal) {
            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : binormals
            });
        }
        return attributes;
    }

    function computeWallIndices(positions) {
        var length = positions.length / 3;
        var indices = IndexDatatype.createTypedArray(length, length * 6);
        var index = 0;
        for (var i = 0; i < length; i++) {
            var UL = i;
            var LL = i + length;
            var UR = (UL + 1) % length;
            var LR = UR + length;
            indices[index++] = UL;
            indices[index++] = LL;
            indices[index++] = UR;
            indices[index++] = UR;
            indices[index++] = LL;
            indices[index++] = LR;
        }

        return indices;
    }

    var topBoundingSphere = new BoundingSphere();
    var bottomBoundingSphere = new BoundingSphere();
    function computeExtrudedEllipse(options) {
        var center = options.center;
        var ellipsoid = options.ellipsoid;
        var semiMajorAxis = options.semiMajorAxis;
        var scaledNormal = Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center, scratchCartesian1), options.height, scratchCartesian1);
        topBoundingSphere.center = Cartesian3.add(center, scaledNormal, topBoundingSphere.center);
        topBoundingSphere.radius = semiMajorAxis;

        scaledNormal = Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center, scaledNormal), options.extrudedHeight, scaledNormal);
        bottomBoundingSphere.center = Cartesian3.add(center, scaledNormal, bottomBoundingSphere.center);
        bottomBoundingSphere.radius = semiMajorAxis;

        var cep = EllipseGeometryLibrary.computeEllipsePositions(options, true, true);
        var positions = cep.positions;
        var numPts = cep.numPts;
        var outerPositions = cep.outerPositions;
        var boundingSphere = BoundingSphere.union(topBoundingSphere, bottomBoundingSphere);
        var topBottomAttributes = computeTopBottomAttributes(positions, options, true);
        var indices = topIndices(numPts);
        var length = indices.length;
        indices.length = length * 2;
        var posLength = positions.length / 3;
        for ( var i = 0; i < length; i += 3) {
            indices[i + length] = indices[i + 2] + posLength;
            indices[i + 1 + length] = indices[i + 1] + posLength;
            indices[i + 2 + length] = indices[i] + posLength;
        }

        var topBottomIndices = IndexDatatype.createTypedArray(posLength * 2 / 3, indices);

        var topBottomGeo = new Geometry({
            attributes : topBottomAttributes,
            indices : topBottomIndices,
            primitiveType : PrimitiveType.TRIANGLES
        });

        var wallAttributes = computeWallAttributes(outerPositions, options);
        indices = computeWallIndices(outerPositions);
        var wallIndices = IndexDatatype.createTypedArray(outerPositions.length * 2 / 3, indices);

        var wallGeo = new Geometry({
            attributes : wallAttributes,
            indices : wallIndices,
            primitiveType : PrimitiveType.TRIANGLES
        });

        var geo = GeometryPipeline.combineInstances([
            new GeometryInstance({
                geometry : topBottomGeo
            }),
            new GeometryInstance({
                geometry : wallGeo
            })
        ]);

        return {
            boundingSphere : boundingSphere,
            attributes : geo[0].attributes,
            indices : geo[0].indices
        };
    }

    /**
     * A description of an ellipse on an ellipsoid.
     *
     * @alias EllipseGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.center The ellipse's center point in the fixed frame.
     * @param {Number} options.semiMajorAxis The length of the ellipse's semi-major axis in meters.
     * @param {Number} options.semiMinorAxis The length of the ellipse's semi-minor axis in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the ellipse will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.extrudedHeight] The height of the extrusion.
     * @param {Number} [options.rotation=0.0] The angle from north (clockwise) in radians.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The angular distance between points on the ellipse in radians.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} semiMajorAxis and semiMinorAxis must be greater than zero.
     * @exception {DeveloperError} semiMajorAxis must be larger than the semiMinorAxis.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @see EllipseGeometry.createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Ellipse.html|Cesium Sandcastle Ellipse Demo}
     *
     * @example
     * // Create an ellipse.
     * var ellipse = new Cesium.EllipseGeometry({
     *   center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
     *   semiMajorAxis : 500000.0,
     *   semiMinorAxis : 300000.0,
     *   rotation : Cesium.Math.toRadians(60.0)
     * });
     * var geometry = Cesium.EllipseGeometry.createGeometry(ellipse);
     */
    var EllipseGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var center = options.center;
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var semiMajorAxis = options.semiMajorAxis;
        var semiMinorAxis = options.semiMinorAxis;
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var height = defaultValue(options.height, 0.0);
        var extrudedHeight = options.extrudedHeight;
        var extrude = (defined(extrudedHeight) && Math.abs(height - extrudedHeight) > 1.0);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

                if (!defined(center)) {
            throw new DeveloperError('center is required.');
        }
        if (!defined(semiMajorAxis)) {
            throw new DeveloperError('semiMajorAxis is required.');
        }
        if (!defined(semiMinorAxis)) {
            throw new DeveloperError('semiMinorAxis is required.');
        }
        if (semiMajorAxis <= 0.0 || semiMinorAxis <= 0.0) {
            throw new DeveloperError('Semi-major and semi-minor axes must be greater than zero.');
        }
        if (semiMajorAxis < semiMinorAxis) {
            throw new DeveloperError('semiMajorAxis must be larger than the semiMinorAxis.');
        }
        if (granularity <= 0.0) {
            throw new DeveloperError('granularity must be greater than zero.');
        }
        
        this._center = Cartesian3.clone(center);
        this._semiMajorAxis = semiMajorAxis;
        this._semiMinorAxis = semiMinorAxis;
        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._rotation = defaultValue(options.rotation, 0.0);
        this._stRotation = defaultValue(options.stRotation, 0.0);
        this._height = height;
        this._granularity = granularity;
        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._extrudedHeight = defaultValue(extrudedHeight, height);
        this._extrude = extrude;
        this._workerName = 'createEllipseGeometry';
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    EllipseGeometry.packedLength = Cartesian3.packedLength + Ellipsoid.packedLength + VertexFormat.packedLength + 8;

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    EllipseGeometry.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        Cartesian3.pack(value._center, array, startingIndex);
        startingIndex += Cartesian3.packedLength;

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex++] = value._semiMajorAxis;
        array[startingIndex++] = value._semiMinorAxis;
        array[startingIndex++] = value._rotation;
        array[startingIndex++] = value._stRotation;
        array[startingIndex++] = value._height;
        array[startingIndex++] = value._granularity;
        array[startingIndex++] = value._extrudedHeight;
        array[startingIndex]   = value._extrude ? 1.0 : 0.0;
    };

    var scratchCenter = new Cartesian3();
    var scratchEllipsoid = new Ellipsoid();
    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        center : scratchCenter,
        ellipsoid : scratchEllipsoid,
        vertexFormat : scratchVertexFormat,
        semiMajorAxis : undefined,
        semiMinorAxis : undefined,
        rotation : undefined,
        stRotation : undefined,
        height : undefined,
        granularity : undefined,
        extrudedHeight : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {EllipseGeometry} [result] The object into which to store the result.
     */
    EllipseGeometry.unpack = function(array, startingIndex, result) {
                if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        
        startingIndex = defaultValue(startingIndex, 0);

        var center = Cartesian3.unpack(array, startingIndex, scratchCenter);
        startingIndex += Cartesian3.packedLength;

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var semiMajorAxis = array[startingIndex++];
        var semiMinorAxis = array[startingIndex++];
        var rotation = array[startingIndex++];
        var stRotation = array[startingIndex++];
        var height = array[startingIndex++];
        var granularity = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var extrude = array[startingIndex] === 1.0;

        if (!defined(result)) {
            scratchOptions.height = height;
            scratchOptions.extrudedHeight = extrudedHeight;
            scratchOptions.granularity = granularity;
            scratchOptions.stRotation = stRotation;
            scratchOptions.rotation = rotation;
            scratchOptions.semiMajorAxis = semiMajorAxis;
            scratchOptions.semiMinorAxis = semiMinorAxis;
            return new EllipseGeometry(scratchOptions);
        }

        result._center = Cartesian3.clone(center, result._center);
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._semiMajorAxis = semiMajorAxis;
        result._semiMinorAxis = semiMinorAxis;
        result._rotation = rotation;
        result._stRotation = stRotation;
        result._height = height;
        result._granularity = granularity;
        result._extrudedHeight = extrudedHeight;
        result._extrude = extrude;

        return result;
    };

    /**
     * Computes the geometric representation of a ellipse on an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {EllipseGeometry} ellipseGeometry A description of the ellipse.
     * @returns {Geometry} The computed vertices and indices.
     */
    EllipseGeometry.createGeometry = function(ellipseGeometry) {
        ellipseGeometry._center = ellipseGeometry._ellipsoid.scaleToGeodeticSurface(ellipseGeometry._center, ellipseGeometry._center);
        var options = {
            center : ellipseGeometry._center,
            semiMajorAxis : ellipseGeometry._semiMajorAxis,
            semiMinorAxis : ellipseGeometry._semiMinorAxis,
            ellipsoid : ellipseGeometry._ellipsoid,
            rotation : ellipseGeometry._rotation,
            height : ellipseGeometry._height,
            extrudedHeight : ellipseGeometry._extrudedHeight,
            granularity : ellipseGeometry._granularity,
            vertexFormat : ellipseGeometry._vertexFormat,
            stRotation : ellipseGeometry._stRotation
        };
        var geometry;
        if (ellipseGeometry._extrude) {
            options.extrudedHeight = Math.min(ellipseGeometry._extrudedHeight, ellipseGeometry._height);
            options.height = Math.max(ellipseGeometry._extrudedHeight, ellipseGeometry._height);
            geometry = computeExtrudedEllipse(options);
        } else {
            geometry = computeEllipse(options);
        }

        return new Geometry({
            attributes : geometry.attributes,
            indices : geometry.indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : geometry.boundingSphere
        });
    };

    return EllipseGeometry;
});

/*global define*/
define('Core/CircleGeometry',[
        './Cartesian3',
        './defaultValue',
        './defined',
        './DeveloperError',
        './EllipseGeometry',
        './Ellipsoid',
        './VertexFormat'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        EllipseGeometry,
        Ellipsoid,
        VertexFormat) {
    "use strict";

    /**
     * A description of a circle on the ellipsoid.
     *
     * @alias CircleGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.center The circle's center point in the fixed frame.
     * @param {Number} options.radius The radius in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the circle will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the circle in radians.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.extrudedHeight=0.0] The height of the extrusion relative to the ellipsoid.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     *
     * @exception {DeveloperError} radius must be greater than zero.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @see CircleGeometry.createGeometry
     * @see Packable
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Circle.html|Cesium Sandcastle Circle Demo}
     *
     * @example
     * // Create a circle.
     * var circle = new Cesium.CircleGeometry({
     *   center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
     *   radius : 100000.0
     * });
     * var geometry = Cesium.CircleGeometry.createGeometry(circle);
     */
    var CircleGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var radius = options.radius;

                if (!defined(radius)) {
            throw new DeveloperError('radius is required.');
        }
        if (radius <= 0.0) {
            throw new DeveloperError('radius must be greater than zero.');
        }
        
        var ellipseGeometryOptions = {
            center : options.center,
            semiMajorAxis : radius,
            semiMinorAxis : radius,
            ellipsoid : options.ellipsoid,
            height : options.height,
            extrudedHeight : options.extrudedHeight,
            granularity : options.granularity,
            vertexFormat : options.vertexFormat,
            stRotation : options.stRotation
        };
        this._ellipseGeometry = new EllipseGeometry(ellipseGeometryOptions);
        this._workerName = 'createCircleGeometry';
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    CircleGeometry.packedLength = EllipseGeometry.packedLength;

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    CircleGeometry.pack = function(value, array, startingIndex) {
                if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
                EllipseGeometry.pack(value._ellipseGeometry, array, startingIndex);
    };

    var scratchEllipseGeometry = new EllipseGeometry({
        center : new Cartesian3(),
        semiMajorAxis : 1.0,
        semiMinorAxis : 1.0
    });
    var scratchOptions = {
        center : new Cartesian3(),
        radius : undefined,
        ellipsoid : Ellipsoid.clone(Ellipsoid.UNIT_SPHERE),
        height : undefined,
        extrudedHeight : undefined,
        granularity : undefined,
        vertexFormat : new VertexFormat(),
        stRotation : undefined,
        semiMajorAxis : undefined,
        semiMinorAxis : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {CircleGeometry} [result] The object into which to store the result.
     */
    CircleGeometry.unpack = function(array, startingIndex, result) {
        var ellipseGeometry = EllipseGeometry.unpack(array, startingIndex, scratchEllipseGeometry);
        scratchOptions.center = Cartesian3.clone(ellipseGeometry._center, scratchOptions.center);
        scratchOptions.ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid, scratchOptions.ellipsoid);
        scratchOptions.height = ellipseGeometry._height;
        scratchOptions.extrudedHeight = ellipseGeometry._extrudedHeight;
        scratchOptions.granularity = ellipseGeometry._granularity;
        scratchOptions.vertexFormat = VertexFormat.clone(ellipseGeometry._vertexFormat, scratchOptions.vertexFormat);
        scratchOptions.stRotation = ellipseGeometry._stRotation;

        if (!defined(result)) {
            scratchOptions.radius = ellipseGeometry._semiMajorAxis;
            return new CircleGeometry(scratchOptions);
        }

        scratchOptions.semiMajorAxis = ellipseGeometry._semiMajorAxis;
        scratchOptions.semiMinorAxis = ellipseGeometry._semiMinorAxis;
        result._ellipseGeometry = new EllipseGeometry(scratchOptions);
        return result;
    };

    /**
     * Computes the geometric representation of a circle on an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {CircleGeometry} circleGeometry A description of the circle.
     * @returns {Geometry} The computed vertices and indices.
     */
    CircleGeometry.createGeometry = function(circleGeometry) {
        return EllipseGeometry.createGeometry(circleGeometry._ellipseGeometry);
    };

    return CircleGeometry;
});
/*global define*/
define('Workers/createCircleGeometry',[
        '../Core/Cartesian3',
        '../Core/CircleGeometry',
        '../Core/defined',
        '../Core/Ellipsoid'
    ], function(
        Cartesian3,
        CircleGeometry,
        defined,
        Ellipsoid) {
    "use strict";

    function createCircleGeometry(circleGeometry, offset) {
        if (defined(offset)) {
            circleGeometry = CircleGeometry.unpack(circleGeometry, offset);
        }
        circleGeometry._ellipseGeometry._center = Cartesian3.clone(circleGeometry._ellipseGeometry._center);
        circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(circleGeometry._ellipseGeometry._ellipsoid);
        return CircleGeometry.createGeometry(circleGeometry);
    }

    return createCircleGeometry;
});
}());