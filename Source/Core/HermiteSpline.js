import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import LinearSpline from "./LinearSpline.js";
import Matrix4 from "./Matrix4.js";
import Spline from "./Spline.js";
import TridiagonalSystemSolver from "./TridiagonalSystemSolver.js";

const scratchLower = [];
const scratchDiagonal = [];
const scratchUpper = [];
const scratchRight = [];

function generateClamped(points, firstTangent, lastTangent) {
  const l = scratchLower;
  const u = scratchUpper;
  const d = scratchDiagonal;
  const r = scratchRight;

  l.length = u.length = points.length - 1;
  d.length = r.length = points.length;

  let i;
  l[0] = d[0] = 1.0;
  u[0] = 0.0;

  let right = r[0];
  if (!defined(right)) {
    right = r[0] = new Cartesian3();
  }
  Cartesian3.clone(firstTangent, right);

  for (i = 1; i < l.length - 1; ++i) {
    l[i] = u[i] = 1.0;
    d[i] = 4.0;

    right = r[i];
    if (!defined(right)) {
      right = r[i] = new Cartesian3();
    }
    Cartesian3.subtract(points[i + 1], points[i - 1], right);
    Cartesian3.multiplyByScalar(right, 3.0, right);
  }

  l[i] = 0.0;
  u[i] = 1.0;
  d[i] = 4.0;

  right = r[i];
  if (!defined(right)) {
    right = r[i] = new Cartesian3();
  }
  Cartesian3.subtract(points[i + 1], points[i - 1], right);
  Cartesian3.multiplyByScalar(right, 3.0, right);

  d[i + 1] = 1.0;
  right = r[i + 1];
  if (!defined(right)) {
    right = r[i + 1] = new Cartesian3();
  }
  Cartesian3.clone(lastTangent, right);

  return TridiagonalSystemSolver.solve(l, d, u, r);
}

function generateNatural(points) {
  const l = scratchLower;
  const u = scratchUpper;
  const d = scratchDiagonal;
  const r = scratchRight;

  l.length = u.length = points.length - 1;
  d.length = r.length = points.length;

  let i;
  l[0] = u[0] = 1.0;
  d[0] = 2.0;

  let right = r[0];
  if (!defined(right)) {
    right = r[0] = new Cartesian3();
  }
  Cartesian3.subtract(points[1], points[0], right);
  Cartesian3.multiplyByScalar(right, 3.0, right);

  for (i = 1; i < l.length; ++i) {
    l[i] = u[i] = 1.0;
    d[i] = 4.0;

    right = r[i];
    if (!defined(right)) {
      right = r[i] = new Cartesian3();
    }
    Cartesian3.subtract(points[i + 1], points[i - 1], right);
    Cartesian3.multiplyByScalar(right, 3.0, right);
  }

  d[i] = 2.0;

  right = r[i];
  if (!defined(right)) {
    right = r[i] = new Cartesian3();
  }
  Cartesian3.subtract(points[i], points[i - 1], right);
  Cartesian3.multiplyByScalar(right, 3.0, right);

  return TridiagonalSystemSolver.solve(l, d, u, r);
}

/**
 * A Hermite spline is a cubic interpolating spline. Points, incoming tangents, outgoing tangents, and times
 * must be defined for each control point. The outgoing tangents are defined for points [0, n - 2] and the incoming
 * tangents are defined for points [1, n - 1]. For example, when interpolating a segment of the curve between <code>points[i]</code> and
 * <code>points[i + 1]</code>, the tangents at the points will be <code>outTangents[i]</code> and <code>inTangents[i]</code>,
 * respectively.
 *
 * @alias HermiteSpline
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Number[]} options.times An array of strictly increasing, unit-less, floating-point times at each point.
 *                The values are in no way connected to the clock time. They are the parameterization for the curve.
 * @param {Cartesian3[]} options.points The array of {@link Cartesian3} control points.
 * @param {Cartesian3[]} options.inTangents The array of {@link Cartesian3} incoming tangents at each control point.
 * @param {Cartesian3[]} options.outTangents The array of {@link Cartesian3} outgoing tangents at each control point.
 *
 * @exception {DeveloperError} points.length must be greater than or equal to 2.
 * @exception {DeveloperError} times.length must be equal to points.length.
 * @exception {DeveloperError} inTangents and outTangents must have a length equal to points.length - 1.
 *
 *
 * @example
 * // Create a G<sup>1</sup> continuous Hermite spline
 * var times = [ 0.0, 1.5, 3.0, 4.5, 6.0 ];
 * var spline = new Cesium.HermiteSpline({
 *     times : times,
 *     points : [
 *         new Cesium.Cartesian3(1235398.0, -4810983.0, 4146266.0),
 *         new Cesium.Cartesian3(1372574.0, -5345182.0, 4606657.0),
 *         new Cesium.Cartesian3(-757983.0, -5542796.0, 4514323.0),
 *         new Cesium.Cartesian3(-2821260.0, -5248423.0, 4021290.0),
 *         new Cesium.Cartesian3(-2539788.0, -4724797.0, 3620093.0)
 *     ],
 *     outTangents : [
 *         new Cesium.Cartesian3(1125196, -161816, 270551),
 *         new Cesium.Cartesian3(-996690.5, -365906.5, 184028.5),
 *         new Cesium.Cartesian3(-2096917, 48379.5, -292683.5),
 *         new Cesium.Cartesian3(-890902.5, 408999.5, -447115)
 *     ],
 *     inTangents : [
 *         new Cesium.Cartesian3(-1993381, -731813, 368057),
 *         new Cesium.Cartesian3(-4193834, 96759, -585367),
 *         new Cesium.Cartesian3(-1781805, 817999, -894230),
 *         new Cesium.Cartesian3(1165345, 112641, 47281)
 *     ]
 * });
 *
 * var p0 = spline.evaluate(times[0]);
 *
 * @see CatmullRomSpline
 * @see LinearSpline
 * @see QuaternionSpline
 * @see WeightSpline
 */
function HermiteSpline(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const points = options.points;
  const times = options.times;
  const inTangents = options.inTangents;
  const outTangents = options.outTangents;

  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(points) ||
    !defined(times) ||
    !defined(inTangents) ||
    !defined(outTangents)
  ) {
    throw new DeveloperError(
      "times, points, inTangents, and outTangents are required."
    );
  }
  if (points.length < 2) {
    throw new DeveloperError(
      "points.length must be greater than or equal to 2."
    );
  }
  if (times.length !== points.length) {
    throw new DeveloperError("times.length must be equal to points.length.");
  }
  if (
    inTangents.length !== outTangents.length ||
    inTangents.length !== points.length - 1
  ) {
    throw new DeveloperError(
      "inTangents and outTangents must have a length equal to points.length - 1."
    );
  }
  //>>includeEnd('debug');

  this._times = times;
  this._points = points;
  this._inTangents = inTangents;
  this._outTangents = outTangents;

  this._lastTimeIndex = 0;
}

Object.defineProperties(HermiteSpline.prototype, {
  /**
   * An array of times for the control points.
   *
   * @memberof HermiteSpline.prototype
   *
   * @type {Number[]}
   * @readonly
   */
  times: {
    get: function () {
      return this._times;
    },
  },

  /**
   * An array of {@link Cartesian3} control points.
   *
   * @memberof HermiteSpline.prototype
   *
   * @type {Cartesian3[]}
   * @readonly
   */
  points: {
    get: function () {
      return this._points;
    },
  },

  /**
   * An array of {@link Cartesian3} incoming tangents at each control point.
   *
   * @memberof HermiteSpline.prototype
   *
   * @type {Cartesian3[]}
   * @readonly
   */
  inTangents: {
    get: function () {
      return this._inTangents;
    },
  },

  /**
   * An array of {@link Cartesian3} outgoing tangents at each control point.
   *
   * @memberof HermiteSpline.prototype
   *
   * @type {Cartesian3[]}
   * @readonly
   */
  outTangents: {
    get: function () {
      return this._outTangents;
    },
  },
});

/**
 * Creates a spline where the tangents at each control point are the same.
 * The curves are guaranteed to be at least in the class C<sup>1</sup>.
 *
 * @param {Object} options Object with the following properties:
 * @param {Number[]} options.times The array of control point times.
 * @param {Cartesian3[]} options.points The array of control points.
 * @param {Cartesian3[]} options.tangents The array of tangents at the control points.
 * @returns {HermiteSpline} A hermite spline.
 *
 * @exception {DeveloperError} points, times and tangents are required.
 * @exception {DeveloperError} points.length must be greater than or equal to 2.
 * @exception {DeveloperError} times, points and tangents must have the same length.
 *
 * @example
 * var points = [
 *     new Cesium.Cartesian3(1235398.0, -4810983.0, 4146266.0),
 *     new Cesium.Cartesian3(1372574.0, -5345182.0, 4606657.0),
 *     new Cesium.Cartesian3(-757983.0, -5542796.0, 4514323.0),
 *     new Cesium.Cartesian3(-2821260.0, -5248423.0, 4021290.0),
 *     new Cesium.Cartesian3(-2539788.0, -4724797.0, 3620093.0)
 * ];
 *
 * // Add tangents
 * var tangents = new Array(points.length);
 * tangents[0] = new Cesium.Cartesian3(1125196, -161816, 270551);
 * var temp = new Cesium.Cartesian3();
 * for (var i = 1; i < tangents.length - 1; ++i) {
 *     tangents[i] = Cesium.Cartesian3.multiplyByScalar(Cesium.Cartesian3.subtract(points[i + 1], points[i - 1], temp), 0.5, new Cesium.Cartesian3());
 * }
 * tangents[tangents.length - 1] = new Cesium.Cartesian3(1165345, 112641, 47281);
 *
 * var spline = Cesium.HermiteSpline.createC1({
 *     times : times,
 *     points : points,
 *     tangents : tangents
 * });
 */
HermiteSpline.createC1 = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const times = options.times;
  const points = options.points;
  const tangents = options.tangents;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(points) || !defined(times) || !defined(tangents)) {
    throw new DeveloperError("points, times and tangents are required.");
  }
  if (points.length < 2) {
    throw new DeveloperError(
      "points.length must be greater than or equal to 2."
    );
  }
  if (times.length !== points.length || times.length !== tangents.length) {
    throw new DeveloperError(
      "times, points and tangents must have the same length."
    );
  }
  //>>includeEnd('debug');

  const outTangents = tangents.slice(0, tangents.length - 1);
  const inTangents = tangents.slice(1, tangents.length);

  return new HermiteSpline({
    times: times,
    points: points,
    inTangents: inTangents,
    outTangents: outTangents,
  });
};

/**
 * Creates a natural cubic spline. The tangents at the control points are generated
 * to create a curve in the class C<sup>2</sup>.
 *
 * @param {Object} options Object with the following properties:
 * @param {Number[]} options.times The array of control point times.
 * @param {Cartesian3[]} options.points The array of control points.
 * @returns {HermiteSpline|LinearSpline} A hermite spline or a linear spline if less than 3 control points were given.
 *
 * @exception {DeveloperError} points and times are required.
 * @exception {DeveloperError} points.length must be greater than or equal to 2.
 * @exception {DeveloperError} times.length must be equal to points.length.
 *
 * @example
 * // Create a natural cubic spline above the earth from Philadelphia to Los Angeles.
 * var spline = Cesium.HermiteSpline.createNaturalCubic({
 *     times : [ 0.0, 1.5, 3.0, 4.5, 6.0 ],
 *     points : [
 *         new Cesium.Cartesian3(1235398.0, -4810983.0, 4146266.0),
 *         new Cesium.Cartesian3(1372574.0, -5345182.0, 4606657.0),
 *         new Cesium.Cartesian3(-757983.0, -5542796.0, 4514323.0),
 *         new Cesium.Cartesian3(-2821260.0, -5248423.0, 4021290.0),
 *         new Cesium.Cartesian3(-2539788.0, -4724797.0, 3620093.0)
 *     ]
 * });
 */
HermiteSpline.createNaturalCubic = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const times = options.times;
  const points = options.points;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(points) || !defined(times)) {
    throw new DeveloperError("points and times are required.");
  }
  if (points.length < 2) {
    throw new DeveloperError(
      "points.length must be greater than or equal to 2."
    );
  }
  if (times.length !== points.length) {
    throw new DeveloperError("times.length must be equal to points.length.");
  }
  //>>includeEnd('debug');

  if (points.length < 3) {
    return new LinearSpline({
      points: points,
      times: times,
    });
  }

  const tangents = generateNatural(points);
  const outTangents = tangents.slice(0, tangents.length - 1);
  const inTangents = tangents.slice(1, tangents.length);

  return new HermiteSpline({
    times: times,
    points: points,
    inTangents: inTangents,
    outTangents: outTangents,
  });
};

/**
 * Creates a clamped cubic spline. The tangents at the interior control points are generated
 * to create a curve in the class C<sup>2</sup>.
 *
 * @param {Object} options Object with the following properties:
 * @param {Number[]} options.times The array of control point times.
 * @param {Cartesian3[]} options.points The array of control points.
 * @param {Cartesian3} options.firstTangent The outgoing tangent of the first control point.
 * @param {Cartesian3} options.lastTangent The incoming tangent of the last control point.
 * @returns {HermiteSpline|LinearSpline} A hermite spline or a linear spline if less than 3 control points were given.
 *
 * @exception {DeveloperError} points, times, firstTangent and lastTangent are required.
 * @exception {DeveloperError} points.length must be greater than or equal to 2.
 * @exception {DeveloperError} times.length must be equal to points.length.
 *
 * @example
 * // Create a clamped cubic spline above the earth from Philadelphia to Los Angeles.
 * var spline = Cesium.HermiteSpline.createClampedCubic({
 *     times : [ 0.0, 1.5, 3.0, 4.5, 6.0 ],
 *     points : [
 *         new Cesium.Cartesian3(1235398.0, -4810983.0, 4146266.0),
 *         new Cesium.Cartesian3(1372574.0, -5345182.0, 4606657.0),
 *         new Cesium.Cartesian3(-757983.0, -5542796.0, 4514323.0),
 *         new Cesium.Cartesian3(-2821260.0, -5248423.0, 4021290.0),
 *         new Cesium.Cartesian3(-2539788.0, -4724797.0, 3620093.0)
 *     ],
 *     firstTangent : new Cesium.Cartesian3(1125196, -161816, 270551),
 *     lastTangent : new Cesium.Cartesian3(1165345, 112641, 47281)
 * });
 */
HermiteSpline.createClampedCubic = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const times = options.times;
  const points = options.points;
  const firstTangent = options.firstTangent;
  const lastTangent = options.lastTangent;

  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(points) ||
    !defined(times) ||
    !defined(firstTangent) ||
    !defined(lastTangent)
  ) {
    throw new DeveloperError(
      "points, times, firstTangent and lastTangent are required."
    );
  }
  if (points.length < 2) {
    throw new DeveloperError(
      "points.length must be greater than or equal to 2."
    );
  }
  if (times.length !== points.length) {
    throw new DeveloperError("times.length must be equal to points.length.");
  }
  //>>includeEnd('debug');

  if (points.length < 3) {
    return new LinearSpline({
      points: points,
      times: times,
    });
  }

  const tangents = generateClamped(points, firstTangent, lastTangent);
  const outTangents = tangents.slice(0, tangents.length - 1);
  const inTangents = tangents.slice(1, tangents.length);

  return new HermiteSpline({
    times: times,
    points: points,
    inTangents: inTangents,
    outTangents: outTangents,
  });
};

HermiteSpline.hermiteCoefficientMatrix = new Matrix4(
  2.0,
  -3.0,
  0.0,
  1.0,
  -2.0,
  3.0,
  0.0,
  0.0,
  1.0,
  -2.0,
  1.0,
  0.0,
  1.0,
  -1.0,
  0.0,
  0.0
);

/**
 * Finds an index <code>i</code> in <code>times</code> such that the parameter
 * <code>time</code> is in the interval <code>[times[i], times[i + 1]]</code>.
 * @function
 *
 * @param {Number} time The time.
 * @returns {Number} The index for the element at the start of the interval.
 *
 * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
 *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
 *                             in the array <code>times</code>.
 */
HermiteSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;

const scratchTimeVec = new Cartesian4();
const scratchTemp = new Cartesian3();

/**
 * Wraps the given time to the period covered by the spline.
 * @function
 *
 * @param {Number} time The time.
 * @return {Number} The time, wrapped around to the updated animation.
 */
HermiteSpline.prototype.wrapTime = Spline.prototype.wrapTime;

/**
 * Clamps the given time to the period covered by the spline.
 * @function
 *
 * @param {Number} time The time.
 * @return {Number} The time, clamped to the animation period.
 */
HermiteSpline.prototype.clampTime = Spline.prototype.clampTime;

/**
 * Evaluates the curve at a given time.
 *
 * @param {Number} time The time at which to evaluate the curve.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new instance of the point on the curve at the given time.
 *
 * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
 *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
 *                             in the array <code>times</code>.
 */
HermiteSpline.prototype.evaluate = function (time, result) {
  if (!defined(result)) {
    result = new Cartesian3();
  }
  const points = this.points;
  const times = this.times;
  const inTangents = this.inTangents;
  const outTangents = this.outTangents;

  const i = (this._lastTimeIndex = this.findTimeInterval(
    time,
    this._lastTimeIndex
  ));
  const u = (time - times[i]) / (times[i + 1] - times[i]);

  const timeVec = scratchTimeVec;
  timeVec.z = u;
  timeVec.y = u * u;
  timeVec.x = timeVec.y * u;
  timeVec.w = 1.0;

  const coefs = Matrix4.multiplyByVector(
    HermiteSpline.hermiteCoefficientMatrix,
    timeVec,
    timeVec
  );

  result = Cartesian3.multiplyByScalar(points[i], coefs.x, result);
  Cartesian3.multiplyByScalar(points[i + 1], coefs.y, scratchTemp);
  Cartesian3.add(result, scratchTemp, result);
  Cartesian3.multiplyByScalar(outTangents[i], coefs.z, scratchTemp);
  Cartesian3.add(result, scratchTemp, result);
  Cartesian3.multiplyByScalar(inTangents[i], coefs.w, scratchTemp);
  return Cartesian3.add(result, scratchTemp, result);
};
export default HermiteSpline;
