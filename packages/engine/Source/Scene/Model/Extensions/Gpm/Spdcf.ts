import Check from "../../../../Core/Check.js";

/**
 * @typedef {object} Spdcf.ConstructorOptions
 *
 * Initialization options for the Spdcf constructor
 *
 * @property {number} A The factor A, in (0, 1]
 * @property {number} alpha The alpha value, in [0, 1)
 * @property {number} beta The beta value, in [0, 10]
 * @property {number} T the tau value, in (0, +inf)
 */

/**
 * Variables for a Strictly Positive-Definite Correlation Function.
 *
 * This reflects the `spdcf` definition of the
 * {@link https://nsgreg.nga.mil/csmwg.jsp|NGA_gpm_local} glTF extension.
 * Instances of this type are stored as the parameters within a
 * `CorrelationGroup`.
 *
 * Parameters (A, alpha, beta, T) describe the correlation decrease
 * between points as a function of delta time:
 * ```
 * spdcf(delta_t) = A_t * (alpha_t + ((1 - alpha_t)(1 + beta_t)) / (beta_t + e^(delta_t/T_t)))
 * ```
 *
 * @constructor
 * @param {Spdcf.ConstructorOptions} options An object describing initialization options
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Spdcf(options) {
  ;

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
   */
  T: {
    get: function () {
      return this._T;
    },
  },
});

export { Spdcf };
export default Spdcf;
