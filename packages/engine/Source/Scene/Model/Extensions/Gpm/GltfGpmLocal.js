import defined from "../../../../Core/defined.js";
import Check from "../../../../Core/Check.js";
import RuntimeError from "../../../../Core/RuntimeError.js";
import StorageType from "./StorageType.js";

/**
 * @typedef {object} GltfGpmLocal.ConstructorOptions
 *
 * Initialization options for the GltfGpmLocal constructor
 *
 * @property {string} storageType The storage type.
 * This must be one of the `StorageType` constants, i.e. `Direct` or `Indirect`.
 * @property {AnchorPointIndirect[]|undefined} [anchorPointsIndirect] The indirect anchor points.
 * This must be present if and only if the storage type is `Indirect`.
 * @property {CorrelationGroup[]|undefined} [intraTileCorrelationGroups] The intra-tile correlation groups.
 * This must be present if and only if the storage type is `Indirect`.
 * @property {AnchorPointDirect[]|undefined} [anchorPointsDirect] The direct anchor points.
 * This must be present if and only if the storage type is `Direct`.
 * @property {Matrix3|undefined} [covarianceDirect] The covariance of anchor point parameters.
 * This must be present if and only if the storage type is `Direct`.
 */

/**
 * The GPM metadata for a Ground-Space Indirect implementation stored
 * locally (i.e. a tile and/or leaf node).
 *
 * This reflects the root extension object of the {@link https://nsgreg.nga.mil/csmwg.jsp|NGA_gpm_local}
 * glTF extension. When a model that contains this extension was loaded,
 * then an object of this type can be obtained by calling
 * ```
 * const gltfGpmLocal = model.getExtension("NGA_gpm_local");
 * ```
 *
 * The storage type determines the presence of the optional properties:
 * <ul>
 *  <li>
 *   When the storage type is `StorageType.Indirect`, then the
 *   `anchorPointsIndirect` and `intraTileCorrelationGroups`
 *   are present.
 *  </li>
 *  <li>
 *   When the storage type is `StorageType.Direct`, then the
 *   `anchorPointsDirect` and `covarianceDirect` are present.
 *  </li>
 * </ul>
 *
 * @constructor
 * @param {GltfGpmLocal.ConstructorOptions} options An object describing initialization options
 *
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
        "The anchorPointsIndirect are required for 'Indirect' storage",
      );
    }
    if (!defined(this.intraTileCorrelationGroups)) {
      throw new RuntimeError(
        "The intraTileCorrelationGroups are required for 'Indirect' storage",
      );
    }
    if (defined(this.anchorPointsDirect)) {
      throw new RuntimeError(
        "The anchorPointsDirect must be omitted for 'Indirect' storage",
      );
    }
    if (defined(this.covarianceDirect)) {
      throw new RuntimeError(
        "The covarianceDirect must be omitted for 'Indirect' storage",
      );
    }
  } else {
    // Direct storage
    if (!defined(this.anchorPointsDirect)) {
      throw new RuntimeError(
        "The anchorPointsDirect are required for 'Direct' storage",
      );
    }
    if (!defined(this.covarianceDirect)) {
      throw new RuntimeError(
        "The covarianceDirect is required for 'Direct' storage",
      );
    }
    if (defined(this.anchorPointsIndirect)) {
      throw new RuntimeError(
        "The anchorPointsIndirect must be omitted for 'Direct' storage",
      );
    }
    if (defined(this.intraTileCorrelationGroups)) {
      throw new RuntimeError(
        "The intraTileCorrelationGroups must be omitted for 'Direct' storage",
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
   * @type {AnchorPointIndirect[]|undefined}
   * @readonly
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
   * @type {AnchorPointDirect[]|undefined}
   * @readonly
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
   * @type {CorrelationGroup[]|undefined}
   * @readonly
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
   * @type {Matrix3|undefined}
   * @readonly
   */
  covarianceDirect: {
    get: function () {
      return this._covarianceDirect;
    },
  },
});

export default GltfGpmLocal;
