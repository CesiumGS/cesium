import defined from "../../../../Core/defined.js";
import Check from "../../../../Core/Check.js";
import RuntimeError from "../../../../Core/RuntimeError.js";
import StorageType from "./StorageType.js";

/**
 * The GPM metadata for a Ground-Space Indirect implementation stored
 * locally (i.e. a tile and/or leaf node).
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function GltfGpmLocal(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.storageType", options.storageType);
  //>>includeEnd('debug');

  this._storageType = options.storageType;
  this._anchorPointsIndirect = options.anchorPointsIndirect;
  this._anchorPointsDirect = options.anchorPointsDirect;
  this._intraTileCorrelationGroups = options.intraTileCorrelationGroups;
  this._covarianceDirect = options.covarianceDirect;

  //>>includeStart('debug', pragmas.debug);
  if (this.storageType === StorageType.Indirect) {
    if (!defined(this.anchorPointsIndirect)) {
      throw new RuntimeError(
        "The anchorPointsIndirect are required for 'Indirect' storage"
      );
    }
    if (!defined(this.intraTileCorrelationGroups)) {
      throw new RuntimeError(
        "The intraTileCorrelationGroups are required for 'Indirect' storage"
      );
    }
    if (defined(this.anchorPointsDirect)) {
      throw new RuntimeError(
        "The anchorPointsDirect must be omitted for 'Indirect' storage"
      );
    }
    if (defined(this.covarianceDirect)) {
      throw new RuntimeError(
        "The covarianceDirect must be omitted for 'Indirect' storage"
      );
    }
  } else {
    // Direct storage
    if (!defined(this.anchorPointsDirect)) {
      throw new RuntimeError(
        "The anchorPointsDirect are required for 'Direct' storage"
      );
    }
    if (!defined(this.covarianceDirect)) {
      throw new RuntimeError(
        "The covarianceDirect is required for 'Direct' storage"
      );
    }
    if (defined(this.anchorPointsIndirect)) {
      throw new RuntimeError(
        "The anchorPointsIndirect must be omitted for 'Direct' storage"
      );
    }
    if (defined(this.intraTileCorrelationGroups)) {
      throw new RuntimeError(
        "The intraTileCorrelationGroups must be omitted for 'Direct' storage"
      );
    }
  }
  //>>includeEnd('debug');
}

Object.defineProperties(GltfGpmLocal.prototype, {
  /**
   * Specifies if covariance storage is indirect or direct.
   *
   * @memberof GltfGpmLocal.prototype
   * @type {StorageType}
   * @readonly
   * @private
   */
  storageType: {
    get: function () {
      return this._storageType;
    },
  },

  /**
   * Array of stored indirect anchor points
   *
   * @memberof GltfGpmLocal.prototype
   * @type {AnchorPointIndirect[]}
   * @readonly
   * @private
   */
  anchorPointsIndirect: {
    get: function () {
      return this._anchorPointsIndirect;
    },
  },

  /**
   * Array of stored direct anchor points
   *
   * @memberof GltfGpmLocal.prototype
   * @type {AnchorPointDirect[]}
   * @readonly
   * @private
   */
  anchorPointsDirect: {
    get: function () {
      return this._anchorPointsDirect;
    },
  },

  /**
   * Metadata identifying parameters using same correlation modeling and
   * associated correlation parameters
   *
   * @memberof GltfGpmLocal.prototype
   * @type {CorrelationGroup[]}
   * @readonly
   * @private
   */
  intraTileCorrelationGroups: {
    get: function () {
      return this._intraTileCorrelationGroups;
    },
  },

  /**
   * The full covariance of anchor point parameters
   *
   * @memberof GltfGpmLocal.prototype
   * @type {Matrix3}
   * @readonly
   * @private
   */
  covarianceDirect: {
    get: function () {
      return this._covarianceDirect;
    },
  },
});

export default GltfGpmLocal;
