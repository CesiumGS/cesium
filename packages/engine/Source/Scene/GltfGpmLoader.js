import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Matrix3 from "../Core/Matrix3.js";
import AnchorPointDirect from "./Model/Extensions/Gpm/AnchorPointDirect.js";
import AnchorPointIndirect from "./Model/Extensions/Gpm/AnchorPointIndirect.js";
import CorrelationGroup from "./Model/Extensions/Gpm/CorrelationGroup.js";
import GltfGpmLocal from "./Model/Extensions/Gpm/GltfGpmLocal.js";
import Spdcf from "./Model/Extensions/Gpm/Spdcf.js";
import StorageType from "./Model/Extensions/Gpm/StorageType.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads glTF NGA_gpm_local from the root of a glTF object
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 * Implementation note: This is an experimental implementation.
 *
 * @alias GltfGpmLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {string} [options.extension] The <code>NGA_gpm_local</code> extension object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {string} [options.cacheKey] The cache key of the resource.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 * @experimental This feature is subject to change without Cesium's standard deprecation policy.
 */
function GltfGpmLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltf = options.gltf;
  const extension = options.extension;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const cacheKey = options.cacheKey;
  const asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.extension", extension);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  //>>includeEnd('debug');

  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._extension = extension;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._gltfGpmLocal = undefined;

  // Immediately go into the "LOADED" state, since there
  // are no resources to wait for
  this._state = ResourceLoaderState.LOADED;
  this._promise = undefined;
}

if (defined(Object.create)) {
  GltfGpmLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfGpmLoader.prototype.constructor = GltfGpmLoader;
}

Object.defineProperties(GltfGpmLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof GltfGpmLoader.prototype
   *
   * @type {string}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The parsed GltfGpmLocal object
   *
   * @memberof GltfGpmLoader.prototype
   *
   * @type {GltfGpmLocal}
   * @readonly
   * @private
   */
  gltfGpmLocal: {
    get: function () {
      return this._gltfGpmLocal;
    },
  },
});

/**
 * Loads the resource.
 * @returns {Promise<GltfGpmLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfGpmLoader.prototype.load = function () {
  if (defined(this._promise)) {
    return this._promise;
  }
  this._promise = Promise.resolve(this);
  return this._promise;
};

/**
 * Creates a Matrix3 that describes a covariance matrix (which is
 * symmetric) from the array containing the upper triangle, in
 * column-major order.
 *
 * @param {number[]} array The input array
 * @returns The Matrix3
 */
function createCovarianceMatrixFromUpperTriangle(array) {
  const covarianceMatrix = new Matrix3(
    array[0],
    array[1],
    array[3],
    array[1],
    array[2],
    array[4],
    array[3],
    array[4],
    array[5]
  );
  return covarianceMatrix;
}

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfGpmLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state === ResourceLoaderState.READY) {
    return true;
  }
  if (this._state === ResourceLoaderState.FAILED) {
    return true;
  }
  if (this._state !== ResourceLoaderState.LOADED) {
    return false;
  }

  console.log("PARSE AND STORE HERE! ", this._extension);

  const extensionJson = this._extension;

  const storageType = extensionJson.storageType;
  if (storageType === StorageType.Direct) {
    const anchorPointsDirect = [];
    const anchorPointsDirectJson = extensionJson.anchorPointsDirect;
    for (const anchorPointDirectJson of anchorPointsDirectJson) {
      const position = Cartesian3.fromArray(
        anchorPointDirectJson.position,
        0,
        new Cartesian3()
      );
      const adjustmentParams = Cartesian3.fromArray(
        anchorPointDirectJson.adjustmentParams,
        0,
        new Cartesian3()
      );
      const anchorPointDirect = new AnchorPointDirect({
        position: position,
        adjustmentParams: adjustmentParams,
      });
      anchorPointsDirect.push(anchorPointDirect);
    }
    const covarianceDirect = createCovarianceMatrixFromUpperTriangle(
      extensionJson.covarianceDirectUpperTriangle
    );

    this._gltfGpmLocal = new GltfGpmLocal({
      storageType: storageType,
      anchorPointsDirect: anchorPointsDirect,
      covarianceDirect: covarianceDirect,
    });
    this._state = ResourceLoaderState.READY;
    return true;
  }
  if (storageType === StorageType.Indirect) {
    const anchorPointsIndirect = [];
    const anchorPointsIndirectJson = extensionJson.anchorPointsIndirect;
    for (const anchorPointIndirectJson of anchorPointsIndirectJson) {
      const position = Cartesian3.fromArray(
        anchorPointIndirectJson.position,
        0,
        new Cartesian3()
      );
      const adjustmentParams = Cartesian3.fromArray(
        anchorPointIndirectJson.adjustmentParams,
        0,
        new Cartesian3()
      );
      const covarianceMatrix = createCovarianceMatrixFromUpperTriangle(
        anchorPointIndirectJson.covarianceMatrix
      );
      const anchorPointIndirect = new AnchorPointIndirect({
        position: position,
        adjustmentParams: adjustmentParams,
        covarianceMatrix: covarianceMatrix,
      });
      anchorPointsIndirect.push(anchorPointIndirect);
    }

    const intraTileCorrelationGroupsJson =
      extensionJson.intraTileCorrelationGroups;
    const intraTileCorrelationGroups = [];

    for (const correlationGroupJson of intraTileCorrelationGroupsJson) {
      const groupFlags = correlationGroupJson.groupFlags;
      const rotationThetas = Cartesian3.fromArray(
        correlationGroupJson.rotationThetas,
        0,
        new Cartesian3()
      );
      const params = [];
      for (const paramJson of correlationGroupJson.params) {
        const param = new Spdcf({
          A: paramJson.A,
          alpha: paramJson.alpha,
          beta: paramJson.beta,
          T: paramJson.T,
        });
        params.push(param);
      }
      const correlationGroup = new CorrelationGroup({
        groupFlags: groupFlags,
        rotationThetas: rotationThetas,
        params: params,
      });
      intraTileCorrelationGroups.push(correlationGroup);
    }

    this._gltfGpmLocal = new GltfGpmLocal({
      storageType: storageType,
      anchorPointsIndirect: anchorPointsIndirect,
      intraTileCorrelationGroups: intraTileCorrelationGroups,
    });
    this._state = ResourceLoaderState.READY;
    return true;
  }
  this._state = ResourceLoaderState.FAILED;
  return false;
};

/**
 * Unloads the resource.
 * @private
 */
GltfGpmLoader.prototype.unload = function () {
  this._gltfGpmLocal = undefined;
};

export default GltfGpmLoader;
