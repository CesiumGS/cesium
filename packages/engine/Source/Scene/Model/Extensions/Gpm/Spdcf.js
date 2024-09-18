import Check from "../../../../Core/Check.js";

/**
 * Variables for a Strictly Positive-Definite Correlation Function.
 *
 * Parameters (A, alpha, beta, T) used to describe the correlation decrease
 * between points as a function of delta time.
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Spdcf(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThan("options.A", options.A, 0.0);
  Check.typeOf.number.lessThanOrEquals("options.A", options.A, 1.0);
  Check.typeOf.number.greaterThanOrEquals("options.alpha", options.alpha, 0.0);
  Check.typeOf.number.lessThan("options.alpha", options.alpha, 1.0);
  Check.typeOf.number.greaterThanOrEquals("options.beta", options.beta, 0.0);
  Check.typeOf.number.lessThanOrEquals("options.beta", options.beta, 10.0);
  Check.typeOf.number.greaterThan("options.T", options.T, 0.0);
  //>>includeEnd('debug');

  this._A = options.A;
  this._alpha = options.alpha;
  this._beta = options.beta;
  this._T = options.T;
}

Object.defineProperties(Spdcf.prototype, {
  /**
   * In (0, 1]
   *
   * @memberof Spdcf.prototype
   * @type {number}
   * @readonly
   * @private
   */
  A: {
    get: function () {
      return this._A;
    },
  },

  /**
   * In [0, 1)
   *
   * @memberof Spdcf.prototype
   * @type {number}
   * @readonly
   * @private
   */
  alpha: {
    get: function () {
      return this._alpha;
    },
  },

  /**
   * In [0, 10]
   *
   * @memberof Spdcf.prototype
   * @type {number}
   * @readonly
   * @private
   */
  beta: {
    get: function () {
      return this._beta;
    },
  },

  /**
   * In (0, +inf)
   *
   * @memberof Spdcf.prototype
   * @type {number}
   * @readonly
   * @private
   */
  T: {
    get: function () {
      return this._T;
    },
  },
});

export default Spdcf;
