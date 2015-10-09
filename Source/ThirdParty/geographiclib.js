/*
 * Geodesic routines from GeographicLib translated to JavaScript.  See
 * http://geographiclib.sf.net/html/other.html#javascript
 *
 * The algorithms are derived in
 *
 *    Charles F. F. Karney,
 *    Algorithms for geodesics, J. Geodesy 87, 43-55 (2013),
 *    https://dx.doi.org/10.1007/s00190-012-0578-z
 *    Addenda: http://geographiclib.sf.net/geod-addenda.html
 *
 * This file is the concatenation and compression of the JavaScript files in
 * doc/scripts/GeographicLib in the source tree for GeographicLib.
 *
 * Copyright (c) Charles Karney (2011-2015) <charles@karney.com> and licensed
 * under the MIT/X11 License.  For more information, see
 * http://geographiclib.sf.net/
 *
 * Version: 1.45
 * File inventory:
 *   Math.js Geodesic.js GeodesicLine.js PolygonArea.js DMS.js
 */

(function(cb) {

/**************** Math.js ****************/
/*
 * Math.js
 * Transcription of Math.hpp, Constants.hpp, and Accumulator.hpp into
 * JavaScript.
 *
 * Copyright (c) Charles Karney (2011-2015) <charles@karney.com> and licensed
 * under the MIT/X11 License.  For more information, see
 * http://geographiclib.sourceforge.net/
 */

/**
 * @namespace GeographicLib
 * @description The parent namespace for the following modules:
 * - {@link module:GeographicLib/Geodesic GeographicLib/Geodesic} The main
 *   engine for solving geodesic problems via the
 *   {@link module:GeographicLib/Geodesic.Geodesic Geodesic} class.
 * - {@link module:GeographicLib/GeodesicLine GeographicLib/GeodesicLine}
 *   computes points along a single geodesic line via the
 *   {@link module:GeographicLib/GeodesicLine.GeodesicLine GeodesicLine}
 *   class.
 * - {@link module:GeographicLib/PolygonArea GeographicLib/PolygonArea}
 *   computes the area of a geodesic polygon via the
 *   {@link module:GeographicLib/PolygonArea.PolygonArea PolygonArea}
 *   class.
 * - {@link module:GeographicLib/DMS GeographicLib/DMS} handles the decoding
 *   and encoding of angles in degree, minutes, and seconds, via static
 *   functions in this module.
 * - {@link module:GeographicLib/Constants GeographicLib/Constants} defines
 *   constants specifying the version numbers and the parameters for the WGS84
 *   ellipsoid.
 *
 * The following modules are used internally by the package:
 * - {@link module:GeographicLib/Math GeographicLib/Math} defines various
 *   mathematical functions.
 * - {@link module:GeographicLib/Accumulator GeographicLib/Accumulator}
 *   interally used by
 *   {@link module:GeographicLib/PolygonArea.PolygonArea PolygonArea} (via the
 *   {@link module:GeographicLib/Accumulator.Accumulator Accumulator} class)
 *   for summing the contributions to the area of a polygon.
 */
var GeographicLib = {};
GeographicLib.Constants = {};
GeographicLib.Math = {};
GeographicLib.Accumulator = {};

(function(
  /**
   * @exports GeographicLib/Constants
   * @description Define constants defining the version and WGS84 parameters.
   */
  c) {
  "use strict";

  /**
   * @constant
   * @summary WGS84 parameters.
   * @property {number} a the equatorial radius (meters).
   * @property {number} f the flattening.
   */
  c.WGS84 = { a: 6378137, f: 1/298.257223563 };
  /**
   * @constant
   * @summary an array of version numbers.
   * @property {number} major the major version number.
   * @property {number} minor the minor version number.
   * @property {number} patch the patch number.
   */
  c.version = { major: 1, minor: 45, patch: 0 };
  /**
   * @constant
   * @summary version string
   */
  c.version_string = "1.45";
})(GeographicLib.Constants);

(function(
  /**
   * @exports GeographicLib/Math
   * @description Some useful mathematical constants and functions (mainly for
   *   internal use).
   */
  m) {
  "use strict";

  /**
   * @summary The number of digits of precision in floating-point numbers.
   * @constant {number}
   */
  m.digits = 53;
  /**
   * @summary The machine epsilon.
   * @constant {number}
   */
  m.epsilon = Math.pow(0.5, m.digits - 1);
  /**
   * @summary The factor to convert degrees to radians.
   * @constant {number}
   */
  m.degree = Math.PI/180;

  /**
   * @summary Square a number.
   * @param {number} x the number.
   * @returns {number} the square.
   */
  m.sq = function(x) { return x * x; };

  /**
   * @summary The hypotenuse function.
   * @param {number} x the first side.
   * @param {number} y the second side.
   * @returns {number} the hypotenuse.
   */
  m.hypot = function(x, y) {
    var a, b;
    x = Math.abs(x);
    y = Math.abs(y);
    a = Math.max(x, y); b = Math.min(x, y) / (a ? a : 1);
    return a * Math.sqrt(1 + b * b);
  };

  /**
   * @summary Cube root function.
   * @param {number} x the argument.
   * @returns {number} the real cube root.
   */
  m.cbrt = function(x) {
    var y = Math.pow(Math.abs(x), 1/3);
    return x < 0 ? -y : y;
  };

  /**
   * @summary The log1p function.
   * @param {number} x the argument.
   * @returns {number} log(1 + x).
   */
  m.log1p = function(x) {
    var y = 1 + x,
        z = y - 1;
    // Here's the explanation for this magic: y = 1 + z, exactly, and z
    // approx x, thus log(y)/z (which is nearly constant near z = 0) returns
    // a good approximation to the true log(1 + x)/x.  The multiplication x *
    // (log(y)/z) introduces little additional error.
    return z === 0 ? x : x * Math.log(y) / z;
  };

  /**
   * @summary Inverse hyperbolic tangent.
   * @param {number} x the argument.
   * @returns {number} tanh<sup>&minus;1</sup> x.
   */
  m.atanh = function(x) {
    var y = Math.abs(x);          // Enforce odd parity
    y = m.log1p(2 * y/(1 - y))/2;
    return x < 0 ? -y : y;
  };

  /**
   * @summary An error-free sum.
   * @param {number} u
   * @param {number} v
   * @returns {object} sum with sum.s = round(u + v) and sum.t is u + v &minus;
   *   round(u + v)
   */
  m.sum = function(u, v) {
    var s = u + v,
        up = s - v,
        vpp = s - up,
        t;
    up -= u;
    vpp -= v;
    t = -(up + vpp);
    // u + v =       s      + t
    //       = round(u + v) + t
    return {s: s, t: t};
  };

  /**
   * @summary Evaluate a polynomial.
   * @param {integer} N the order of the polynomial.
   * @param {array} p the coefficient array (of size N + 1) (leading
   *   order coefficient first)
   * @param {number} x the variable.
   * @returns {number} the value of the polynomial.
   */
  m.polyval = function(N, p, s, x) {
    var y = N < 0 ? 0 : p[s++];
    while (--N >= 0) y = y * x + p[s++];
    return y;
  };

  /**
   * @summary Coarsen a value close to zero.
   * @param {number} x
   * @returns {number} the coarsened value.
   */
  m.AngRound = function(x) {
    // The makes the smallest gap in x = 1/16 - nextafter(1/16, 0) = 1/2^57 for
    // reals = 0.7 pm on the earth if x is an angle in degrees.  (This is about
    // 1000 times more resolution than we get with angles around 90 degrees.)
    // We use this to avoid having to deal with near singular cases when x is
    // non-zero but tiny (e.g., 1.0e-200).  This also converts -0 to +0.
    var z = 1/16,
        y = Math.abs(x);
    // The compiler mustn't "simplify" z - (z - y) to y
    y = y < z ? z - (z - y) : y;
    return x < 0 ? 0 - y : y;
  };

  /**
   * @summary Normalize an angle.
   * @param {number} x the angle in degrees.
   * @returns {number} the angle reduced to the range [&minus;180&deg;,
   *   180&deg;).
   */
  m.AngNormalize = function(x) {
    // Place angle in [-180, 180).
    x = x % 360;
    return x < -180 ? x + 360 : (x < 180 ? x : x - 360);
  };

  /**
   * @summary Normalize a latitude.
   * @param {number} x the angle in degrees.
   * @returns {number} x if it is in the range [&minus;90&deg;, 90&deg;],
   *   otherwise return NaN.
   */
  m.LatFix = function(x) {
    // Replace angle with NaN if outside [-90, 90].
    return Math.abs(x) > 90 ? Number.NaN : x;
  };

  /**
   * @summary Difference of two angles reduced to [&minus;180&deg;,
   *   180&deg;]
   * @param {number} x the first angle in degrees.
   * @param {number} y the second angle in degrees.
   * @return {number} y &minus; x, reduced to the range [&minus;180&deg;,
   *   180&deg;].
   */
  m.AngDiff = function(x, y) {
    // Compute y - x and reduce to [-180,180] accurately.
    var r = m.sum(m.AngNormalize(x), m.AngNormalize(-y)),
        d = - m.AngNormalize(r.s),
        t = r.t;
    return (d == 180 && t < 0 ? -180 : d) - t;
  };

  /**
   * @summary Evaluate the sine and cosine function with the argument in
   *   degrees
   * @param {number} x in degrees.
   * @returns {object} r with r.s = sin(x) and r.c = cos(x).
   */
  m.sincosd = function(x) {
    // In order to minimize round-off errors, this function exactly reduces
    // the argument to the range [-45, 45] before converting it to radians.
    var r, q, s, c, sinx, cosx;
    r = x % 360;
    q = Math.floor(r / 90 + 0.5);
    r -= 90 * q;
    // now abs(r) <= 45
    r *= this.degree;
    // Possibly could call the gnu extension sincos
    s = Math.sin(r); c = Math.cos(r);
    switch (q & 3) {
    case  0: sinx =     s; cosx =     c; break;
    case  1: sinx =     c; cosx = 0 - s; break;
    case  2: sinx = 0 - s; cosx = 0 - c; break;
    default: sinx = 0 - c; cosx =     s; break; // case 3
    }
    return {s: sinx, c: cosx};
  };

  /**
   * @summary Evaluate the atan2 function with the result in degrees
   * @param {number} y
   * @param {number} x
   * @returns atan2(y, x) in degrees, in the range [&minus;180&deg;
   *   180&deg;).
   */
  m.atan2d = function(y, x) {
    // In order to minimize round-off errors, this function rearranges the
    // arguments so that result of atan2 is in the range [-pi/4, pi/4] before
    // converting it to degrees and mapping the result to the correct
    // quadrant.
    var q = 0, t, ang;
    if (Math.abs(y) > Math.abs(x)) { t = x; x = y; y = t; q = 2; }
    if (x < 0) { x = -x; ++q; }
    // here x >= 0 and x >= abs(y), so angle is in [-pi/4, pi/4]
    ang = Math.atan2(y, x) / this.degree;
    switch (q) {
      // Note that atan2d(-0.0, 1.0) will return -0.  However, we expect that
      // atan2d will not be called with y = -0.  If need be, include
      //
      //   case 0: ang = 0 + ang; break;
      //
      // and handle mpfr as in AngRound.
    case 1: ang = (y > 0 ? 180 : -180) - ang; break;
    case 2: ang =  90 - ang; break;
    case 3: ang = -90 + ang; break;
    }
    return ang;
  };
})(GeographicLib.Math);

(function(
  /**
   * @exports GeographicLib/Accumulator
   * @description Accurate summation via the
   *   {@link module:GeographicLib/Accumulator.Accumulator Accumulator} class
   *   (mainly for internal use).
   */
  a, m) {
  "use strict";

  /**
   * @class
   * @summary Accurate summation of many numbers.
   * @classdesc This allows many numbers to be added together with twice the
   *   normal precision.  In the documentation of the member functions, sum
   *   stands for the value currently held in the accumulator.
   * @param {number | Accumulator} [y = 0]  set sum = y.
   */
  a.Accumulator = function(y) {
    this.Set(y);
  };

  /**
   * @summary Set the accumulator to a number.
   * @param {number | Accumulator} [y = 0] set sum = y.
   */
  a.Accumulator.prototype.Set = function(y) {
    if (!y) y = 0;
    if (y.constructor === a.Accumulator) {
      this._s = y._s;
      this._t = y._t;
    } else {
      this._s = y;
      this._t = 0;
    }
  };

  /**
   * @summary Add a number to the accumulator.
   * @param {number} [y = 0] set sum += y.
   */
  a.Accumulator.prototype.Add = function(y) {
    // Here's Shewchuk's solution...
    // Accumulate starting at least significant end
    var u = m.sum(y, this._t),
        v = m.sum(u.s, this._s);
    u = u.t;
    this._s = v.s;
    this._t = v.t;
    // Start is _s, _t decreasing and non-adjacent.  Sum is now (s + t + u)
    // exactly with s, t, u non-adjacent and in decreasing order (except
    // for possible zeros).  The following code tries to normalize the
    // result.  Ideally, we want _s = round(s+t+u) and _u = round(s+t+u -
    // _s).  The follow does an approximate job (and maintains the
    // decreasing non-adjacent property).  Here are two "failures" using
    // 3-bit floats:
    //
    // Case 1: _s is not equal to round(s+t+u) -- off by 1 ulp
    // [12, -1] - 8 -> [4, 0, -1] -> [4, -1] = 3 should be [3, 0] = 3
    //
    // Case 2: _s+_t is not as close to s+t+u as it shold be
    // [64, 5] + 4 -> [64, 8, 1] -> [64,  8] = 72 (off by 1)
    //                    should be [80, -7] = 73 (exact)
    //
    // "Fixing" these problems is probably not worth the expense.  The
    // representation inevitably leads to small errors in the accumulated
    // values.  The additional errors illustrated here amount to 1 ulp of
    // the less significant word during each addition to the Accumulator
    // and an additional possible error of 1 ulp in the reported sum.
    //
    // Incidentally, the "ideal" representation described above is not
    // canonical, because _s = round(_s + _t) may not be true.  For
    // example, with 3-bit floats:
    //
    // [128, 16] + 1 -> [160, -16] -- 160 = round(145).
    // But [160, 0] - 16 -> [128, 16] -- 128 = round(144).
    //
    if (this._s === 0)          // This implies t == 0,
      this._s = u;              // so result is u
    else
      this._t += u;             // otherwise just accumulate u to t.
  };

  /**
   * @summary Return the result of adding a number to sum (but
   *   don't change sum).
   * @param {number} [y = 0] the number to be added to the sum.
   * @return sum + y.
   */
  a.Accumulator.prototype.Sum = function(y) {
    var b;
    if (!y)
      return this._s;
    else {
      b = new a.Accumulator(this);
      b.Add(y);
      return b._s;
    }
  };

  /**
   * @summary Set sum = &minus;sum.
   */
  a.Accumulator.prototype.Negate = function() {
    this._s *= -1;
    this._t *= -1;
  };
})(GeographicLib.Accumulator, GeographicLib.Math);

/**************** Geodesic.js ****************/
/*
 * Geodesic.js
 * Transcription of Geodesic.[ch]pp into JavaScript.
 *
 * See the documentation for the C++ class.  The conversion is a literal
 * conversion from C++.
 *
 * The algorithms are derived in
 *
 *    Charles F. F. Karney,
 *    Algorithms for geodesics, J. Geodesy 87, 43-55 (2013);
 *    https://dx.doi.org/10.1007/s00190-012-0578-z
 *    Addenda: http://geographiclib.sf.net/geod-addenda.html
 *
 * Copyright (c) Charles Karney (2011-2015) <charles@karney.com> and licensed
 * under the MIT/X11 License.  For more information, see
 * http://geographiclib.sourceforge.net/
 */

// Load AFTER Math.js

GeographicLib.Geodesic = {};
GeographicLib.GeodesicLine = {};
GeographicLib.PolygonArea = {};

(function(
  /**
   * @exports GeographicLib/Geodesic
   * @description Solve geodesic problems via the
   *   {@link module:GeographicLib/Geodesic.Geodesic Geodesic} class.
   */
  g, l, p, m, c) {
  "use strict";

  var GEOGRAPHICLIB_GEODESIC_ORDER = 6,
      nA1_ = GEOGRAPHICLIB_GEODESIC_ORDER,
      nA2_ = GEOGRAPHICLIB_GEODESIC_ORDER,
      nA3_ = GEOGRAPHICLIB_GEODESIC_ORDER,
      nA3x_ = nA3_,
      nC3x_, nC4x_,
      maxit1_ = 20,
      maxit2_ = maxit1_ + m.digits + 10,
      tol0_ = m.epsilon,
      tol1_ = 200 * tol0_,
      tol2_ = Math.sqrt(tol0_),
      tolb_ = tol0_ * tol1_,
      xthresh_ = 1000 * tol2_,
      CAP_NONE = 0,
      CAP_ALL  = 0x1F,
      CAP_MASK = CAP_ALL,
      OUT_ALL  = 0x7F80,
      Astroid,
      A1m1f_coeff, C1f_coeff, C1pf_coeff,
      A2m1f_coeff, C2f_coeff,
      A3_coeff, C3_coeff, C4_coeff;

  g.tiny_ = Math.sqrt(Number.MIN_VALUE);
  g.nC1_ = GEOGRAPHICLIB_GEODESIC_ORDER;
  g.nC1p_ = GEOGRAPHICLIB_GEODESIC_ORDER;
  g.nC2_ = GEOGRAPHICLIB_GEODESIC_ORDER;
  g.nC3_ = GEOGRAPHICLIB_GEODESIC_ORDER;
  g.nC4_ = GEOGRAPHICLIB_GEODESIC_ORDER;
  nC3x_ = (g.nC3_ * (g.nC3_ - 1)) / 2;
  nC4x_ = (g.nC4_ * (g.nC4_ + 1)) / 2,
  g.CAP_C1   = 1<<0;
  g.CAP_C1p  = 1<<1;
  g.CAP_C2   = 1<<2;
  g.CAP_C3   = 1<<3;
  g.CAP_C4   = 1<<4;

  g.NONE          = 0;
  g.LATITUDE      = 1<<7  | CAP_NONE;
  g.LONGITUDE     = 1<<8  | g.CAP_C3;
  g.AZIMUTH       = 1<<9  | CAP_NONE;
  g.DISTANCE      = 1<<10 | g.CAP_C1;
  g.STANDARD      = g.LATITUDE | g.LONGITUDE | g.AZIMUTH | g.DISTANCE;
  g.DISTANCE_IN   = 1<<11 | g.CAP_C1 | g.CAP_C1p;
  g.REDUCEDLENGTH = 1<<12 | g.CAP_C1 | g.CAP_C2;
  g.GEODESICSCALE = 1<<13 | g.CAP_C1 | g.CAP_C2;
  g.AREA          = 1<<14 | g.CAP_C4;
  g.ALL           = OUT_ALL| CAP_ALL;
  g.LONG_UNROLL   = 1<<15;
  g.OUT_MASK      = OUT_ALL| g.LONG_UNROLL;

  g.SinCosSeries = function(sinp, sinx, cosx, c) {
    // Evaluate
    // y = sinp ? sum(c[i] * sin( 2*i    * x), i, 1, n) :
    //            sum(c[i] * cos((2*i+1) * x), i, 0, n-1)
    // using Clenshaw summation.  N.B. c[0] is unused for sin series
    // Approx operation count = (n + 5) mult and (2 * n + 2) add
    var k = c.length,           // Point to one beyond last element
        n = k - (sinp ? 1 : 0),
        ar = 2 * (cosx - sinx) * (cosx + sinx), // 2 * cos(2 * x)
        y0 = n & 1 ? c[--k] : 0, y1 = 0;        // accumulators for sum
    // Now n is even
    n = Math.floor(n/2);
    while (n--) {
      // Unroll loop x 2, so accumulators return to their original role
      y1 = ar * y0 - y1 + c[--k];
      y0 = ar * y1 - y0 + c[--k];
    }
    return (sinp ? 2 * sinx * cosx * y0 : // sin(2 * x) * y0
            cosx * (y0 - y1));            // cos(x) * (y0 - y1)
  };

  Astroid = function(x, y) {
    // Solve k^4+2*k^3-(x^2+y^2-1)*k^2-2*y^2*k-y^2 = 0 for positive
    // root k.  This solution is adapted from Geocentric::Reverse.
    var k,
        p = m.sq(x),
        q = m.sq(y),
        r = (p + q - 1) / 6,
        S, r2, r3, disc, u, T3, T, ang, v, uv, w;
    if ( !(q === 0 && r <= 0) ) {
      // Avoid possible division by zero when r = 0 by multiplying
      // equations for s and t by r^3 and r, resp.
      S = p * q / 4;            // S = r^3 * s
      r2 = m.sq(r);
      r3 = r * r2
      // The discriminant of the quadratic equation for T3.  This is
      // zero on the evolute curve p^(1/3)+q^(1/3) = 1
      disc = S * (S + 2 * r3);
      u = r;
      if (disc >= 0) {
        T3 = S + r3;
        // Pick the sign on the sqrt to maximize abs(T3).  This
        // minimizes loss of precision due to cancellation.  The
        // result is unchanged because of the way the T is used
        // in definition of u.
        T3 += T3 < 0 ? -Math.sqrt(disc) : Math.sqrt(disc);    // T3 = (r * t)^3
        // N.B. cbrt always returns the real root.  cbrt(-8) = -2.
        T = m.cbrt(T3);     // T = r * t
        // T can be zero; but then r2 / T -> 0.
        u += T + (T !== 0 ? r2 / T : 0);
      } else {
        // T is complex, but the way u is defined the result is real.
        ang = Math.atan2(Math.sqrt(-disc), -(S + r3));
        // There are three possible cube roots.  We choose the
        // root which avoids cancellation.  Note that disc < 0
        // implies that r < 0.
        u += 2 * r * Math.cos(ang / 3);
      }
      v = Math.sqrt(m.sq(u) + q);       // guaranteed positive
      // Avoid loss of accuracy when u < 0.
      uv = u < 0 ? q / (v - u) : u + v; // u+v, guaranteed positive
      w = (uv - q) / (2 * v);           // positive?
      // Rearrange expression for k to avoid loss of accuracy due to
      // subtraction.  Division by 0 not possible because uv > 0, w >= 0.
      k = uv / (Math.sqrt(uv + m.sq(w)) + w); // guaranteed positive
    } else {                                  // q == 0 && r <= 0
      // y = 0 with |x| <= 1.  Handle this case directly.
      // for y small, positive root is k = abs(y)/sqrt(1-x^2)
      k = 0;
    }
    return k;
  };

  A1m1f_coeff = [
    // (1-eps)*A1-1, polynomial in eps2 of order 3
      +1, 4, 64, 0, 256,
  ];

  // The scale factor A1-1 = mean value of (d/dsigma)I1 - 1
  g.A1m1f = function(eps) {
    var p = Math.floor(nA1_/2),
        t = m.polyval(p, A1m1f_coeff, 0, m.sq(eps)) / A1m1f_coeff[p + 1];
    return (t + eps) / (1 - eps);
  };

  C1f_coeff = [
    // C1[1]/eps^1, polynomial in eps2 of order 2
      -1, 6, -16, 32,
    // C1[2]/eps^2, polynomial in eps2 of order 2
      -9, 64, -128, 2048,
    // C1[3]/eps^3, polynomial in eps2 of order 1
      +9, -16, 768,
    // C1[4]/eps^4, polynomial in eps2 of order 1
      +3, -5, 512,
    // C1[5]/eps^5, polynomial in eps2 of order 0
      -7, 1280,
    // C1[6]/eps^6, polynomial in eps2 of order 0
      -7, 2048,
  ];

  // The coefficients C1[l] in the Fourier expansion of B1
  g.C1f = function(eps, c) {
    var eps2 = m.sq(eps),
        d = eps,
        o = 0,
        l, p;
    for (l = 1; l <= g.nC1_; ++l) {     // l is index of C1p[l]
      p = Math.floor((g.nC1_ - l) / 2); // order of polynomial in eps^2
      c[l] = d * m.polyval(p, C1f_coeff, o, eps2) / C1f_coeff[o + p + 1];
      o += p + 2;
      d *= eps;
    }
  };

  C1pf_coeff = [
    // C1p[1]/eps^1, polynomial in eps2 of order 2
      +205, -432, 768, 1536,
    // C1p[2]/eps^2, polynomial in eps2 of order 2
      +4005, -4736, 3840, 12288,
    // C1p[3]/eps^3, polynomial in eps2 of order 1
      -225, 116, 384,
    // C1p[4]/eps^4, polynomial in eps2 of order 1
      -7173, 2695, 7680,
    // C1p[5]/eps^5, polynomial in eps2 of order 0
      +3467, 7680,
    // C1p[6]/eps^6, polynomial in eps2 of order 0
      +38081, 61440,
  ];

  // The coefficients C1p[l] in the Fourier expansion of B1p
  g.C1pf = function(eps, c) {
    var eps2 = m.sq(eps),
        d = eps,
        o = 0,
        l, p;
    for (l = 1; l <= g.nC1p_; ++l) {     // l is index of C1p[l]
      p = Math.floor((g.nC1p_ - l) / 2); // order of polynomial in eps^2
      c[l] = d * m.polyval(p, C1pf_coeff, o, eps2) / C1pf_coeff[o + p + 1];
      o += p + 2;
      d *= eps;
    }
  };

  A2m1f_coeff = [
    // (eps+1)*A2-1, polynomial in eps2 of order 3
      -11, -28, -192, 0, 256,
  ];

  // The scale factor A2-1 = mean value of (d/dsigma)I2 - 1
  g.A2m1f = function(eps) {
    var p = Math.floor(nA2_/2),
        t = m.polyval(p, A2m1f_coeff, 0, m.sq(eps)) / A2m1f_coeff[p + 1];
    return (t - eps) / (1 + eps);
  };

  C2f_coeff = [
    // C2[1]/eps^1, polynomial in eps2 of order 2
      +1, 2, 16, 32,
    // C2[2]/eps^2, polynomial in eps2 of order 2
      +35, 64, 384, 2048,
    // C2[3]/eps^3, polynomial in eps2 of order 1
      +15, 80, 768,
    // C2[4]/eps^4, polynomial in eps2 of order 1
      +7, 35, 512,
    // C2[5]/eps^5, polynomial in eps2 of order 0
      +63, 1280,
    // C2[6]/eps^6, polynomial in eps2 of order 0
      +77, 2048,
  ];

  // The coefficients C2[l] in the Fourier expansion of B2
  g.C2f = function(eps, c) {
    var eps2 = m.sq(eps),
        d = eps,
        o = 0,
        l, p;
    for (l = 1; l <= g.nC2_; ++l) {     // l is index of C2[l]
      p = Math.floor((g.nC2_ - l) / 2); // order of polynomial in eps^2
      c[l] = d * m.polyval(p, C2f_coeff, o, eps2) / C2f_coeff[o + p + 1];
      o += p + 2;
      d *= eps;
    }
  };

  /**
   * @class
   * @property {number} a the equatorial radius (meters).
   * @property {number} f the flattening.
   * @summary Initialize a Geodesic object for a specific ellipsoid.
   * @classdesc Performs geodesic calculations on an ellipsoid of revolution.
   *   The routines for solving the direct and inverse problems return an
   *   object with some of the following fields set: lat1, lon1, azi1, lat2,
   *   lon2, azi2, s12, a12, m12, M12, M21, S12.  See {@tutorial 2-interface},
   *   "The results".
   * @example
   * var GeographicLib = require("geographiclib"),
   *     geod = GeographicLib.Geodesic.WGS84;
   * var inv = geod.Inverse(1,2,3,4);
   * console.log("lat1 = " + inv.lat1 + ", lon1 = " + inv.lon1 +
   *             ", lat2 = " + inv.lat2 + ", lon2 = " + inv.lon2 +
   *             ",\nazi1 = " + inv.azi1 + ", azi2 = " + inv.azi2 +
   *             ", s12 = " + inv.s12);
   * @param {number} a the equatorial radius of the ellipsoid (meters).
   * @param {number} f the flattening of the ellipsoid.  Setting f = 0 gives
   *   a sphere (on which geodesics are great circles).  Negative f gives a
   *   prolate ellipsoid.
   * @throws an error if the parameters are illegal.
   */
  g.Geodesic = function(a, f) {
    this.a = a;
    this.f = f;
    this._f1 = 1 - this.f;
    this._e2 = this.f * (2 - this.f);
    this._ep2 = this._e2 / m.sq(this._f1); // e2 / (1 - e2)
    this._n = this.f / ( 2 - this.f);
    this._b = this.a * this._f1;
    // authalic radius squared
    this._c2 = (m.sq(this.a) + m.sq(this._b) *
                (this._e2 === 0 ? 1 :
                 (this._e2 > 0 ? m.atanh(Math.sqrt(this._e2)) :
                  Math.atan(Math.sqrt(-this._e2))) /
                 Math.sqrt(Math.abs(this._e2))))/2;
    // The sig12 threshold for "really short".  Using the auxiliary sphere
    // solution with dnm computed at (bet1 + bet2) / 2, the relative error in
    // the azimuth consistency check is sig12^2 * abs(f) * min(1, 1-f/2) / 2.
    // (Error measured for 1/100 < b/a < 100 and abs(f) >= 1/1000.  For a given
    // f and sig12, the max error occurs for lines near the pole.  If the old
    // rule for computing dnm = (dn1 + dn2)/2 is used, then the error increases
    // by a factor of 2.)  Setting this equal to epsilon gives sig12 = etol2.
    // Here 0.1 is a safety factor (error decreased by 100) and max(0.001,
    // abs(f)) stops etol2 getting too large in the nearly spherical case.
    this._etol2 = 0.1 * tol2_ /
      Math.sqrt( Math.max(0.001, Math.abs(this.f)) *
                 Math.min(1.0, 1 - this.f/2) / 2 );
    if (!(isFinite(this.a) && this.a > 0))
      throw new Error("Major radius is not positive");
    if (!(isFinite(this._b) && this._b > 0))
      throw new Error("Minor radius is not positive");
    this._A3x = new Array(nA3x_);
    this._C3x = new Array(nC3x_);
    this._C4x = new Array(nC4x_);
    this.A3coeff();
    this.C3coeff();
    this.C4coeff();
  };

  A3_coeff = [
    // A3, coeff of eps^5, polynomial in n of order 0
      -3, 128,
    // A3, coeff of eps^4, polynomial in n of order 1
      -2, -3, 64,
    // A3, coeff of eps^3, polynomial in n of order 2
      -1, -3, -1, 16,
    // A3, coeff of eps^2, polynomial in n of order 2
      +3, -1, -2, 8,
    // A3, coeff of eps^1, polynomial in n of order 1
      +1, -1, 2,
    // A3, coeff of eps^0, polynomial in n of order 0
      +1, 1,
  ];

  // The scale factor A3 = mean value of (d/dsigma)I3
  g.Geodesic.prototype.A3coeff = function() {
    var o = 0, k = 0,
        j, p;
    for (j = nA3_ - 1; j >= 0; --j) { // coeff of eps^j
      p = Math.min(nA3_ - j - 1, j);  // order of polynomial in n
      this._A3x[k++] = m.polyval(p, A3_coeff, o, this._n)
        / A3_coeff[o + p + 1];
      o += p + 2;
    }
  };

  C3_coeff = [
    // C3[1], coeff of eps^5, polynomial in n of order 0
      +3, 128,
    // C3[1], coeff of eps^4, polynomial in n of order 1
      +2, 5, 128,
    // C3[1], coeff of eps^3, polynomial in n of order 2
      -1, 3, 3, 64,
    // C3[1], coeff of eps^2, polynomial in n of order 2
      -1, 0, 1, 8,
    // C3[1], coeff of eps^1, polynomial in n of order 1
      -1, 1, 4,
    // C3[2], coeff of eps^5, polynomial in n of order 0
      +5, 256,
    // C3[2], coeff of eps^4, polynomial in n of order 1
      +1, 3, 128,
    // C3[2], coeff of eps^3, polynomial in n of order 2
      -3, -2, 3, 64,
    // C3[2], coeff of eps^2, polynomial in n of order 2
      +1, -3, 2, 32,
    // C3[3], coeff of eps^5, polynomial in n of order 0
      +7, 512,
    // C3[3], coeff of eps^4, polynomial in n of order 1
      -10, 9, 384,
    // C3[3], coeff of eps^3, polynomial in n of order 2
      +5, -9, 5, 192,
    // C3[4], coeff of eps^5, polynomial in n of order 0
      +7, 512,
    // C3[4], coeff of eps^4, polynomial in n of order 1
      -14, 7, 512,
    // C3[5], coeff of eps^5, polynomial in n of order 0
      +21, 2560,
  ];

  // The coefficients C3[l] in the Fourier expansion of B3
  g.Geodesic.prototype.C3coeff = function() {
    var o = 0, k = 0,
        l, j, p;
    for (l = 1; l < g.nC3_; ++l) {        // l is index of C3[l]
      for (j = g.nC3_ - 1; j >= l; --j) { // coeff of eps^j
        p = Math.min(g.nC3_ - j - 1, j);  // order of polynomial in n
        this._C3x[k++] = m.polyval(p, C3_coeff, o, this._n) /
          C3_coeff[o + p + 1];
        o += p + 2;
      }
    }
  };

  C4_coeff = [
    // C4[0], coeff of eps^5, polynomial in n of order 0
      +97, 15015,
    // C4[0], coeff of eps^4, polynomial in n of order 1
      +1088, 156, 45045,
    // C4[0], coeff of eps^3, polynomial in n of order 2
      -224, -4784, 1573, 45045,
    // C4[0], coeff of eps^2, polynomial in n of order 3
      -10656, 14144, -4576, -858, 45045,
    // C4[0], coeff of eps^1, polynomial in n of order 4
      +64, 624, -4576, 6864, -3003, 15015,
    // C4[0], coeff of eps^0, polynomial in n of order 5
      +100, 208, 572, 3432, -12012, 30030, 45045,
    // C4[1], coeff of eps^5, polynomial in n of order 0
      +1, 9009,
    // C4[1], coeff of eps^4, polynomial in n of order 1
      -2944, 468, 135135,
    // C4[1], coeff of eps^3, polynomial in n of order 2
      +5792, 1040, -1287, 135135,
    // C4[1], coeff of eps^2, polynomial in n of order 3
      +5952, -11648, 9152, -2574, 135135,
    // C4[1], coeff of eps^1, polynomial in n of order 4
      -64, -624, 4576, -6864, 3003, 135135,
    // C4[2], coeff of eps^5, polynomial in n of order 0
      +8, 10725,
    // C4[2], coeff of eps^4, polynomial in n of order 1
      +1856, -936, 225225,
    // C4[2], coeff of eps^3, polynomial in n of order 2
      -8448, 4992, -1144, 225225,
    // C4[2], coeff of eps^2, polynomial in n of order 3
      -1440, 4160, -4576, 1716, 225225,
    // C4[3], coeff of eps^5, polynomial in n of order 0
      -136, 63063,
    // C4[3], coeff of eps^4, polynomial in n of order 1
      +1024, -208, 105105,
    // C4[3], coeff of eps^3, polynomial in n of order 2
      +3584, -3328, 1144, 315315,
    // C4[4], coeff of eps^5, polynomial in n of order 0
      -128, 135135,
    // C4[4], coeff of eps^4, polynomial in n of order 1
      -2560, 832, 405405,
    // C4[5], coeff of eps^5, polynomial in n of order 0
      +128, 99099,
  ];

  g.Geodesic.prototype.C4coeff = function() {
    var o = 0, k = 0,
        l, j, p;
    for (l = 0; l < g.nC4_; ++l) {        // l is index of C4[l]
      for (j = g.nC4_ - 1; j >= l; --j) { // coeff of eps^j
        p = g.nC4_ - j - 1;               // order of polynomial in n
        this._C4x[k++] = m.polyval(p, C4_coeff, o, this._n)
          / C4_coeff[o + p + 1];
        o += p + 2;
      }
    }
  };

  g.Geodesic.prototype.A3f = function(eps) {
    // Evaluate A3
    return m.polyval(nA3x_ - 1, this._A3x, 0, eps);
  };

  g.Geodesic.prototype.C3f = function(eps, c) {
    // Evaluate C3 coeffs
    // Elements c[1] thru c[nC3_ - 1] are set
    var mult = 1,
        o = 0,
        l, p;
    for (l = 1; l < g.nC3_; ++l) { // l is index of C3[l]
      p = g.nC3_ - l - 1;          // order of polynomial in eps
      mult *= eps;
      c[l] = mult * m.polyval(p, this._C3x, o, eps);
      o += p + 1;
    }
  };

  g.Geodesic.prototype.C4f = function(eps, c) {
    // Evaluate C4 coeffs
    // Elements c[0] thru c[g.nC4_ - 1] are set
    var mult = 1,
        o = 0,
        l, p;
    for (l = 0; l < g.nC4_; ++l) { // l is index of C4[l]
      p = g.nC4_ - l - 1;          // order of polynomial in eps
      c[l] = mult * m.polyval(p, this._C4x, o, eps);
      o += p + 1;
      mult *= eps;
    }
  };

  // return s12b, m12b, m0, M12, M21
  g.Geodesic.prototype.Lengths = function(eps, sig12,
                                          ssig1, csig1, dn1, ssig2, csig2, dn2,
                                          cbet1, cbet2, outmask,
                                          C1a, C2a) {
    // Return m12b = (reduced length)/_b; also calculate s12b =
    // distance/_b, and m0 = coefficient of secular term in
    // expression for reduced length.
    outmask &= g.OUT_MASK;
    var vals = {},
        m0x = 0, J12 = 0, A1 = 0, A2 = 0,
        B1, B2, l, csig12, t;
    if (outmask & (g.DISTANCE | g.REDUCEDLENGTH | g.GEODESICSCALE)) {
      A1 = g.A1m1f(eps);
      g.C1f(eps, C1a);
      if (outmask & (g.REDUCEDLENGTH | g.GEODESICSCALE)) {
        A2 = g.A2m1f(eps);
        g.C2f(eps, C2a);
        m0x = A1 - A2;
        A2 = 1 + A2;
      }
      A1 = 1 + A1;
    }
    if (outmask & g.DISTANCE) {
      B1 = g.SinCosSeries(true, ssig2, csig2, C1a) -
        g.SinCosSeries(true, ssig1, csig1, C1a);
      // Missing a factor of _b
      vals.s12b = A1 * (sig12 + B1);
      if (outmask & (g.REDUCEDLENGTH | g.GEODESICSCALE)) {
        B2 = g.SinCosSeries(true, ssig2, csig2, C2a) -
          g.SinCosSeries(true, ssig1, csig1, C2a);
        J12 = m0x * sig12 + (A1 * B1 - A2 * B2);
      }
    } else if (outmask & (g.REDUCEDLENGTH | g.GEODESICSCALE)) {
      // Assume here that nC1_ >= nC2_
      for (l = 1; l <= g.nC2_; ++l)
        C2a[l] = A1 * C1a[l] - A2 * C2a[l];
      J12 = m0x * sig12 + (g.SinCosSeries(true, ssig2, csig2, C2a) -
                           g.SinCosSeries(true, ssig1, csig1, C2a));
    }
    if (outmask & g.REDUCEDLENGTH) {
      vals.m0 = m0x;
      // Missing a factor of _b.
      // Add parens around (csig1 * ssig2) and (ssig1 * csig2) to ensure
      // accurate cancellation in the case of coincident points.
      vals.m12b = dn2 * (csig1 * ssig2) - dn1 * (ssig1 * csig2) -
        csig1 * csig2 * J12;
    }
    if (outmask & g.GEODESICSCALE) {
      csig12 = csig1 * csig2 + ssig1 * ssig2;
      t = this._ep2 * (cbet1 - cbet2) * (cbet1 + cbet2) / (dn1 + dn2);
      vals.M12 = csig12 + (t * ssig2 - csig2 * J12) * ssig1 / dn1;
      vals.M21 = csig12 - (t * ssig1 - csig1 * J12) * ssig2 / dn2;
    }
    return vals;
  };

  // return sig12, salp1, calp1, salp2, calp2, dnm
  g.Geodesic.prototype.InverseStart = function(sbet1, cbet1, dn1,
                                               sbet2, cbet2, dn2, lam12,
                                               C1a, C2a) {
    // Return a starting point for Newton's method in salp1 and calp1
    // (function value is -1).  If Newton's method doesn't need to be
    // used, return also salp2 and calp2 and function value is sig12.
    // salp2, calp2 only updated if return val >= 0.
    var vals = {},
        // bet12 = bet2 - bet1 in [0, pi); bet12a = bet2 + bet1 in (-pi, 0]
        sbet12 = sbet2 * cbet1 - cbet2 * sbet1,
        cbet12 = cbet2 * cbet1 + sbet2 * sbet1,
        sbet12a, shortline, omg12, sbetm2, somg12, comg12, t, ssig12, csig12,
        x, y, lamscale, betscale, k2, eps, cbet12a, bet12a, m12b, m0, nvals,
        k, omg12a;
    vals.sig12 = -1;        // Return value
    // Volatile declaration needed to fix inverse cases
    // 88.202499451857 0 -88.202499451857 179.981022032992859592
    // 89.262080389218 0 -89.262080389218 179.992207982775375662
    // 89.333123580033 0 -89.333123580032997687 179.99295812360148422
    // which otherwise fail with g++ 4.4.4 x86 -O3
    sbet12a = sbet2 * cbet1;
    sbet12a += cbet2 * sbet1;

    shortline = cbet12 >= 0 && sbet12 < 0.5 && cbet2 * lam12 < 0.5;
    omg12 = lam12;
    if (shortline) {
      sbetm2 = m.sq(sbet1 + sbet2);
      // sin((bet1+bet2)/2)^2
      // =  (sbet1 + sbet2)^2 / ((sbet1 + sbet2)^2 + (cbet1 + cbet2)^2)
      sbetm2 /= sbetm2 + m.sq(cbet1 + cbet2);
      vals.dnm = Math.sqrt(1 + this._ep2 * sbetm2);
      omg12 /= this._f1 * vals.dnm;
    }
    somg12 = Math.sin(omg12); comg12 = Math.cos(omg12);

    vals.salp1 = cbet2 * somg12;
    vals.calp1 = comg12 >= 0 ?
      sbet12 + cbet2 * sbet1 * m.sq(somg12) / (1 + comg12) :
      sbet12a - cbet2 * sbet1 * m.sq(somg12) / (1 - comg12);

    ssig12 = m.hypot(vals.salp1, vals.calp1);
    csig12 = sbet1 * sbet2 + cbet1 * cbet2 * comg12;

    if (shortline && ssig12 < this._etol2) {
      // really short lines
      vals.salp2 = cbet1 * somg12;
      vals.calp2 = sbet12 - cbet1 * sbet2 *
        (comg12 >= 0 ? m.sq(somg12) / (1 + comg12) : 1 - comg12);
      // norm(vals.salp2, vals.calp2);
      t = m.hypot(vals.salp2, vals.calp2); vals.salp2 /= t; vals.calp2 /= t;
      // Set return value
      vals.sig12 = Math.atan2(ssig12, csig12);
    } else if (Math.abs(this._n) > 0.1 || // Skip astroid calc if too eccentric
               csig12 >= 0 ||
               ssig12 >= 6 * Math.abs(this._n) * Math.PI * m.sq(cbet1)) {
      // Nothing to do, zeroth order spherical approximation is OK
    } else {
      // Scale lam12 and bet2 to x, y coordinate system where antipodal
      // point is at origin and singular point is at y = 0, x = -1.
      if (this.f >= 0) {       // In fact f == 0 does not get here
        // x = dlong, y = dlat
        k2 = m.sq(sbet1) * this._ep2;
        eps = k2 / (2 * (1 + Math.sqrt(1 + k2)) + k2);
        lamscale = this.f * cbet1 * this.A3f(eps) * Math.PI;
        betscale = lamscale * cbet1;

        x = (lam12 - Math.PI) / lamscale;
        y = sbet12a / betscale;
      } else {                  // f < 0
        // x = dlat, y = dlong
        cbet12a = cbet2 * cbet1 - sbet2 * sbet1;
        bet12a = Math.atan2(sbet12a, cbet12a);
        // In the case of lon12 = 180, this repeats a calculation made
        // in Inverse.
        nvals = this.Lengths(this._n, Math.PI + bet12a,
                             sbet1, -cbet1, dn1, sbet2, cbet2, dn2,
                             cbet1, cbet2, g.REDUCEDLENGTH, C1a, C2a);
        m12b = nvals.m12b; m0 = nvals.m0;
        x = -1 + m12b / (cbet1 * cbet2 * m0 * Math.PI);
        betscale = x < -0.01 ? sbet12a / x :
          -this.f * m.sq(cbet1) * Math.PI;
        lamscale = betscale / cbet1;
        y = (lam12 - Math.PI) / lamscale;
      }

      if (y > -tol1_ && x > -1 - xthresh_) {
        // strip near cut
        if (this.f >= 0) {
          vals.salp1 = Math.min(1, -x);
          vals.calp1 = - Math.sqrt(1 - m.sq(vals.salp1));
        } else {
          vals.calp1 = Math.max(x > -tol1_ ? 0 : -1, x);
          vals.salp1 = Math.sqrt(1 - m.sq(vals.calp1));
        }
      } else {
        // Estimate alp1, by solving the astroid problem.
        //
        // Could estimate alpha1 = theta + pi/2, directly, i.e.,
        //   calp1 = y/k; salp1 = -x/(1+k);  for f >= 0
        //   calp1 = x/(1+k); salp1 = -y/k;  for f < 0 (need to check)
        //
        // However, it's better to estimate omg12 from astroid and use
        // spherical formula to compute alp1.  This reduces the mean number of
        // Newton iterations for astroid cases from 2.24 (min 0, max 6) to 2.12
        // (min 0 max 5).  The changes in the number of iterations are as
        // follows:
        //
        // change percent
        //    1       5
        //    0      78
        //   -1      16
        //   -2       0.6
        //   -3       0.04
        //   -4       0.002
        //
        // The histogram of iterations is (m = number of iterations estimating
        // alp1 directly, n = number of iterations estimating via omg12, total
        // number of trials = 148605):
        //
        //  iter    m      n
        //    0   148    186
        //    1 13046  13845
        //    2 93315 102225
        //    3 36189  32341
        //    4  5396      7
        //    5   455      1
        //    6    56      0
        //
        // Because omg12 is near pi, estimate work with omg12a = pi - omg12
        k = Astroid(x, y);
        omg12a = lamscale * ( this.f >= 0 ? -x * k/(1 + k) : -y * (1 + k)/k );
        somg12 = Math.sin(omg12a); comg12 = -Math.cos(omg12a);
        // Update spherical estimate of alp1 using omg12 instead of
        // lam12
        vals.salp1 = cbet2 * somg12;
        vals.calp1 = sbet12a -
          cbet2 * sbet1 * m.sq(somg12) / (1 - comg12);
      }
    }
    // Sanity check on starting guess.  Backwards check allows NaN through.
    if (!(vals.salp1 <= 0)) {
      // norm(vals.salp1, vals.calp1);
      t = m.hypot(vals.salp1, vals.calp1); vals.salp1 /= t; vals.calp1 /= t;
    } else {
      vals.salp1 = 1; vals.calp1 = 0;
    }
    return vals;
  };

  // return lam12, salp2, calp2, sig12, ssig1, csig1, ssig2, csig2, eps,
  // domg12, dlam12,
  g.Geodesic.prototype.Lambda12 = function(sbet1, cbet1, dn1, sbet2, cbet2, dn2,
                                           salp1, calp1, diffp,
                                           C1a, C2a, C3a) {
    var vals = {},
        t, salp0, calp0,
        somg1, comg1, somg2, comg2, omg12, B312, h0, k2, nvals;
    if (sbet1 === 0 && calp1 === 0)
      // Break degeneracy of equatorial line.  This case has already been
      // handled.
      calp1 = -g.tiny_;

    // sin(alp1) * cos(bet1) = sin(alp0)
    salp0 = salp1 * cbet1;
    calp0 = m.hypot(calp1, salp1 * sbet1); // calp0 > 0

    // tan(bet1) = tan(sig1) * cos(alp1)
    // tan(omg1) = sin(alp0) * tan(sig1) = tan(omg1)=tan(alp1)*sin(bet1)
    vals.ssig1 = sbet1; somg1 = salp0 * sbet1;
    vals.csig1 = comg1 = calp1 * cbet1;
    // norm(vals.ssig1, vals.csig1);
    t = m.hypot(vals.ssig1, vals.csig1); vals.ssig1 /= t; vals.csig1 /= t;
    // norm(somg1, comg1); -- don't need to normalize!

    // Enforce symmetries in the case abs(bet2) = -bet1.  Need to be careful
    // about this case, since this can yield singularities in the Newton
    // iteration.
    // sin(alp2) * cos(bet2) = sin(alp0)
    vals.salp2 = cbet2 !== cbet1 ? salp0 / cbet2 : salp1;
    // calp2 = sqrt(1 - sq(salp2))
    //       = sqrt(sq(calp0) - sq(sbet2)) / cbet2
    // and subst for calp0 and rearrange to give (choose positive sqrt
    // to give alp2 in [0, pi/2]).
    vals.calp2 = cbet2 !== cbet1 || Math.abs(sbet2) !== -sbet1 ?
      Math.sqrt(m.sq(calp1 * cbet1) + (cbet1 < -sbet1 ?
                                       (cbet2 - cbet1) * (cbet1 + cbet2) :
                                       (sbet1 - sbet2) * (sbet1 + sbet2))) /
      cbet2 : Math.abs(calp1);
    // tan(bet2) = tan(sig2) * cos(alp2)
    // tan(omg2) = sin(alp0) * tan(sig2).
    vals.ssig2 = sbet2; somg2 = salp0 * sbet2;
    vals.csig2 = comg2 = vals.calp2 * cbet2;
    // norm(vals.ssig2, vals.csig2);
    t = m.hypot(vals.ssig2, vals.csig2); vals.ssig2 /= t; vals.csig2 /= t;
    // norm(somg2, comg2); -- don't need to normalize!

    // sig12 = sig2 - sig1, limit to [0, pi]
    vals.sig12 = Math.atan2(Math.max(0, vals.csig1 * vals.ssig2 -
                                     vals.ssig1 * vals.csig2),
                            vals.csig1 * vals.csig2 + vals.ssig1 * vals.ssig2);

    // omg12 = omg2 - omg1, limit to [0, pi]
    omg12 = Math.atan2(Math.max(0, comg1 * somg2 - somg1 * comg2),
                       comg1 * comg2 + somg1 * somg2);
    k2 = m.sq(calp0) * this._ep2;
    vals.eps = k2 / (2 * (1 + Math.sqrt(1 + k2)) + k2);
    this.C3f(vals.eps, C3a);
    B312 = (g.SinCosSeries(true, vals.ssig2, vals.csig2, C3a) -
            g.SinCosSeries(true, vals.ssig1, vals.csig1, C3a));
    h0 = -this.f * this.A3f(vals.eps);
    vals.domg12 = salp0 * h0 * (vals.sig12 + B312);
    vals.lam12 = omg12 + vals.domg12;

    if (diffp) {
      if (vals.calp2 === 0)
        vals.dlam12 = - 2 * this._f1 * dn1 / sbet1;
      else {
        nvals = this.Lengths(vals.eps, vals.sig12,
                             vals.ssig1, vals.csig1, dn1,
                             vals.ssig2, vals.csig2, dn2,
                             cbet1, cbet2, g.REDUCEDLENGTH, C1a, C2a);
        vals.dlam12 = nvals.m12b;
        vals.dlam12 *= this._f1 / (vals.calp2 * cbet2);
      }
    }
    return vals;
  };

  /**
   * @summary Solve the inverse geodesic problem.
   * @param {number} lat1 the latitude of the first point in degrees.
   * @param {number} lon1 the longitude of the first point in degrees.
   * @param {number} lat2 the latitude of the second point in degrees.
   * @param {number} lon2 the longitude of the second point in degrees.
   * @param {bitmask} [outmask = STANDARD] which results to include.
   * @returns {object} the requested results
   * @description The lat1, lon1, lat2, lon2, and a12 fields of the result are
   *   always set.  For details on the outmask parameter, see {@tutorial
   *   2-interface}, "The outmask and caps parameters".
   */
  g.Geodesic.prototype.Inverse = function(lat1, lon1, lat2, lon2, outmask) {
    var vals = {},
        lon12, lonsign, t, swapp, latsign,
        sbet1, cbet1, sbet2, cbet2, s12x, m12x,
        dn1, dn2, lam12, slam12, clam12,
        sig12, calp1, salp1, calp2, salp2, C1a, C2a, C3a, meridian, nvals,
        ssig1, csig1, ssig2, csig2, eps, omg12, dnm,
        numit, salp1a, calp1a, salp1b, calp1b,
        tripn, tripb, v, dv, dalp1, sdalp1, cdalp1, nsalp1,
        lengthmask, salp0, calp0, alp12, k2, A4, C4a, B41, B42,
        somg12, domg12, dbet1, dbet2, salp12, calp12;
    if (!outmask) outmask = g.STANDARD;
    if (outmask == g.LONG_UNROLL) outmask |= g.STANDARD;
    outmask &= g.OUT_MASK;
    // Compute longitude difference (AngDiff does this carefully).  Result is
    // in [-180, 180] but -180 is only for west-going geodesics.  180 is for
    // east-going and meridional geodesics.
    vals.lat1 = lat1 = m.LatFix(lat1); vals.lat2 = lat2 = m.LatFix(lat2);
    lon12 = m.AngDiff(lon1, lon2);
    if (outmask & g.LONG_UNROLL) {
      vals.lon1 = lon1; vals.lon2 = lon1 + lon12;
    } else {
      vals.lon1 = m.AngNormalize(lon1); vals.lon2 = m.AngNormalize(lon2);
    }
    // If very close to being on the same half-meridian, then make it so.
    lon12 = m.AngRound(lon12);
    // Make longitude difference positive.
    lonsign = lon12 >= 0 ? 1 : -1;
    lon12 *= lonsign;
    // If really close to the equator, treat as on equator.
    lat1 = m.AngRound(lat1);
    lat2 = m.AngRound(lat2);
    // Swap points so that point with higher (abs) latitude is point 1
    // If one latitude is a nan, then it becomes lat1.
    swapp = Math.abs(lat1) < Math.abs(lat2) ? -1 : 1;
    if (swapp < 0) {
      lonsign *= -1;
      t = lat1;
      lat1 = lat2;
      lat2 = t;
      // swap(lat1, lat2);
    }
    // Make lat1 <= 0
    latsign = lat1 < 0 ? 1 : -1;
    lat1 *= latsign;
    lat2 *= latsign;
    // Now we have
    //
    //     0 <= lon12 <= 180
    //     -90 <= lat1 <= 0
    //     lat1 <= lat2 <= -lat1
    //
    // longsign, swapp, latsign register the transformation to bring the
    // coordinates to this canonical form.  In all cases, 1 means no change was
    // made.  We make these transformations so that there are few cases to
    // check, e.g., on verifying quadrants in atan2.  In addition, this
    // enforces some symmetries in the results returned.

    t = m.sincosd(lat1); sbet1 = this._f1 * t.s; cbet1 = t.c;
    // norm(sbet1, cbet1);
    t = m.hypot(sbet1, cbet1); sbet1 /= t; cbet1 /= t;
    // Ensure cbet1 = +epsilon at poles
    cbet1 = Math.max(g.tiny_, cbet1);

    t = m.sincosd(lat2); sbet2 = this._f1 * t.s; cbet2 = t.c;
    // norm(sbet2, cbet2);
    t = m.hypot(sbet2, cbet2); sbet2 /= t; cbet2 /= t;
    // Ensure cbet2 = +epsilon at poles
    cbet2 = Math.max(g.tiny_, cbet2);

    // If cbet1 < -sbet1, then cbet2 - cbet1 is a sensitive measure of the
    // |bet1| - |bet2|.  Alternatively (cbet1 >= -sbet1), abs(sbet2) + sbet1 is
    // a better measure.  This logic is used in assigning calp2 in Lambda12.
    // Sometimes these quantities vanish and in that case we force bet2 = +/-
    // bet1 exactly.  An example where is is necessary is the inverse problem
    // 48.522876735459 0 -48.52287673545898293 179.599720456223079643
    // which failed with Visual Studio 10 (Release and Debug)

    if (cbet1 < -sbet1) {
      if (cbet2 === cbet1)
        sbet2 = sbet2 < 0 ? sbet1 : -sbet1;
    } else {
      if (Math.abs(sbet2) === -sbet1)
        cbet2 = cbet1;
    }

    dn1 = Math.sqrt(1 + this._ep2 * m.sq(sbet1));
    dn2 = Math.sqrt(1 + this._ep2 * m.sq(sbet2));

    lam12 = lon12 * m.degree;
    t = m.sincosd(lon12); slam12 = t.s; clam12 = t.c;

    // index zero elements of these arrays are unused
    C1a = new Array(g.nC1_ + 1);
    C2a = new Array(g.nC2_ + 1)
    C3a = new Array(g.nC3_);

    meridian = lat1 === -90 || slam12 === 0;
    if (meridian) {

      // Endpoints are on a single full meridian, so the geodesic might
      // lie on a meridian.

      calp1 = clam12; salp1 = slam12; // Head to the target longitude
      calp2 = 1; salp2 = 0;           // At the target we're heading north

      // tan(bet) = tan(sig) * cos(alp)
      ssig1 = sbet1; csig1 = calp1 * cbet1;
      ssig2 = sbet2; csig2 = calp2 * cbet2;

      // sig12 = sig2 - sig1
      sig12 = Math.atan2(Math.max(0, csig1 * ssig2 - ssig1 * csig2),
                         csig1 * csig2 + ssig1 * ssig2);
      nvals = this.Lengths(this._n, sig12,
                           ssig1, csig1, dn1, ssig2, csig2, dn2, cbet1, cbet2,
                           outmask | g.DISTANCE | g.REDUCEDLENGTH,
                           C1a, C2a);
      s12x = nvals.s12b;
      m12x = nvals.m12b;
      // Ignore m0
      if ((outmask & g.GEODESICSCALE) !== 0) {
        vals.M12 = nvals.M12;
        vals.M21 = nvals.M21;
      }
      // Add the check for sig12 since zero length geodesics might yield
      // m12 < 0.  Test case was
      //
      //    echo 20.001 0 20.001 0 | GeodSolve -i
      //
      // In fact, we will have sig12 > pi/2 for meridional geodesic
      // which is not a shortest path.
      if (sig12 < 1 || m12x >= 0) {
        // Need at least 2, to handle 90 0 90 180
        if (sig12 < 3 * g.tiny_)
          sig12 = m12x = s12x = 0;
        m12x *= this._b;
        s12x *= this._b;
        vals.a12 = sig12 / m.degree;
      } else
        // m12 < 0, i.e., prolate and too close to anti-podal
        meridian = false;
    }

    if (!meridian &&
        sbet1 === 0 &&           // and sbet2 == 0
        // Mimic the way Lambda12 works with calp1 = 0
        (this.f <= 0 || lam12 <= Math.PI - this.f * Math.PI)) {

      // Geodesic runs along equator
      calp1 = calp2 = 0; salp1 = salp2 = 1;
      s12x = this.a * lam12;
      sig12 = omg12 = lam12 / this._f1;
      m12x = this._b * Math.sin(sig12);
      if (outmask & g.GEODESICSCALE)
        vals.M12 = vals.M21 = Math.cos(sig12);
      vals.a12 = lon12 / this._f1;

    } else if (!meridian) {

      // Now point1 and point2 belong within a hemisphere bounded by a
      // meridian and geodesic is neither meridional or equatorial.

      // Figure a starting point for Newton's method
      nvals = this.InverseStart(sbet1, cbet1, dn1, sbet2, cbet2, dn2, lam12,
                                C1a, C2a);
      sig12 = nvals.sig12;
      salp1 = nvals.salp1;
      calp1 = nvals.calp1;

      if (sig12 >= 0) {
        salp2 = nvals.salp2;
        calp2 = nvals.calp2;
        // Short lines (InverseStart sets salp2, calp2, dnm)

        dnm = nvals.dnm;
        s12x = sig12 * this._b * dnm;
        m12x = m.sq(dnm) * this._b * Math.sin(sig12 / dnm);
        if (outmask & g.GEODESICSCALE)
          vals.M12 = vals.M21 = Math.cos(sig12 / dnm);
        vals.a12 = sig12 / m.degree;
        omg12 = lam12 / (this._f1 * dnm);
      } else {

        // Newton's method.  This is a straightforward solution of f(alp1) =
        // lambda12(alp1) - lam12 = 0 with one wrinkle.  f(alp) has exactly one
        // root in the interval (0, pi) and its derivative is positive at the
        // root.  Thus f(alp) is positive for alp > alp1 and negative for alp <
        // alp1.  During the course of the iteration, a range (alp1a, alp1b) is
        // maintained which brackets the root and with each evaluation of
        // f(alp) the range is shrunk if possible.  Newton's method is
        // restarted whenever the derivative of f is negative (because the new
        // value of alp1 is then further from the solution) or if the new
        // estimate of alp1 lies outside (0,pi); in this case, the new starting
        // guess is taken to be (alp1a + alp1b) / 2.
        numit = 0;
        // Bracketing range
        salp1a = g.tiny_; calp1a = 1; salp1b = g.tiny_; calp1b = -1;
        for (tripn = false, tripb = false; numit < maxit2_; ++numit) {
          // the WGS84 test set: mean = 1.47, sd = 1.25, max = 16
          // WGS84 and random input: mean = 2.85, sd = 0.60
          nvals = this.Lambda12(sbet1, cbet1, dn1, sbet2, cbet2, dn2,
                                salp1, calp1, numit < maxit1_,
                                C1a, C2a, C3a);
          v = nvals.lam12 - lam12;
          salp2 = nvals.salp2;
          calp2 = nvals.calp2;
          sig12 = nvals.sig12;
          ssig1 = nvals.ssig1;
          csig1 = nvals.csig1;
          ssig2 = nvals.ssig2;
          csig2 = nvals.csig2;
          eps = nvals.eps;
          omg12 = nvals.domg12;
          dv = nvals.dlam12;

          // 2 * tol0 is approximately 1 ulp for a number in [0, pi].
          // Reversed test to allow escape with NaNs
          if (tripb || !(Math.abs(v) >= (tripn ? 8 : 2) * tol0_))
            break;
          // Update bracketing values
          if (v > 0 && (numit < maxit1_ || calp1/salp1 > calp1b/salp1b)) {
              salp1b = salp1; calp1b = calp1;
          } else if (v < 0 &&
                     (numit < maxit1_ || calp1/salp1 < calp1a/salp1a)) {
            salp1a = salp1; calp1a = calp1;
          }
          if (numit < maxit1_ && dv > 0) {
            dalp1 = -v/dv;
            sdalp1 = Math.sin(dalp1); cdalp1 = Math.cos(dalp1);
            nsalp1 = salp1 * cdalp1 + calp1 * sdalp1;
            if (nsalp1 > 0 && Math.abs(dalp1) < Math.PI) {
              calp1 = calp1 * cdalp1 - salp1 * sdalp1;
              salp1 = nsalp1;
              // norm(salp1, calp1);
              t = m.hypot(salp1, calp1); salp1 /= t; calp1 /= t;
              // In some regimes we don't get quadratic convergence because
              // slope -> 0.  So use convergence conditions based on epsilon
              // instead of sqrt(epsilon).
              tripn = Math.abs(v) <= 16 * tol0_;
              continue;
            }
          }
          // Either dv was not postive or updated value was outside legal
          // range.  Use the midpoint of the bracket as the next estimate.
          // This mechanism is not needed for the WGS84 ellipsoid, but it does
          // catch problems with more eccentric ellipsoids.  Its efficacy is
          // such for the WGS84 test set with the starting guess set to alp1 =
          // 90deg:
          // the WGS84 test set: mean = 5.21, sd = 3.93, max = 24
          // WGS84 and random input: mean = 4.74, sd = 0.99
          salp1 = (salp1a + salp1b)/2;
          calp1 = (calp1a + calp1b)/2;
          // norm(salp1, calp1);
          t = m.hypot(salp1, calp1); salp1 /= t; calp1 /= t;
          tripn = false;
          tripb = (Math.abs(salp1a - salp1) + (calp1a - calp1) < tolb_ ||
                   Math.abs(salp1 - salp1b) + (calp1 - calp1b) < tolb_);
        }
        lengthmask = outmask |
            (outmask & (g.REDUCEDLENGTH | g.GEODESICSCALE) ?
             g.DISTANCE : g.NONE);
        nvals = this.Lengths(eps, sig12,
                             ssig1, csig1, dn1, ssig2, csig2, dn2, cbet1, cbet2,
                             lengthmask, C1a, C2a);
        s12x = nvals.s12b;
        m12x = nvals.m12b;
        // Ignore m0
        if ((outmask & g.GEODESICSCALE) !== 0) {
          vals.M12 = nvals.M12;
          vals.M21 = nvals.M21;
        }
        m12x *= this._b;
        s12x *= this._b;
        vals.a12 = sig12 / m.degree;
        omg12 = lam12 - omg12;
      }
    }

    if (outmask & g.DISTANCE)
      vals.s12 = 0 + s12x;      // Convert -0 to 0

    if (outmask & g.REDUCEDLENGTH)
      vals.m12 = 0 + m12x;      // Convert -0 to 0

    if (outmask & g.AREA) {
      // From Lambda12: sin(alp1) * cos(bet1) = sin(alp0)
      salp0 = salp1 * cbet1;
      calp0 = m.hypot(calp1, salp1 * sbet1); // calp0 > 0
      if (calp0 !== 0 && salp0 !== 0) {
        // From Lambda12: tan(bet) = tan(sig) * cos(alp)
        ssig1 = sbet1; csig1 = calp1 * cbet1;
        ssig2 = sbet2; csig2 = calp2 * cbet2;
        k2 = m.sq(calp0) * this._ep2;
        eps = k2 / (2 * (1 + Math.sqrt(1 + k2)) + k2);
        // Multiplier = a^2 * e^2 * cos(alpha0) * sin(alpha0).
        A4 = m.sq(this.a) * calp0 * salp0 * this._e2;
        // norm(ssig1, csig1);
        t = m.hypot(ssig1, csig1); ssig1 /= t; csig1 /= t;
        // norm(ssig2, csig2);
        t = m.hypot(ssig2, csig2); ssig2 /= t; csig2 /= t;
        C4a = new Array(g.nC4_);
        this.C4f(eps, C4a);
        B41 = g.SinCosSeries(false, ssig1, csig1, C4a);
        B42 = g.SinCosSeries(false, ssig2, csig2, C4a);
        vals.S12 = A4 * (B42 - B41);
      } else
        // Avoid problems with indeterminate sig1, sig2 on equator
        vals.S12 = 0;
      if (!meridian &&
          omg12 < 0.75 * Math.PI && // Long difference too big
          sbet2 - sbet1 < 1.75) {   // Lat difference too big
          // Use tan(Gamma/2) = tan(omg12/2)
          // * (tan(bet1/2)+tan(bet2/2))/(1+tan(bet1/2)*tan(bet2/2))
          // with tan(x/2) = sin(x)/(1+cos(x))
        somg12 = Math.sin(omg12); domg12 = 1 + Math.cos(omg12);
        dbet1 = 1 + cbet1; dbet2 = 1 + cbet2;
        alp12 = 2 * Math.atan2( somg12 * (sbet1*dbet2 + sbet2*dbet1),
                                domg12 * (sbet1*sbet2 + dbet1*dbet2) );
      } else {
        // alp12 = alp2 - alp1, used in atan2 so no need to normalize
        salp12 = salp2 * calp1 - calp2 * salp1;
        calp12 = calp2 * calp1 + salp2 * salp1;
        // The right thing appears to happen if alp1 = +/-180 and alp2 = 0, viz
        // salp12 = -0 and alp12 = -180.  However this depends on the sign
        // being attached to 0 correctly.  The following ensures the correct
        // behavior.
        if (salp12 === 0 && calp12 < 0) {
          salp12 = g.tiny_ * calp1;
          calp12 = -1;
        }
        alp12 = Math.atan2(salp12, calp12);
      }
      vals.S12 += this._c2 * alp12;
      vals.S12 *= swapp * lonsign * latsign;
      // Convert -0 to 0
      vals.S12 += 0;
    }

    // Convert calp, salp to azimuth accounting for lonsign, swapp, latsign.
    if (swapp < 0) {
      t = salp1;
      salp1 = salp2;
      salp2 = t;
      // swap(salp1, salp2);
      t = calp1;
      calp1 = calp2;
      calp2 = t;
      // swap(calp1, calp2);
      if (outmask & g.GEODESICSCALE) {
        t = vals.M12;
        vals.M12 = vals.M21;
        vals.M21 = t;
        // swap(vals.M12, vals.M21);
      }
    }

    salp1 *= swapp * lonsign; calp1 *= swapp * latsign;
    salp2 *= swapp * lonsign; calp2 *= swapp * latsign;

    if (outmask & g.AZIMUTH) {
      vals.azi1 = m.atan2d(salp1, calp1);
      vals.azi2 = m.atan2d(salp2, calp2);
    }

    // Returned value in [0, 180]
    return vals;
  };

  /**
   * @summary Solve the general direct geodesic problem.
   * @param {number} lat1 the latitude of the first point in degrees.
   * @param {number} lon1 the longitude of the first point in degrees.
   * @param {number} azi1 the azimuth at the first point in degrees.
   * @param {bool} arcmode is the next parameter an arc length?
   * @param {number} s12_a12 the (arcmode ? arc length : distance) from the
   *   first point to the second in (arcmode ? degrees : meters).
   * @param {bitmask} [outmask = STANDARD] which results to include.
   * @returns {object} the requested results.
   * @description The lat1, lon1, azi1, and a12 fields of the result are always
   *   set; s12 is included if arcmode is false.  For details on the outmask
   *   parameter, see {@tutorial 2-interface}, "The outmask and caps
   *   parameters".
   */
  g.Geodesic.prototype.GenDirect = function (lat1, lon1, azi1,
                                             arcmode, s12_a12, outmask) {
    var line;
    if (!outmask)
      outmask = g.STANDARD;
    else if (outmask == g.LONG_UNROLL)
      outmask |= g.STANDARD;
    line = new l.GeodesicLine(this, lat1, lon1, azi1,
                              // Automatically supply DISTANCE_IN if necessary
                              outmask | (arcmode ? g.NONE : g.DISTANCE_IN));
    return line.GenPosition(arcmode, s12_a12, outmask);
  };

  /**
   * @summary Solve the direct geodesic problem.
   * @param {number} lat1 the latitude of the first point in degrees.
   * @param {number} lon1 the longitude of the first point in degrees.
   * @param {number} azi1 the azimuth at the first point in degrees.
   * @param {number} s12 the distance from the first point to the second in
   *   meters.
   * @param {bitmask} [outmask = STANDARD] which results to include.
   * @returns {object} the requested results.
   * @description The lat1, lon1, azi1, s12, and a12 fields of the result are
   *   always set.  For details on the outmask parameter, see {@tutorial
   *   2-interface}, "The outmask and caps parameters".
   */
  g.Geodesic.prototype.Direct = function (lat1, lon1, azi1, s12, outmask) {
    return this.GenDirect(lat1, lon1, azi1, false, s12, outmask);
  };

  /**
   * @summary Solve the direct geodesic problem with arc length.
   * @param {number} lat1 the latitude of the first point in degrees.
   * @param {number} lon1 the longitude of the first point in degrees.
   * @param {number} azi1 the azimuth at the first point in degrees.
   * @param {number} a12 the arc length from the first point to the second in
   *   degrees.
   * @param {bitmask} [outmask = STANDARD] which results to include.
   * @returns {object} the requested results.
   * @description The lat1, lon1, azi1, and a12 fields of the result are
   *   always set.  For details on the outmask parameter, see {@tutorial
   *   2-interface}, "The outmask and caps parameters".
   */
  g.Geodesic.prototype.ArcDirect = function (lat1, lon1, azi1, a12, outmask) {
    return this.GenDirect(lat1, lon1, azi1, true, a12, outmask);
  };

  /**
   * @summary Create a {@link module:GeographicLib/GeodesicLine.GeodesicLine
   *   GeodesicLine} object.
   * @param {number} lat1 the latitude of the first point in degrees.
   * @param {number} lon1 the longitude of the first point in degrees.
   * @param {number} azi1 the azimuth at the first point in degrees.
   *   degrees.
   * @param {bitmask} [caps = STANDARD | DISTANCE_IN] which capabilities to
   *   include.
   * @returns {object} the
   *   {@link module:GeographicLib/GeodesicLine.GeodesicLine
   *   GeodesicLine} object
   * @description For details on the caps parameter, see {@tutorial
   *   2-interface}, "The outmask and caps parameters".
   */
  g.Geodesic.prototype.Line = function (lat1, lon1, azi1, caps) {
    return new l.GeodesicLine(this, lat1, lon1, azi1, caps);
  };

  /**
   * @summary Create a {@link module:GeographicLib/PolygonArea.PolygonArea
   *   PolygonArea} object.
   * @param {bool} [polyline = false] if true the new PolygonArea object
   *   describes a polyline instead of a polygon.
   * @returns {object} the
   *   {@link module:GeographicLib/PolygonArea.PolygonArea
   *   PolygonArea} object
   */
  g.Geodesic.prototype.Polygon = function (polyline) {
    return new p.PolygonArea(this, polyline);
  };

  /**
   * @summary a {@link module:GeographicLib/Geodesic.Geodesic Geodesic} object
   *   initialized for the WGS84 ellipsoid.
   * @constant {object}
   */
  g.WGS84 = new g.Geodesic(c.WGS84.a, c.WGS84.f);
})(GeographicLib.Geodesic, GeographicLib.GeodesicLine,
   GeographicLib.PolygonArea, GeographicLib.Math, GeographicLib.Constants);

/**************** GeodesicLine.js ****************/
/*
 * GeodesicLine.js
 * Transcription of GeodesicLine.[ch]pp into JavaScript.
 *
 * See the documentation for the C++ class.  The conversion is a literal
 * conversion from C++.
 *
 * The algorithms are derived in
 *
 *    Charles F. F. Karney,
 *    Algorithms for geodesics, J. Geodesy 87, 43-55 (2013);
 *    https://dx.doi.org/10.1007/s00190-012-0578-z
 *    Addenda: http://geographiclib.sf.net/geod-addenda.html
 *
 * Copyright (c) Charles Karney (2011-2015) <charles@karney.com> and licensed
 * under the MIT/X11 License.  For more information, see
 * http://geographiclib.sourceforge.net/
 */

// Load AFTER GeographicLib/Math.js, GeographicLib/Geodesic.js

(function(
  g,
  /**
   * @exports GeographicLib/GeodesicLine
   * @description Solve geodesic problems on a single geodesic line via the
   *   {@link module:GeographicLib/GeodesicLine.GeodesicLine GeodesicLine}
   *   class.
   */
  l, m) {
  "use strict";

  /**
   * @class
   * @property {number} a the equatorial radius (meters).
   * @property {number} f the flattening.
   * @property {number} lat1 the initial latitude (degrees).
   * @property {number} lon1 the initial longitude (degrees).
   * @property {number} azi1 the initial azimuth (degrees).
   * @property {bitmask} caps the capabilities of the object.
   * @summary Initialize a GeodesicLine object.  For details on the caps
   *   parameter, see {@tutorial 2-interface}, "The outmask and caps
   *   parameters".
   * @classdesc Performs geodesic calculations along a given geodesic line.
   *   This object is usually instantiated by
   *   {@link module:GeographicLib/Geodesic.Geodesic#Line Geodesic.Line}.
   * @param {object} geod a {@link module:GeographicLib/Geodesic.Geodesic
   *   Geodesic} object.
   * @param {number} lat1 the latitude of the first point in degrees.
   * @param {number} lon1 the longitude of the first point in degrees.
   * @param {number} azi1 the azimuth at the first point in degrees.
   * @param {bitmask} [caps = STANDARD | DISTANCE_IN] which capabilities to
   *   include; LATITUDE | AZIMUTH are always included.
   */
  l.GeodesicLine = function(geod, lat1, lon1, azi1, caps) {
    var t, cbet1, sbet1, eps, s, c;
    if (!caps) caps = g.STANDARD | g.DISTANCE_IN;

    this.a = geod.a;
    this.f = geod.f;
    this._b = geod._b;
    this._c2 = geod._c2;
    this._f1 = geod._f1;
    this._caps = (!caps ? g.ALL : (caps | g.LATITUDE | g.AZIMUTH)) |
      g.LONG_UNROLL;

    this.lat1 = m.LatFix(lat1);
    this.lon1 = lon1;
    this.azi1 = m.AngNormalize(azi1);
    t = m.sincosd(m.AngRound(this.azi1)); this._salp1 = t.s; this._calp1 = t.c;
    t = m.sincosd(m.AngRound(this.lat1)); sbet1 = this._f1 * t.s; cbet1 = t.c;
    // norm(sbet1, cbet1);
    t = m.hypot(sbet1, cbet1); sbet1 /= t; cbet1 /= t;
    // Ensure cbet1 = +epsilon at poles
    cbet1 = Math.max(g.tiny_, cbet1);
    this._dn1 = Math.sqrt(1 + geod._ep2 * m.sq(sbet1));

    // Evaluate alp0 from sin(alp1) * cos(bet1) = sin(alp0),
    this._salp0 = this._salp1 * cbet1; // alp0 in [0, pi/2 - |bet1|]
    // Alt: calp0 = hypot(sbet1, calp1 * cbet1).  The following
    // is slightly better (consider the case salp1 = 0).
    this._calp0 = m.hypot(this._calp1, this._salp1 * sbet1);
    // Evaluate sig with tan(bet1) = tan(sig1) * cos(alp1).
    // sig = 0 is nearest northward crossing of equator.
    // With bet1 = 0, alp1 = pi/2, we have sig1 = 0 (equatorial line).
    // With bet1 =  pi/2, alp1 = -pi, sig1 =  pi/2
    // With bet1 = -pi/2, alp1 =  0 , sig1 = -pi/2
    // Evaluate omg1 with tan(omg1) = sin(alp0) * tan(sig1).
    // With alp0 in (0, pi/2], quadrants for sig and omg coincide.
    // No atan2(0,0) ambiguity at poles since cbet1 = +epsilon.
    // With alp0 = 0, omg1 = 0 for alp1 = 0, omg1 = pi for alp1 = pi.
    this._ssig1 = sbet1; this._somg1 = this._salp0 * sbet1;
    this._csig1 = this._comg1 =
      sbet1 !== 0 || this._calp1 !== 0 ? cbet1 * this._calp1 : 1;
    // norm(this._ssig1, this._csig1); // sig1 in (-pi, pi]
    t = m.hypot(this._ssig1, this._csig1);
    this._ssig1 /= t; this._csig1 /= t;
    // norm(this._somg1, this._comg1); -- don't need to normalize!

    this._k2 = m.sq(this._calp0) * geod._ep2;
    eps = this._k2 / (2 * (1 + Math.sqrt(1 + this._k2)) + this._k2);

    if (this._caps & g.CAP_C1) {
      this._A1m1 = g.A1m1f(eps);
      this._C1a = new Array(g.nC1_ + 1);
      g.C1f(eps, this._C1a);
      this._B11 = g.SinCosSeries(true, this._ssig1, this._csig1, this._C1a);
      s = Math.sin(this._B11); c = Math.cos(this._B11);
      // tau1 = sig1 + B11
      this._stau1 = this._ssig1 * c + this._csig1 * s;
      this._ctau1 = this._csig1 * c - this._ssig1 * s;
      // Not necessary because C1pa reverts C1a
      //    _B11 = -SinCosSeries(true, _stau1, _ctau1, _C1pa);
    }

    if (this._caps & g.CAP_C1p) {
      this._C1pa = new Array(g.nC1p_ + 1);
      g.C1pf(eps, this._C1pa);
    }

    if (this._caps & g.CAP_C2) {
      this._A2m1 = g.A2m1f(eps);
      this._C2a = new Array(g.nC2_ + 1);
      g.C2f(eps, this._C2a);
      this._B21 = g.SinCosSeries(true, this._ssig1, this._csig1, this._C2a);
    }

    if (this._caps & g.CAP_C3) {
      this._C3a = new Array(g.nC3_);
      geod.C3f(eps, this._C3a);
      this._A3c = -this.f * this._salp0 * geod.A3f(eps);
      this._B31 = g.SinCosSeries(true, this._ssig1, this._csig1, this._C3a);
    }

    if (this._caps & g.CAP_C4) {
      this._C4a = new Array(g.nC4_); // all the elements of _C4a are used
      geod.C4f(eps, this._C4a);
      // Multiplier = a^2 * e^2 * cos(alpha0) * sin(alpha0)
      this._A4 = m.sq(this.a) * this._calp0 * this._salp0 * geod._e2;
      this._B41 = g.SinCosSeries(false, this._ssig1, this._csig1, this._C4a);
    }
  };

  /**
   * @summary Find the position on the line (general case).
   * @param {bool} arcmode is the next parameter an arc length?
   * @param {number} s12_a12 the (arcmode ? arc length : distance) from the
   *   first point to the second in (arcmode ? degrees : meters).
   * @param {bitmask} [outmask = STANDARD] which results to include; this is
   *   subject to the capabilities of the object.
   * @returns {object} the requested results.
   * @description The lat1, lon1, azi1, and a12 fields of the result are
   *   always set; s12 is included if arcmode is false.  For details on the
   *   outmask parameter, see {@tutorial 2-interface}, "The outmask and caps
   *   parameters".
   */
  l.GeodesicLine.prototype.GenPosition = function(arcmode, s12_a12,
                                                  outmask) {
    var vals = {},
        sig12, ssig12, csig12, B12, AB1, ssig2, csig2, tau12, s, c, serr,
        omg12, lam12, lon12, E, sbet2, cbet2, somg2, comg2, salp2, calp2, dn2,
        B22, AB2, J12, t, B42, salp12, calp12;
    if (!outmask)
      outmask = g.STANDARD;
    else if (outmask == g.LONG_UNROLL)
      outmask |= g.STANDARD;
    outmask &= this._caps & g.OUT_MASK;
    vals.lat1 = this.lat1; vals.azi1 = this.azi1;
    vals.lon1 = outmask & g.LONG_UNROLL ?
      this.lon1 : m.AngNormalize(this.lon1);
    if (arcmode)
      vals.a12 = s12_a12;
    else
      vals.s12 = s12_a12;
    if (!( arcmode || (this._caps & g.DISTANCE_IN & g.OUT_MASK) )) {
      // Uninitialized or impossible distance calculation requested
      vals.a12 = Number.NaN;
      return vals;
    }

    // Avoid warning about uninitialized B12.
    B12 = 0; AB1 = 0;
    if (arcmode) {
      // Interpret s12_a12 as spherical arc length
      sig12 = s12_a12 * m.degree;
      t = m.sincosd(s12_a12); ssig12 = t.s; csig12 = t.c;
    } else {
      // Interpret s12_a12 as distance
      tau12 = s12_a12 / (this._b * (1 + this._A1m1));
      s = Math.sin(tau12);
      c = Math.cos(tau12);
      // tau2 = tau1 + tau12
      B12 = - g.SinCosSeries(true,
                             this._stau1 * c + this._ctau1 * s,
                             this._ctau1 * c - this._stau1 * s,
                             this._C1pa);
      sig12 = tau12 - (B12 - this._B11);
      ssig12 = Math.sin(sig12); csig12 = Math.cos(sig12);
      if (Math.abs(this.f) > 0.01) {
        // Reverted distance series is inaccurate for |f| > 1/100, so correct
        // sig12 with 1 Newton iteration.  The following table shows the
        // approximate maximum error for a = WGS_a() and various f relative to
        // GeodesicExact.
        //     erri = the error in the inverse solution (nm)
        //     errd = the error in the direct solution (series only) (nm)
        //     errda = the error in the direct solution (series + 1 Newton) (nm)
        //
        //       f     erri  errd errda
        //     -1/5    12e6 1.2e9  69e6
        //     -1/10  123e3  12e6 765e3
        //     -1/20   1110 108e3  7155
        //     -1/50  18.63 200.9 27.12
        //     -1/100 18.63 23.78 23.37
        //     -1/150 18.63 21.05 20.26
        //      1/150 22.35 24.73 25.83
        //      1/100 22.35 25.03 25.31
        //      1/50  29.80 231.9 30.44
        //      1/20   5376 146e3  10e3
        //      1/10  829e3  22e6 1.5e6
        //      1/5   157e6 3.8e9 280e6
        ssig2 = this._ssig1 * csig12 + this._csig1 * ssig12;
        csig2 = this._csig1 * csig12 - this._ssig1 * ssig12;
        B12 = g.SinCosSeries(true, ssig2, csig2, this._C1a);
        serr = (1 + this._A1m1) * (sig12 + (B12 - this._B11)) -
          s12_a12 / this._b;
        sig12 = sig12 - serr / Math.sqrt(1 + this._k2 * m.sq(ssig2));
        ssig12 = Math.sin(sig12); csig12 = Math.cos(sig12);
        // Update B12 below
      }
    }

    // sig2 = sig1 + sig12
    ssig2 = this._ssig1 * csig12 + this._csig1 * ssig12;
    csig2 = this._csig1 * csig12 - this._ssig1 * ssig12;
    dn2 = Math.sqrt(1 + this._k2 * m.sq(ssig2));
    if (outmask & (g.DISTANCE | g.REDUCEDLENGTH | g.GEODESICSCALE)) {
      if (arcmode || Math.abs(this.f) > 0.01)
        B12 = g.SinCosSeries(true, ssig2, csig2, this._C1a);
      AB1 = (1 + this._A1m1) * (B12 - this._B11);
    }
    // sin(bet2) = cos(alp0) * sin(sig2)
    sbet2 = this._calp0 * ssig2;
    // Alt: cbet2 = hypot(csig2, salp0 * ssig2);
    cbet2 = m.hypot(this._salp0, this._calp0 * csig2);
    if (cbet2 === 0)
      // I.e., salp0 = 0, csig2 = 0.  Break the degeneracy in this case
      cbet2 = csig2 = g.tiny_;
    // tan(alp0) = cos(sig2)*tan(alp2)
    salp2 = this._salp0; calp2 = this._calp0 * csig2; // No need to normalize

    if (arcmode && (outmask & g.DISTANCE))
      vals.s12 = this._b * ((1 + this._A1m1) * sig12 + AB1);

    if (outmask & g.LONGITUDE) {
      // tan(omg2) = sin(alp0) * tan(sig2)
      somg2 = this._salp0 * ssig2; comg2 = csig2; // No need to normalize
      E = this._salp0 < 0 ? -1 : 1;
      // omg12 = omg2 - omg1
      omg12 = outmask & g.LONG_UNROLL ?
        E * (sig12 -
             (Math.atan2(ssig2, csig2) -
              Math.atan2(this._ssig1, this._csig1)) +
             (Math.atan2(E * somg2, comg2) -
              Math.atan2(E * this._somg1, this._comg1))) :
        Math.atan2(somg2 * this._comg1 - comg2 * this._somg1,
                     comg2 * this._comg1 + somg2 * this._somg1);
      lam12 = omg12 + this._A3c *
        ( sig12 + (g.SinCosSeries(true, ssig2, csig2, this._C3a) -
                   this._B31));
      lon12 = lam12 / m.degree;
      vals.lon2 = outmask & g.LONG_UNROLL ? this.lon1 + lon12 :
        m.AngNormalize(m.AngNormalize(this.lon1) + m.AngNormalize(lon12));
    }

    if (outmask & g.LATITUDE)
      vals.lat2 = m.atan2d(sbet2, this._f1 * cbet2);

    if (outmask & g.AZIMUTH)
      vals.azi2 = m.atan2d(salp2, calp2);

    if (outmask & (g.REDUCEDLENGTH | g.GEODESICSCALE)) {
      B22 = g.SinCosSeries(true, ssig2, csig2, this._C2a);
      AB2 = (1 + this._A2m1) * (B22 - this._B21);
      J12 = (this._A1m1 - this._A2m1) * sig12 + (AB1 - AB2);
      if (outmask & g.REDUCEDLENGTH)
        // Add parens around (_csig1 * ssig2) and (_ssig1 * csig2) to ensure
        // accurate cancellation in the case of coincident points.
        vals.m12 = this._b * ((      dn2 * (this._csig1 * ssig2) -
                               this._dn1 * (this._ssig1 * csig2)) -
                              this._csig1 * csig2 * J12);
      if (outmask & g.GEODESICSCALE) {
        t = this._k2 * (ssig2 - this._ssig1) * (ssig2 + this._ssig1) /
          (this._dn1 + dn2);
        vals.M12 = csig12 + (t * ssig2 - csig2 * J12) * this._ssig1 / this._dn1;
        vals.M21 = csig12 - (t * this._ssig1 - this._csig1 * J12) * ssig2 / dn2;
      }
    }

    if (outmask & g.AREA) {
      B42 = g.SinCosSeries(false, ssig2, csig2, this._C4a);
      if (this._calp0 === 0 || this._salp0 === 0) {
        // alp12 = alp2 - alp1, used in atan2 so no need to normalize
        salp12 = salp2 * this._calp1 - calp2 * this._salp1;
        calp12 = calp2 * this._calp1 + salp2 * this._salp1;
        // The right thing appears to happen if alp1 = +/-180 and alp2 = 0, viz
        // salp12 = -0 and alp12 = -180.  However this depends on the sign being
        // attached to 0 correctly.  The following ensures the correct behavior.
        if (salp12 === 0 && calp12 < 0) {
          salp12 = g.tiny_ * this._calp1;
          calp12 = -1;
        }
      } else {
        // tan(alp) = tan(alp0) * sec(sig)
        // tan(alp2-alp1) = (tan(alp2) -tan(alp1)) / (tan(alp2)*tan(alp1)+1)
        // = calp0 * salp0 * (csig1-csig2) / (salp0^2 + calp0^2 * csig1*csig2)
        // If csig12 > 0, write
        //   csig1 - csig2 = ssig12 * (csig1 * ssig12 / (1 + csig12) + ssig1)
        // else
        //   csig1 - csig2 = csig1 * (1 - csig12) + ssig12 * ssig1
        // No need to normalize
        salp12 = this._calp0 * this._salp0 *
          (csig12 <= 0 ? this._csig1 * (1 - csig12) + ssig12 * this._ssig1 :
           ssig12 * (this._csig1 * ssig12 / (1 + csig12) + this._ssig1));
        calp12 = m.sq(this._salp0) + m.sq(this._calp0) * this._csig1 * csig2;
      }
      vals.S12 = this._c2 * Math.atan2(salp12, calp12) +
        this._A4 * (B42 - this._B41);
    }

    if (!arcmode)
      vals.a12 = sig12 / m.degree;
    return vals;
  };

  /**
   * @summary Find the position on the line given s12.
   * @param {number} s12 the distance from the first point to the second in
   *   meters.
   * @param {bitmask} [outmask = STANDARD] which results to include; this is
   *   subject to the capabilities of the object.
   * @returns {object} the requested results.
   * @description The lat1, lon1, azi1, s12, and a12 fields of the result are
   *   always set; s12 is included if arcmode is false.  For details on the
   *   outmask parameter, see {@tutorial 2-interface}, "The outmask and caps
   *   parameters".
   */
  l.GeodesicLine.prototype.Position = function(s12, outmask) {
    return this.GenPosition(false, s12, outmask);
  };

  /**
   * @summary Find the position on the line given a12.
   * @param {number} a12 the arc length from the first point to the second in
   *   degrees.
   * @param {bitmask} [outmask = STANDARD] which results to include; this is
   *   subject to the capabilities of the object.
   * @returns {object} the requested results.
   * @description The lat1, lon1, azi1, and a12 fields of the result are
   *   always set.  For details on the outmask parameter, see {@tutorial
   *   2-interface}, "The outmask and caps parameters".
   */
  l.GeodesicLine.prototype.ArcPosition = function(a12, outmask) {
    return this.GenPosition(true, a12, outmask);
  };

})(GeographicLib.Geodesic, GeographicLib.GeodesicLine, GeographicLib.Math);

/**************** PolygonArea.js ****************/
/*
 * PolygonArea.js
 * Transcription of PolygonArea.[ch]pp into JavaScript.
 *
 * See the documentation for the C++ class.  The conversion is a literal
 * conversion from C++.
 *
 * The algorithms are derived in
 *
 *    Charles F. F. Karney,
 *    Algorithms for geodesics, J. Geodesy 87, 43-55 (2013);
 *    https://dx.doi.org/10.1007/s00190-012-0578-z
 *    Addenda: http://geographiclib.sf.net/geod-addenda.html
 *
 * Copyright (c) Charles Karney (2011-2014) <charles@karney.com> and licensed
 * under the MIT/X11 License.  For more information, see
 * http://geographiclib.sourceforge.net/
 */

// Load AFTER GeographicLib/Math.js and GeographicLib/Geodesic.js

(function(
  /**
   * @exports GeographicLib/PolygonArea
   * @description Compute the area of geodesic polygons via the
   *   {@link module:GeographicLib/PolygonArea.PolygonArea PolygonArea}
   *   class.
   */
  p, g, m, a) {
  "use strict";

  var transit, transitdirect;
  transit = function(lon1, lon2) {
    // Return 1 or -1 if crossing prime meridian in east or west direction.
    // Otherwise return zero.
    var lon12, cross;
    // Compute lon12 the same way as Geodesic::Inverse.
    lon1 = m.AngNormalize(lon1);
    lon2 = m.AngNormalize(lon2);
    lon12 = m.AngDiff(lon1, lon2);
    cross = lon1 < 0 && lon2 >= 0 && lon12 > 0 ? 1 :
      (lon2 < 0 && lon1 >= 0 && lon12 < 0 ? -1 : 0);
    return cross;
  };

  // an alternate version of transit to deal with longitudes in the direct
  // problem.
  transitdirect = function(lon1, lon2) {
    // We want to compute exactly
    //   int(floor(lon2 / 360)) - int(floor(lon1 / 360))
    // Since we only need the parity of the result we can use std::remquo but
    // this is buggy with g++ 4.8.3 and requires C++11.  So instead we do
    lon1 = lon1 % 720.0; lon2 = lon2 % 720.0;
    return ( ((lon2 >= 0 && lon2 < 360) || lon2 < -360 ? 0 : 1) -
             ((lon1 >= 0 && lon1 < 360) || lon1 < -360 ? 0 : 1) );
  };

  /**
   * @class
   * @property {number} a the equatorial radius (meters).
   * @property {number} f the flattening.
   * @property {bool} polyline whether the PolygonArea object describes a
   *   polyline or a polygon.
   * @property {number} num the number of vertices so far.
   * @property {number} lat the current latitude (degrees).
   * @property {number} lon the current longitude (degrees).
   * @summary Initialize a PolygonArea object.
   * @classdesc Computes the area and perimeter of a geodesic polygon.
   *   This object is usually instantiated by
   *   {@link module:GeographicLib/Geodesic.Geodesic#Polygon Geodesic.Polygon}.
   * @param {object} geod a {@link module:GeographicLib/Geodesic.Geodesic
   *   Geodesic} object.
   * @param {bool} [polyline = false] if true the new PolygonArea object
   *   describes a polyline instead of a polygon.
   */
  p.PolygonArea = function(geod, polyline) {
    this._geod = geod;
    this.a = this._geod.a;
    this.f = this._geod.f;
    this._area0 = 4 * Math.PI * geod._c2;
    this.polyline = !polyline ? false : polyline;
    this._mask = g.LATITUDE | g.LONGITUDE | g.DISTANCE |
          (this.polyline ? g.NONE : g.AREA | g.LONG_UNROLL);
    if (!this.polyline)
      this._areasum = new a.Accumulator(0);
    this._perimetersum = new a.Accumulator(0);
    this.Clear();
  };

  /**
   * @summary Clear the PolygonArea object, setting the number of vertices to
   *   0.
   */
  p.PolygonArea.prototype.Clear = function() {
    this.num = 0;
    this._crossings = 0;
    if (!this.polyline)
      this._areasum.Set(0);
    this._perimetersum.Set(0);
    this._lat0 = this._lon0 = this.lat = this.lon = Number.NaN;
  };

  /**
   * @summary Add the next vertex to the polygon.
   * @param {number} lat the latitude of the point (degrees).
   * @param {number} lon the longitude of the point (degrees).
   * @description This adds an edge from the current vertex to the new vertex.
   */
  p.PolygonArea.prototype.AddPoint = function(lat, lon) {
    var t;
    if (this.num === 0) {
      this._lat0 = this.lat = lat;
      this._lon0 = this.lon = lon;
    } else {
      t = this._geod.Inverse(this.lat, this.lon, lat, lon, this._mask);
      this._perimetersum.Add(t.s12);
      if (!this.polyline) {
        this._areasum.Add(t.S12);
        this._crossings += transit(this.lon, lon);
      }
      this.lat = lat;
      this.lon = lon;
    }
    ++this.num;
  };

  /**
   * @summary Add the next edge to the polygon.
   * @param {number} azi the azimuth at the current the point (degrees).
   * @param {number} s the length of the edge (meters).
   * @description This specifies the new vertex in terms of the edge from the
   *   current vertex.
   */
  p.PolygonArea.prototype.AddEdge = function(azi, s) {
    var t;
    if (this.num) {
      t = this._geod.Direct(this.lat, this.lon, azi, s, this._mask);
      this._perimetersum.Add(s);
      if (!this.polyline) {
        this._areasum.Add(t.S12);
        this._crossings += transitdirect(this.lon, t.lon2);
      }
      this.lat = t.lat2;
      this.lon = t.lon2;
    }
    ++this.num;
  };

  /**
   * @summary Compute the perimeter and area of the polygon.
   * @param {bool} reverse if true then clockwise (instead of
   *   counter-clockwise) traversal counts as a positive area.
   * @param {bool} sign if true then return a signed result for the area if the
   *   polygon is traversed in the "wrong" direction instead of returning the
   * @returns {object} r where r.number is the number of vertices, r.perimeter
   *   is the perimeter (meters), and r.area (only returned if polyline is
   *   false) is the area (meters<sup>2</sup>).
   * @description More points can be added to the polygon after this call.
   */
  p.PolygonArea.prototype.Compute = function(reverse, sign) {
    var vals = {number: this.num}, t, tempsum, crossings;
    if (this.num < 2) {
      vals.perimeter = 0;
      if (!this.polyline)
        vals.area = 0;
      return vals;
    }
    if (this.polyline) {
      vals.perimeter = this._perimetersum.Sum();
      return vals;
    }
    t = this._geod.Inverse(this.lat, this.lon, this._lat0, this._lon0,
                           this._mask);
    vals.perimeter = this._perimetersum.Sum(t.s12);
    tempsum = new a.Accumulator(this._areasum);
    tempsum.Add(t.S12);
    crossings = this._crossings + transit(this.lon, this._lon0);
    if (crossings & 1)
      tempsum.Add( (tempsum.Sum() < 0 ? 1 : -1) * this._area0/2 );
    // area is with the clockwise sense.  If !reverse convert to
    // counter-clockwise convention.
    if (!reverse)
      tempsum.Negate();
    // If sign put area in (-area0/2, area0/2], else put area in [0, area0)
    if (sign) {
      if (tempsum.Sum() > this._area0/2)
        tempsum.Add( -this._area0 );
      else if (tempsum.Sum() <= -this._area0/2)
        tempsum.Add( +this._area0 );
    } else {
      if (tempsum.Sum() >= this._area0)
        tempsum.Add( -this._area0 );
      else if (tempsum < 0)
        tempsum.Add( -this._area0 );
    }
    vals.area = tempsum.Sum();
    return vals;
  };

  /**
   * @summary Compute the perimeter and area of the polygon with a tentative
   *   new vertex.
   * @param {number} lat the latitude of the point (degrees).
   * @param {number} lon the longitude of the point (degrees).
   * @param {bool} reverse if true then clockwise (instead of
   *   counter-clockwise) traversal counts as a positive area.
   * @param {bool} sign if true then return a signed result for the area if the
   *   polygon is traversed in the "wrong" direction instead of returning the
   * @returns {object} r where r.number is the number of vertices, r.perimeter
   *   is the perimeter (meters), and r.area (only returned if polyline is
   *   false) is the area (meters<sup>2</sup>).
   * @description A new vertex is *not* added to the polygon.
   */
  p.PolygonArea.prototype.TestPoint = function(lat, lon, reverse, sign) {
    var vals = {number: this.num + 1}, t, tempsum, crossings, i;
    if (this.num === 0) {
      vals.perimeter = 0;
      if (!this.polyline)
        vals.area = 0;
      return vals;
    }
    vals.perimeter = this._perimetersum.Sum();
    tempsum = this.polyline ? 0 : this._areasum.Sum();
    crossings = this._crossings;
    for (i = 0; i < (this.polyline ? 1 : 2); ++i) {
      t = this._geod.Inverse(
       i === 0 ? this.lat : lat, i === 0 ? this.lon : lon,
       i !== 0 ? this._lat0 : lat, i !== 0 ? this._lon0 : lon,
       this._mask);
      vals.perimeter += t.s12;
      if (!this.polyline) {
        tempsum += t.S12;
        crossings += transit(i === 0 ? this.lon : lon,
                               i !== 0 ? this._lon0 : lon);
      }
    }

    if (this.polyline)
      return vals;

    if (crossings & 1)
      tempsum += (tempsum < 0 ? 1 : -1) * this._area0/2;
    // area is with the clockwise sense.  If !reverse convert to
    // counter-clockwise convention.
    if (!reverse)
      tempsum *= -1;
    // If sign put area in (-area0/2, area0/2], else put area in [0, area0)
    if (sign) {
      if (tempsum > this._area0/2)
        tempsum -= this._area0;
      else if (tempsum <= -this._area0/2)
        tempsum += this._area0;
    } else {
      if (tempsum >= this._area0)
        tempsum -= this._area0;
      else if (tempsum < 0)
        tempsum += this._area0;
    }
    vals.area = tempsum;
    return vals;
  };

  /**
   * @summary Compute the perimeter and area of the polygon with a tentative
   *   new edge.
   * @param {number} azi the azimuth of the edge (degrees).
   * @param {number} s the length of the edge (meters).
   * @param {bool} reverse if true then clockwise (instead of
   *   counter-clockwise) traversal counts as a positive area.
   * @param {bool} sign if true then return a signed result for the area if the
   *   polygon is traversed in the "wrong" direction instead of returning the
   * @returns {object} r where r.number is the number of vertices, r.perimeter
   *   is the perimeter (meters), and r.area (only returned if polyline is
   *   false) is the area (meters<sup>2</sup>).
   * @description A new vertex is *not* added to the polygon.
   */
  p.PolygonArea.prototype.TestEdge = function(azi, s, reverse, sign) {
    var vals = {number: this.num ? this.num + 1 : 0}, t, tempsump, crossings;
    if (this.num === 0)
      return vals;
    vals.perimeter = this._perimetersum.Sum() + s;
    if (this.polyline)
      return vals;

    tempsum = this._areasum.Sum();
    crossings = this._crossings;
    t = this._geod.Direct(this.lat, this.lon, azi, s, this._mask);
    tempsum += t.S12;
    crossings += transitdirect(this.lon, t.lon2);
    t = this._geod(t.lat2, t.lon2, this._lat0, this._lon0, this._mask);
    perimeter += t.s12;
    tempsum += t.S12;
    crossings += transit(t.lon2, this._lon0);

    if (crossings & 1)
      tempsum += (tempsum < 0 ? 1 : -1) * this._area0/2;
    // area is with the clockwise sense.  If !reverse convert to
    // counter-clockwise convention.
    if (!reverse)
      tempsum *= -1;
    // If sign put area in (-area0/2, area0/2], else put area in [0, area0)
    if (sign) {
      if (tempsum > this._area0/2)
        tempsum -= this._area0;
      else if (tempsum <= -this._area0/2)
        tempsum += this._area0;
    } else {
      if (tempsum >= this._area0)
        tempsum -= this._area0;
      else if (tempsum < 0)
        tempsum += this._area0;
    }
    vals.area = tempsum;
    return vals;
  };

})(GeographicLib.PolygonArea, GeographicLib.Geodesic,
   GeographicLib.Math, GeographicLib.Accumulator);

/**************** DMS.js ****************/
/*
 * DMS.js
 * Transcription of DMS.[ch]pp into JavaScript.
 *
 * See the documentation for the C++ class.  The conversion is a literal
 * conversion from C++.
 *
 * Copyright (c) Charles Karney (2011-2015) <charles@karney.com> and licensed
 * under the MIT/X11 License.  For more information, see
 * http://geographiclib.sourceforge.net/
 */

GeographicLib.DMS = {};

(function(
  /**
   * @exports GeographicLib/DMS
   * @description Decode/Encode angles expressed as degrees, minutes, and
   *   seconds.  This module defines several constants:
   *   - hemisphere indicator (returned by
   *       {@link module:GeographicLib/DMS.Decode Decode}) and a formatting
   *       indicator (used by
   *       {@link module:GeographicLib/DMS.Encode Encode})
   *     - NONE = 0, no designator and format as plain angle;
   *     - LATITUDE = 1, a N/S designator and format as latitude;
   *     - LONGITUDE = 2, an E/W designator and format as longitude;
   *     - AZIMUTH = 3, format as azimuth;
   *   - the specification of the trailing component in
   *       {@link module:GeographicLib/DMS.Encode Encode}
   *     - DEGREE;
   *     - MINUTE;
   *     - SECOND.
   */
  d) {
  "use strict";

  var lookup, zerofill, InternalDecode, NumMatch,
      hemispheres_ = "SNWE",
      signs_ = "-+",
      digits_ = "0123456789",
      dmsindicators_ = "D'\":",
      // dmsindicatorsu_ = "\u00b0\u2032\u2033"; // Unicode variants
      dmsindicatorsu_ = "\u00b0'\"", // Use degree symbol
      components_ = ["degrees", "minutes", "seconds"];
  lookup = function(s, c) {
    return s.indexOf(c.toUpperCase());
  };
  zerofill = function(s, n) {
    return String("0000").substr(0, Math.max(0, Math.min(4, n-s.length))) +
      s;
  };
  d.NONE = 0;
  d.LATITUDE = 1;
  d.LONGITUDE = 2;
  d.AZIMUTH = 3;
  d.DEGREE = 0;
  d.MINUTE = 1;
  d.SECOND = 2;

  /**
   * @summary Decode a DMS string.
   * @description The interpretation of the string is given in the
   *   documentation of the corresponding function, Decode(string&, flag&)
   *   in the {@link
   *   http://geographiclib.sourceforge.net/html/classGeographicLib_1_1DMS.html
   *   C++ DMS class}
   * @param {string} dms the string.
   * @returns {object} r where r.val is the decoded value (degrees) and r.ind
   *   is a hemisphere designator, one of NONE, LATITUDE, LONGITUDE.
   * @throws an error if the string is illegal.
   */
  d.Decode = function(dms) {
    var dmsa = dms, end,
        v = 0, i = 0, mi, pi, vals,
        ind1 = d.NONE, ind2, p, pa, pb;
    dmsa = dmsa.replace(/\u00b0/g, 'd')
          .replace(/\u00ba/g, 'd')
          .replace(/\u2070/g, 'd')
          .replace(/\u02da/g, 'd')
          .replace(/\u2032/g, '\'')
          .replace(/\u00b4/g, '\'')
          .replace(/\u2019/g, '\'')
          .replace(/\u2033/g, '"')
          .replace(/\u201d/g, '"')
          .replace(/\u2212/g, '-')
          .replace(/''/g, '"')
          .trim();
    end = dmsa.length;
    // p is pointer to the next piece that needs decoding
    for (p = 0; p < end; p = pb, ++i) {
      pa = p;
      // Skip over initial hemisphere letter (for i == 0)
      if (i === 0 && lookup(hemispheres_, dmsa.charAt(pa)) >= 0)
        ++pa;
      // Skip over initial sign (checking for it if i == 0)
      if (i > 0 || (pa < end && lookup(signs_, dmsa.charAt(pa)) >= 0))
        ++pa;
      // Find next sign
      mi = dmsa.substr(pa, end - pa).indexOf('-');
      pi = dmsa.substr(pa, end - pa).indexOf('+');
      if (mi < 0) mi = end; else mi += pa;
      if (pi < 0) pi = end; else pi += pa;
      pb = Math.min(mi, pi);
      vals = InternalDecode(dmsa.substr(p, pb - p));
      v += vals.val; ind2 = vals.ind;
      if (ind1 == d.NONE)
        ind1 = ind2;
      else if (!(ind2 == d.NONE || ind1 == ind2))
        throw new Error("Incompatible hemisphere specifies in " +
                        dmsa.substr(0, pb));
    }
    if (i === 0)
      throw new Error("Empty or incomplete DMS string " + dmsa);
    return {val: v, ind: ind1};
  };

  InternalDecode = function(dmsa) {
    var vals = {}, errormsg = "",
        sign, beg, end, ind1, k,
        ipieces, fpieces, npiece,
        icurrent, fcurrent, ncurrent, p,
        pointseen,
        digcount, intcount,
        x;
    do {                       // Executed once (provides the ability to break)
      sign = 1;
      beg = 0; end = dmsa.length;
      ind1 = d.NONE;
      k = -1;
      if (end > beg && (k = lookup(hemispheres_, dmsa.charAt(beg))) >= 0) {
        ind1 = (k & 2) ? d.LONGITUDE : d.LATITUDE;
        sign = (k & 1) ? 1 : -1;
        ++beg;
      }
      if (end > beg &&
          (k = lookup(hemispheres_, dmsa.charAt(end-1))) >= 0) {
        if (k >= 0) {
          if (ind1 !== d.NONE) {
            if (dmsa.charAt(beg - 1).toUpperCase() ===
                dmsa.charAt(end - 1).toUpperCase())
              errormsg = "Repeated hemisphere indicators " +
              dmsa.charAt(beg - 1) + " in " +
              dmsa.substr(beg - 1, end - beg + 1);
            else
              errormsg = "Contradictory hemisphere indicators " +
              dmsa.charAt(beg - 1) + " and " + dmsa.charAt(end - 1) + " in " +
              dmsa.substr(beg - 1, end - beg + 1);
            break;
          }
          ind1 = (k & 2) ? d.LONGITUDE : d.LATITUDE;
          sign = (k & 1) ? 1 : -1;
          --end;
        }
      }
      if (end > beg && (k = lookup(signs_, dmsa.charAt(beg))) >= 0) {
        if (k >= 0) {
          sign *= k ? 1 : -1;
          ++beg;
        }
      }
      if (end === beg) {
        errormsg = "Empty or incomplete DMS string " + dmsa;
        break;
      }
      ipieces = [0, 0, 0];
      fpieces = [0, 0, 0];
      npiece = 0;
      icurrent = 0;
      fcurrent = 0;
      ncurrent = 0;
      p = beg;
      pointseen = false;
      digcount = 0;
      intcount = 0;
      while (p < end) {
        x = dmsa.charAt(p++);
        if ((k = lookup(digits_, x)) >= 0) {
          ++ncurrent;
          if (digcount > 0) {
            ++digcount;         // Count of decimal digits
          } else {
            icurrent = 10 * icurrent + k;
            ++intcount;
          }
        } else if (x === '.') {
          if (pointseen) {
            errormsg = "Multiple decimal points in " +
              dmsa.substr(beg, end - beg);
            break;
          }
          pointseen = true;
          digcount = 1;
        } else if ((k = lookup(dmsindicators_, x)) >= 0) {
          if (k >= 3) {
            if (p === end) {
              errormsg = "Illegal for colon to appear at the end of " +
                dmsa.substr(beg, end - beg);
              break;
            }
            k = npiece;
          }
          if (k === npiece - 1) {
            errormsg = "Repeated " + components_[k] +
              " component in " + dmsa.substr(beg, end - beg);
            break;
          } else if (k < npiece) {
            errormsg = components_[k] + " component follows " +
              components_[npiece - 1] + " component in " +
              dmsa.substr(beg, end - beg);
            break;
          }
          if (ncurrent === 0) {
            errormsg = "Missing numbers in " + components_[k] +
              " component of " + dmsa.substr(beg, end - beg);
            break;
          }
          if (digcount > 0) {
            fcurrent = parseFloat(dmsa.substr(p - intcount - digcount - 1,
                                              intcount + digcount));
            icurrent = 0;
          }
          ipieces[k] = icurrent;
          fpieces[k] = icurrent + fcurrent;
          if (p < end) {
            npiece = k + 1;
            icurrent = fcurrent = 0;
            ncurrent = digcount = intcount = 0;
          }
        } else if (lookup(signs_, x) >= 0) {
          errormsg = "Internal sign in DMS string " +
            dmsa.substr(beg, end - beg);
          break;
        } else {
          errormsg = "Illegal character " + x + " in DMS string " +
            dmsa.substr(beg, end - beg);
          break;
        }
      }
      if (errormsg.length)
        break;
      if (lookup(dmsindicators_, dmsa.charAt(p - 1)) < 0) {
        if (npiece >= 3) {
          errormsg = "Extra text following seconds in DMS string " +
            dmsa.substr(beg, end - beg);
          break;
        }
        if (ncurrent === 0) {
          errormsg = "Missing numbers in trailing component of " +
            dmsa.substr(beg, end - beg);
          break;
        }
        if (digcount > 0) {
          fcurrent = parseFloat(dmsa.substr(p - intcount - digcount,
                                            intcount + digcount));
          icurrent = 0;
        }
        ipieces[npiece] = icurrent;
        fpieces[npiece] = icurrent + fcurrent;
      }
      if (pointseen && digcount === 0) {
        errormsg = "Decimal point in non-terminal component of " +
          dmsa.substr(beg, end - beg);
        break;
      }
      // Note that we accept 59.999999... even though it rounds to 60.
      if (ipieces[1] >= 60 || fpieces[1] > 60) {
        errormsg = "Minutes " + fpieces[1] + " not in range [0,60)";
        break;
      }
      if (ipieces[2] >= 60 || fpieces[2] > 60) {
        errormsg = "Seconds " + fpieces[2] + " not in range [0,60)";
        break;
      }
      vals.ind = ind1;
      // Assume check on range of result is made by calling routine (which
      // might be able to offer a better diagnostic).
      vals.val = sign *
        ( fpieces[2] ? (60*(60*fpieces[0] + fpieces[1]) + fpieces[2]) / 3600 :
          ( fpieces[1] ? (60*fpieces[0] + fpieces[1]) / 60 : fpieces[0] ) );
      return vals;
    } while (false);
    vals.val = NumMatch(dmsa);
    if (vals.val === 0)
      throw new Error(errormsg);
    else
      vals.ind = d.NONE;
    return vals;
  };

  NumMatch = function(s) {
    var t, sign, p0, p1;
    if (s.length < 3)
      return 0;
    t = s.toUpperCase().replace(/0+$/,"");
    sign = t.charAt(0) === '-' ? -1 : 1;
    p0 = t.charAt(0) === '-' || t.charAt(0) === '+' ? 1 : 0;
    p1 = t.length - 1;
    if (p1 + 1 < p0 + 3)
      return 0;
    // Strip off sign and trailing 0s
    t = t.substr(p0, p1 + 1 - p0); // Length at least 3
    if (t === "NAN" || t === "1.#QNAN" || t === "1.#SNAN" || t === "1.#IND" ||
        t === "1.#R")
      return Number.NaN;
    else if (t === "INF" || t === "1.#INF")
      return sign * Number.POSITIVE_INFINITY;
    return 0;
  };

  /**
   * @summary Decode two DMS strings interpreting them as a latitude/longitude
   *   pair.
   * @param {string} stra the first string.
   * @param {string} strb the first string.
   * @param {bool} [longfirst = false] if true assume then longitude is given
   *   first (in the absense of any hemisphere indicators).
   * @returns {object} r where r.lat is the decoded latitude and r.lon is the
   *   decoded longitude (both in degrees).
   * @throws an error if the strings are illegal.
   */
  d.DecodeLatLon = function(stra, strb, longfirst) {
    var vals = {},
        valsa = d.Decode(stra),
        valsb = d.Decode(strb),
        a = valsa.val, ia = valsa.ind,
        b = valsb.val, ib = valsb.ind,
        lat, lon;
    if (!longfirst) longfirst = false;
    if (ia === d.NONE && ib === d.NONE) {
      // Default to lat, long unless longfirst
      ia = longfirst ? d.LONGITUDE : d.LATITUDE;
      ib = longfirst ? d.LATITUDE : d.LONGITUDE;
    } else if (ia === d.NONE)
      ia = d.LATITUDE + d.LONGITUDE - ib;
    else if (ib === d.NONE)
      ib = d.LATITUDE + d.LONGITUDE - ia;
    if (ia === ib)
      throw new Error("Both " + stra + " and " + strb + " interpreted as " +
                      (ia === d.LATITUDE ? "latitudes" : "longitudes"));
    lat = ia === d.LATITUDE ? a : b;
    lon = ia === d.LATITUDE ? b : a;
    if (Math.abs(lat) > 90)
      throw new Error("Latitude " + lat + " not in [-90,90]");
    vals.lat = lat;
    vals.lon = lon;
    return vals;
  };

  /**
   * @summary Decode a DMS string interpreting it as an arc length.
   * @param {string} angstr the string (this must not include a hemisphere
   *   indicator).
   * @returns {number} the arc length (degrees).
   * @throws an error if the string is illegal.
   */
  d.DecodeAngle = function(angstr) {
    var vals = d.Decode(angstr),
        ang = vals.val, ind = vals.ind;
    if (ind !== d.NONE)
      throw new Error("Arc angle " + angstr + " includes a hemisphere N/E/W/S");
    return ang;
  };

  /**
   * @summary Decode a DMS string interpreting it as an azimuth.
   * @param {string} azistr the string (this may include an E/W hemisphere
   *   indicator).
   * @returns {number} the azimuth (degrees).
   * @throws an error if the string is illegal.
   */
  d.DecodeAzimuth = function(azistr) {
    var vals = d.Decode(azistr),
        azi = vals.val, ind = vals.ind;
    if (ind === d.LATITUDE)
      throw new Error("Azimuth " + azistr + " has a latitude hemisphere N/S");
    return azi;
  };

  /**
   * @summary Convert angle (in degrees) into a DMS string (using &deg;, ',
   *  and &quot;).
   * @param {number} angle input angle (degrees).
   * @param {number} trailing one of DEGREE, MINUTE, or SECOND to indicate
   *   the trailing component of the string (this component is given as a
   *   decimal number if necessary).
   * @param {number} prec the number of digits after the decimal point for
   *   the trailing component.
   * @param {number} [ind = NONE] a formatting indicator, one of NONE,
   *   LATITUDE, LONGITUDE, AZIMUTH.
   * @returns {string} the resulting string formatted as follows:
   *   * NONE, signed result no leading zeros on degrees except in the units
   *     place, e.g., -8&deg;03'.
   *   * LATITUDE, trailing N or S hemisphere designator, no sign, pad
   *     degrees to 2 digits, e.g., 08&deg;03'S.
   *   * LONGITUDE, trailing E or W hemisphere designator, no sign, pad
   *     degrees to 3 digits, e.g., 008&deg;03'W.
   *   * AZIMUTH, convert to the range [0, 360&deg;), no sign, pad degrees to
   *     3 digits, e.g., 351&deg;57'.
   */
  d.Encode = function(angle, trailing, prec, ind) {
    // Assume check on range of input angle has been made by calling
    // routine (which might be able to offer a better diagnostic).
    var scale = 1, i, sign,
        idegree, fdegree, f, pieces, ip, fp, s;
    if (!ind) ind = d.NONE;
    if (!isFinite(angle))
      return angle < 0 ? String("-inf") :
      (angle > 0 ? String("inf") : String("nan"));

    // 15 - 2 * trailing = ceiling(log10(2^53/90/60^trailing)).
    // This suffices to give full real precision for numbers in [-90,90]
    prec = Math.min(15 - 2 * trailing, prec);
    for (i = 0; i < trailing; ++i)
      scale *= 60;
    for (i = 0; i < prec; ++i)
      scale *= 10;
    if (ind === d.AZIMUTH)
      angle -= Math.floor(angle/360) * 360;
    sign = angle < 0 ? -1 : 1;
    angle *= sign;

    // Break off integer part to preserve precision in manipulation of
    // fractional part.
    idegree = Math.floor(angle);
    fdegree = (angle - idegree) * scale + 0.5;
    f = Math.floor(fdegree);
    // Implement the "round ties to even" rule
    fdegree = (f == fdegree && (f & 1)) ? f - 1 : f;
    fdegree /= scale;

    fdegree = Math.floor((angle - idegree) * scale + 0.5) / scale;
    if (fdegree >= 1) {
      idegree += 1;
      fdegree -= 1;
    }
    pieces = [fdegree, 0, 0];
    for (i = 1; i <= trailing; ++i) {
      ip = Math.floor(pieces[i - 1]);
      fp = pieces[i - 1] - ip;
      pieces[i] = fp * 60;
      pieces[i - 1] = ip;
    }
    pieces[0] += idegree;
    s = "";
    if (ind === d.NONE && sign < 0)
      s += '-';
    switch (trailing) {
    case d.DEGREE:
      s += zerofill(pieces[0].toFixed(prec),
                    ind === d.NONE ? 0 :
                    1 + Math.min(ind, 2) + prec + (prec ? 1 : 0)) +
        dmsindicatorsu_.charAt(0);
      break;
    default:
      s += zerofill(pieces[0].toFixed(0),
                    ind === d.NONE ? 0 : 1 + Math.min(ind, 2)) +
        dmsindicatorsu_.charAt(0);
      switch (trailing) {
      case d.MINUTE:
        s += zerofill(pieces[1].toFixed(prec), 2 + prec + (prec ? 1 : 0)) +
          dmsindicatorsu_.charAt(1);
        break;
      case d.SECOND:
        s += zerofill(pieces[1].toFixed(0), 2) + dmsindicatorsu_.charAt(1);
        s += zerofill(pieces[2].toFixed(prec), 2 + prec + (prec ? 1 : 0)) +
          dmsindicatorsu_.charAt(2);
        break;
      default:
        break;
      }
    }
    if (ind !== d.NONE && ind !== d.AZIMUTH)
      s += hemispheres_.charAt((ind === d.LATITUDE ? 0 : 2) +
                               (sign < 0 ? 0 : 1));
    return s;
  };
})(GeographicLib.DMS);

cb(GeographicLib);

})(function(geo) {
  if (typeof module === 'object' && module.exports) {
    /******** support loading with node's require ********/
    module.exports = geo;
  } else if (typeof define === 'function' && define.amd) {
    /******** support loading with AMD ********/
    define(/*'geographiclib',*/ [], function() { return geo; });
  } else {
    /******** otherwise just pollute our global namespace ********/
    window.GeographicLib = geo;
  }
});
