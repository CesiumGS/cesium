import Check from "../../../../Core/Check.js";

/**
 * @typedef {object} AnchorPointDirect.ConstructorOptions
 *
 * Initialization options for the AnchorPointDirect constructor
 *
 * @property {Cartesian3} position  Anchor point geographic coordinates
 * @property {Cartesian3} adjustmentParams The adjustment values in meters
 */

/**
 * Metadata for one stored anchor point using direct storage.
 *
 * This reflects the `anchronPointDirect` definition of the
 * {@link https://nsgreg.nga.mil/csmwg.jsp|NGA_gpm_local} glTF extension.
 *
 * @constructor
 * @param {AnchorPointDirect.ConstructorOptions} options An object describing initialization options
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function AnchorPointDirect(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.position", options.position);
  Check.typeOf.object("options.adjustmentParams", options.adjustmentParams);
  //>>includeEnd('debug');

  this._position = options.position;
  this._adjustmentParams = options.adjustmentParams;
}

Object.defineProperties(AnchorPointDirect.prototype, {
  /**
   * Anchor point geographic coordinates in meters as X/Easting, Y/Northing, Z/HAE
   *
   * @memberof AnchorPointDirect.prototype
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
   * @memberof AnchorPointDirect.prototype
   * @type {Cartesian3}
   * @readonly
   */
  adjustmentParams: {
    get: function () {
      return this._adjustmentParams;
    },
  },
});

export default AnchorPointDirect;
