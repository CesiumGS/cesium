import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * Represents empty content for tiles in a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset that
 * do not have content, e.g., because they are used to optimize hierarchical culling.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @implements Cesium3DTileContent
 * @private
 */
class Empty3DTileContent {
  constructor(tileset, tile) {
    this._tileset = tileset;
    this._tile = tile;

    this.featurePropertiesDirty = false;
  }

  get featuresLength() {
    return 0;
  }

  get pointsLength() {
    return 0;
  }

  get trianglesLength() {
    return 0;
  }

  get geometryByteLength() {
    return 0;
  }

  get texturesByteLength() {
    return 0;
  }

  get batchTableByteLength() {
    return 0;
  }

  get innerContents() {
    return undefined;
  }

  /**
   * Returns true when the tile's content is ready to render; otherwise false
   *
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  get ready() {
    return true;
  }

  get tileset() {
    return this._tileset;
  }

  get tile() {
    return this._tile;
  }

  get url() {
    return undefined;
  }

  get metadata() {
    return undefined;
  }

  set metadata(value) {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError("Empty3DTileContent cannot have content metadata");
    //>>includeEnd('debug');
  }

  get batchTable() {
    return undefined;
  }

  get group() {
    return undefined;
  }

  set group(value) {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError("Empty3DTileContent cannot have group metadata");
    //>>includeEnd('debug');
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Empty3DTileContent</code>
   * always returns <code>false</code> since a tile of this type does not have any features.
   */
  hasProperty(batchId, name) {
    return false;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Empty3DTileContent</code>
   * always returns <code>undefined</code> since a tile of this type does not have any features.
   */
  getFeature(batchId) {
    return undefined;
  }

  applyDebugSettings(enabled, color) {}
  applyStyle(style) {}
  update(tileset, frameState) {}

  pick(ray, frameState, result) {
    return undefined;
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    return destroyObject(this);
  }
}

export default Empty3DTileContent;
