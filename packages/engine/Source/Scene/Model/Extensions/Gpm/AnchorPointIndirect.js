import Check from "../../../../Core/Check.js";

/**
 * @typedef {object} AnchorPointIndirect.ConstructorOptions
 *
 * Initialization options for the AnchorPointIndirect constructor
 *
 * @property {Cartesian3} position  Anchor point geographic coordinates
 * @property {Cartesian3} adjustmentParams The adjustment values in meters
 * @property {Matrix3} covarianceMatrix The 3x3 covariance matrix
 */

/**
 * Metadata for one stored anchor point.
 *
 * This reflects the `anchronPointIndirect` definition of the
 * {@link https://nsgreg.nga.mil/csmwg.jsp|NGA_gpm_local} glTF extension.
 *
 * @constructor
 * @param {AnchorPointIndirect.ConstructorOptions} options An object describing initialization options
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function AnchorPointIndirect(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.position", options.position);
  Check.typeOf.object("options.adjustmentParams", options.adjustmentParams);
  Check.typeOf.object("options.covarianceMatrix", options.covarianceMatrix);
  //>>includeEnd('debug');

  this._position = options.position;
  this._adjustmentParams = options.adjustmentParams;
  this._covarianceMatrix = options.covarianceMatrix;
}

Object.defineProperties(AnchorPointIndirect.prototype, {
  /**
   * Anchor point geographic coordinates in meters as X/Easting, Y/Northing, Z/HAE
   *
   * @memberof AnchorPointIndirect.prototype
   * @type {Cartesian3}
   * @readonly
   */
  position: {
    get: function () {
      return this._position;
    },
  },

  /**
   * The delta-x delta-y delta-z adjustment values in meters per anchor
   * point.
   *
   * @memberof AnchorPointIndirect.prototype
   * @type {Cartesian3}
   * @readonly
   */
  adjustmentParams: {
    get: function () {
      return this._adjustmentParams;
    },
  },

  /**
   * The 3x3 covariance matrix.
   *
   * @memberof AnchorPointIndirect.prototype
   * @type {Matrix3}
   * @readonly
   */
  covarianceMatrix: {
    get: function () {
      return this._covarianceMatrix;
    },
  },
});

export default AnchorPointIndirect;
