import Check from "../../../../Core/Check.js";

/**
 * @typedef {object} CorrelationGroup.ConstructorOptions
 *
 * Initialization options for the CorrelationGroup constructor
 *
 * @property {boolean[]} groupFlags Array of 3 booleans indicating if
 * parameters delta-x delta-y delta-z used in the correlation group
 * @property {Cartesian3} rotationThetas Rotations in milliradians
 * about X, Y, Z axes, respectively
 * @property {Spdcf[]} params Array of `Spdcf` (Strictly Positive-Definite
 * Correlation Function) parameters, for the U, V, W directions, respectively
 */

/**
 * Metadata identifying parameters using same correlation modeling and
 * associated correlation parameters.
 *
 * This reflects the `correlationGroup` definition of the
 * {@link https://nsgreg.nga.mil/csmwg.jsp|NGA_gpm_local} glTF extension.
 *
 * @constructor
 * @param {CorrelationGroup.ConstructorOptions} options An object describing initialization options
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function CorrelationGroup(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.groupFlags", options.groupFlags);
  Check.typeOf.object("options.rotationThetas", options.rotationThetas);
  Check.typeOf.object("options.params", options.params);
  //>>includeEnd('debug');

  this._groupFlags = options.groupFlags;
  this._rotationThetas = options.rotationThetas;
  this._params = options.params;
}

Object.defineProperties(CorrelationGroup.prototype, {
  /**
   * Array of 3 booleans indicating if parameters delta-x delta-y delta-z
   * used in the correlation group
   *
   * @memberof CorrelationGroup.prototype
   * @type {boolean[]}
   * @readonly
   */
  groupFlags: {
    get: function () {
      return this._groupFlags;
    },
  },

  /**
   * Rotations in milliradians about X, Y, Z axes, respectively
   *
   * @memberof CorrelationGroup.prototype
   * @type {Cartesian3}
   * @readonly
   */
  rotationThetas: {
    get: function () {
      return this._rotationThetas;
    },
  },

  /**
   * Array of 3 sets of SPDCF parameters, for the U, V, W directions, respectively
   *
   * @memberof CorrelationGroup.prototype
   * @type {Spdcf[]}
   * @readonly
   */
  params: {
    get: function () {
      return this._params;
    },
  },
});

export default CorrelationGroup;
