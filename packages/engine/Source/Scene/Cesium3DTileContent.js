// @ts-check

import DeveloperError from "../Core/DeveloperError.js";

/** @import Cartesian3 from "../Core/Cartesian3.js"; */
/** @import Cesium3DContentGroup from "./Cesium3DContentGroup.js"; */
/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js"; */
/** @import Cesium3DTileFeature from "./Cesium3DTileFeature.js"; */
/** @import Cesium3DTileStyle from "./Cesium3DTileStyle.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import Color from "../Core/Color.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import ImplicitMetadataView from "./ImplicitMetadataView.js"; */
/** @import Ray from "../Core/Ray.js"; */

/**
 * The content of a tile in a {@link Cesium3DTileset}.
 * <p>
 * Derived classes of this interface provide access to individual features in the tile.
 * Access derived objects through {@link Cesium3DTile#content}.
 * </p>
 * <p>
 * This type describes an interface and is not intended to be instantiated directly.
 * </p>
 *
 * @interface
 */
class Cesium3DTileContent {
  constructor() {
    /**
     * Gets or sets if any feature's property changed.  Used to
     * optimized applying a style when a feature's property changed.
     * <p>
     * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
     * not part of the public Cesium API.
     * </p>
     *
     * @type {boolean}
     *
     * @private
     */
    this.featurePropertiesDirty = false;
  }

  /**
   * Gets the number of features in the tile.
   *
   *
   * @type {number}
   * @readonly
   */
  featuresLength;

  /**
   * Gets the number of points in the tile.
   * <p>
   * Only applicable for tiles with Point Cloud content. This is different than {@link Cesium3DTileContent#featuresLength} which
   * equals the number of groups of points as distinguished by the <code>BATCH_ID</code> feature table semantic.
   * </p>
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/PointCloud#batched-points}
   *
   *
   * @type {number}
   * @readonly
   */
  pointsLength;

  /**
   * Gets the number of triangles in the tile.
   *
   *
   * @type {number}
   * @readonly
   */
  trianglesLength;

  /**
   * Gets the tile's geometry memory in bytes.
   *
   *
   * @type {number}
   * @readonly
   */
  geometryByteLength;

  /**
   * Gets the tile's texture memory in bytes.
   *
   *
   * @type {number}
   * @readonly
   */
  texturesByteLength;

  /**
   * Gets the amount of memory used by the batch table textures and any binary
   * metadata properties not accounted for in geometryByteLength or
   * texturesByteLength
   *
   *
   * @type {number}
   * @readonly
   */
  batchTableByteLength;

  /**
   * Gets the array of {@link Cesium3DTileContent} objects for contents that contain other contents, such as composite tiles. The inner contents may in turn have inner contents, such as a composite tile that contains a composite tile.
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Composite|Composite specification}
   *
   *
   * @type {Array<*>}
   * @readonly
   */
  innerContents;

  /**
   * Returns true when the tile's content is ready to render; otherwise false
   *
   *
   * @type {boolean}
   * @readonly
   */
  ready;

  /**
   * Gets the tileset for this tile.
   *
   *
   * @type {Cesium3DTileset}
   * @readonly
   */
  tileset;

  /**
   * Gets the tile containing this content.
   *
   *
   * @type {Cesium3DTile}
   * @readonly
   */
  tile;

  /**
   * Gets the url of the tile's content.
   *
   * @type {string}
   * @readonly
   */
  url;

  /**
   * Gets the batch table for this content.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @type {Cesium3DTileBatchTable}
   * @readonly
   *
   * @private
   */
  batchTable;

  /**
   * Gets the metadata for this content, whether it is available explicitly or via
   * implicit tiling. If there is no metadata, this property should be undefined.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @type {ImplicitMetadataView|undefined}
   *
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  metadata;

  /**
   * Gets the group for this content if the content has metadata (3D Tiles 1.1) or
   * if it uses the <code>3DTILES_metadata</code> extension. If neither are present,
   * this property should be undefined.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @type {Cesium3DContentGroup|undefined}
   *
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  group;

  /**
   * Returns whether the feature has this property.
   *
   * @param {number} batchId The batchId for the feature.
   * @param {string} name The case-sensitive name of the property.
   * @returns {boolean} <code>true</code> if the feature has this property; otherwise, <code>false</code>.
   */
  hasProperty(batchId, name) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Returns the {@link Cesium3DTileFeature} object for the feature with the
   * given <code>batchId</code>.  This object is used to get and modify the
   * feature's properties.
   * <p>
   * Features in a tile are ordered by <code>batchId</code>, an index used to retrieve their metadata from the batch table.
   * </p>
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/BatchTable}.
   *
   * @param {number} batchId The batchId for the feature.
   * @returns {Cesium3DTileFeature} The corresponding {@link Cesium3DTileFeature} object.
   *
   * @exception {DeveloperError} batchId must be between zero and {@link Cesium3DTileContent#featuresLength} - 1.
   */
  getFeature(batchId) {
    DeveloperError.throwInstantiationError();
  }

  /**
       * Called when {@link Cesium3DTileset#debugColorizeTiles} changes.
       * <p>
       * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
       * not part of the public Cesium API.
       * </p>
       *
       * @param {boolean} enabled Whether to enable or disable debug settings.
       * @param {Color} color Debug color.
       * @returns {Cesium3DTileFeature} The corresponding {@link Cesium3DTileFeature} object.

       * @private
       */
  applyDebugSettings(enabled, color) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Apply a style to the content
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @param {Cesium3DTileStyle} style The style.
   * @returns {void}
   *
   * @private
   */
  applyStyle(style) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Called by the tile during tileset traversal to get the draw commands needed to render this content.
   * When the tile's content is in the PROCESSING state, this creates WebGL resources to ultimately
   * move to the READY state.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @param {Cesium3DTileset} tileset The tileset containing this tile.
   * @param {FrameState} frameState The frame state.
   * @returns {void}
   *
   * @private
   */
  update(tileset, frameState) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Find an intersection between a ray and the tile content surface that was rendered. The ray must be given in world coordinates.
   *
   * @param {Ray} ray The ray to test for intersection.
   * @param {FrameState} frameState The frame state.
   * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
   * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
   *
   * @private
   */
  pick(ray, frameState, result) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Returns true if this object was destroyed; otherwise, false.
   * <br /><br />
   * If this object was destroyed, it should not be used; calling any function other than
   * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   *
   * @see Cesium3DTileContent#destroy
   *
   * @private
   */
  isDestroyed() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
   * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
   * <br /><br />
   * Once an object is destroyed, it should not be used; calling any function other than
   * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
   * assign the return value (<code>undefined</code>) to the object as done in the example.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
   *
   * @example
   * content = content && content.destroy();
   *
   * @see Cesium3DTileContent#isDestroyed
   *
   * @returns {void}
   *
   * @private
   */
  destroy() {
    DeveloperError.throwInstantiationError();
  }
}

export default Cesium3DTileContent;
