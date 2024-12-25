import Cartesian3 from "../../../../Core/Cartesian3.js";
import Check from "../../../../Core/Check.js";
import Matrix3 from "../../../../Core/Matrix3.js";
import RuntimeError from "../../../../Core/RuntimeError.js";
import AnchorPointDirect from "./AnchorPointDirect.js";
import AnchorPointIndirect from "./AnchorPointIndirect.js";
import CorrelationGroup from "./CorrelationGroup.js";
import GltfGpmLocal from "./GltfGpmLocal.js";
import Spdcf from "./Spdcf.js";
import StorageType from "./StorageType.js";

/**
 * Loads glTF NGA_gpm_local from the root of a glTF object
 *
 * @alias GltfGpmLoader
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {string} [options.extension] The <code>NGA_gpm_local</code> extension object.
 *
 * @private
 */
function GltfGpmLoader() {}

/**
 * Creates a Matrix3 that describes a covariance matrix (which is
 * symmetric) from the array containing the upper triangle, in
 * column-major order.
 *
 * @param {number[]} array The input array
 * @returns {Matrix3} The Matrix3
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
    array[5],
  );
  return covarianceMatrix;
}

/**
 * Creates an `AnchorPointDirect` from the given JSON representation
 *
 * @param {object} anchorPointDirectJson The input JSON
 * @returns {AnchorPointDirect} The direct anchor point
 */
function createAnchorPointDirect(anchorPointDirectJson) {
  const position = Cartesian3.fromArray(
    anchorPointDirectJson.position,
    0,
    new Cartesian3(),
  );
  const adjustmentParams = Cartesian3.fromArray(
    anchorPointDirectJson.adjustmentParams,
    0,
    new Cartesian3(),
  );
  const anchorPointDirect = new AnchorPointDirect({
    position: position,
    adjustmentParams: adjustmentParams,
  });
  return anchorPointDirect;
}

/**
 * Creates an `AnchorPointIndirect` from the given JSON representation
 *
 * @param {object} anchorPointIndirectJson The input JSON
 * @returns {AnchorPointIndirect} The indirect anchor point
 */
function createAnchorPointIndirect(anchorPointIndirectJson) {
  const position = Cartesian3.fromArray(
    anchorPointIndirectJson.position,
    0,
    new Cartesian3(),
  );
  const adjustmentParams = Cartesian3.fromArray(
    anchorPointIndirectJson.adjustmentParams,
    0,
    new Cartesian3(),
  );
  const covarianceMatrix = createCovarianceMatrixFromUpperTriangle(
    anchorPointIndirectJson.covarianceMatrix,
  );
  const anchorPointIndirect = new AnchorPointIndirect({
    position: position,
    adjustmentParams: adjustmentParams,
    covarianceMatrix: covarianceMatrix,
  });
  return anchorPointIndirect;
}

/**
 * Creates a `CorrelationGroup` from the given JSON representation
 *
 * @param {object} correlationGroupJson The input JSON
 * @returns {CorrelationGroup} The correlation group
 */
function createCorrelationGroup(correlationGroupJson) {
  const groupFlags = correlationGroupJson.groupFlags;
  const rotationThetas = Cartesian3.fromArray(
    correlationGroupJson.rotationThetas,
    0,
    new Cartesian3(),
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
  return correlationGroup;
}

/**
 * Loads the GPM data from the given JSON that was found as the
 * `NGA_gpm_local` extension object in the root of the glTF.
 *
 * @param {object} gltfGpmLocalJson The extension object
 * @returns {GltfGpmLocal} The parsed object
 * @throws RuntimeError When the given object contains invalid storage types.
 * @private
 */
GltfGpmLoader.load = function (gltfGpmLocalJson) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("gltfGpmLocalJson", gltfGpmLocalJson);
  //>>includeEnd('debug');

  const storageType = gltfGpmLocalJson.storageType;
  if (storageType === StorageType.Direct) {
    return GltfGpmLoader.loadDirect(gltfGpmLocalJson);
  }
  if (storageType === StorageType.Indirect) {
    return GltfGpmLoader.loadIndirect(gltfGpmLocalJson);
  }
  throw new RuntimeError(
    `Invalid storage type in NGA_gpm_local - expected 'Direct' or 'Indirect', but found ${storageType}`,
  );
};

/**
 * Loads the GPM data from the given JSON that was found as the
 * `NGA_gpm_local` extension object in the root of the glTF,
 * assuming that the `storageType` of the given object is
 * `StorageType.Direct`.
 *
 * @param {object} gltfGpmLocalJson The extension object
 * @returns {GltfGpmLocal} The parsed object
 * @private
 */
GltfGpmLoader.loadDirect = function (gltfGpmLocalJson) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("gltfGpmLocalJson", gltfGpmLocalJson);
  Check.typeOf.object(
    "gltfGpmLocalJson.anchorPointsDirect",
    gltfGpmLocalJson.anchorPointsDirect,
  );
  Check.typeOf.object(
    "gltfGpmLocalJson.covarianceDirectUpperTriangle",
    gltfGpmLocalJson.covarianceDirectUpperTriangle,
  );
  //>>includeEnd('debug');

  const anchorPointsDirect = [];
  const anchorPointsDirectJson = gltfGpmLocalJson.anchorPointsDirect;
  for (const anchorPointDirectJson of anchorPointsDirectJson) {
    const anchorPointDirect = createAnchorPointDirect(anchorPointDirectJson);
    anchorPointsDirect.push(anchorPointDirect);
  }
  const covarianceDirect = createCovarianceMatrixFromUpperTriangle(
    gltfGpmLocalJson.covarianceDirectUpperTriangle,
  );

  const gltfGpmLocal = new GltfGpmLocal({
    storageType: StorageType.Direct,
    anchorPointsDirect: anchorPointsDirect,
    covarianceDirect: covarianceDirect,
  });
  return gltfGpmLocal;
};

/**
 * Loads the GPM data from the given JSON that was found as the
 * `NGA_gpm_local` extension object in the root of the glTF,
 * assuming that the `storageType` of the given object is
 * `StorageType.Indirect`.
 *
 * @param {object} gltfGpmLocalJson The extension object
 * @returns {GltfGpmLocal} The parsed object
 * @private
 */
GltfGpmLoader.loadIndirect = function (gltfGpmLocalJson) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("gltfGpmLocalJson", gltfGpmLocalJson);
  Check.typeOf.object(
    "gltfGpmLocalJson.anchorPointsIndirect",
    gltfGpmLocalJson.anchorPointsIndirect,
  );
  Check.typeOf.object(
    "gltfGpmLocalJson.intraTileCorrelationGroups",
    gltfGpmLocalJson.intraTileCorrelationGroups,
  );
  //>>includeEnd('debug');

  const anchorPointsIndirect = [];
  const anchorPointsIndirectJson = gltfGpmLocalJson.anchorPointsIndirect;
  for (const anchorPointIndirectJson of anchorPointsIndirectJson) {
    const anchorPointIndirect = createAnchorPointIndirect(
      anchorPointIndirectJson,
    );
    anchorPointsIndirect.push(anchorPointIndirect);
  }

  const intraTileCorrelationGroupsJson =
    gltfGpmLocalJson.intraTileCorrelationGroups;
  const intraTileCorrelationGroups = [];

  for (const correlationGroupJson of intraTileCorrelationGroupsJson) {
    const correlationGroup = createCorrelationGroup(correlationGroupJson);
    intraTileCorrelationGroups.push(correlationGroup);
  }

  const gltfGpmLocal = new GltfGpmLocal({
    storageType: StorageType.Indirect,
    anchorPointsIndirect: anchorPointsIndirect,
    intraTileCorrelationGroups: intraTileCorrelationGroups,
  });
  return gltfGpmLocal;
};

export default GltfGpmLoader;
