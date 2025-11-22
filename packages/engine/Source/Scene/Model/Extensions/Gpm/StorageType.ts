/**
 * An enum of storage types for covariance information.
 *
 * This reflects the `gltfGpmLocal.storageType` definition of the
 * {@link https://nsgreg.nga.mil/csmwg.jsp|NGA_gpm_local} glTF extension.
 *
 * @enum {string}
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
const StorageType = {
  /**
   * Store the full error covariance of the anchor points, to include the cross-covariance terms
   *
   * @type {string}
   * @constant
   */
  Direct: "Direct",

  /**
   * A full covariance matrix is stored for each of the anchor points. However, in this case the
   * cross-covariance terms are not directly stored, but can be computed by a set of spatial
   * correlation function parameters which are stored in the metadata.
   *
   * @type {string}
   * @constant
   */
  Indirect: "Indirect",
};

export default Object.freeze(StorageType);
