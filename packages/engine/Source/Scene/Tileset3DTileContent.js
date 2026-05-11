import destroyObject from "../Core/destroyObject.js";

/**
 * Represents content for a tile in a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset whose
 * content points to another 3D Tiles tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @implements Cesium3DTileContent
 * @private
 */
class Tileset3DTileContent {
  constructor(tileset, tile, resource) {
    this._tileset = tileset;
    this._tile = tile;
    this._resource = resource;

    this.featurePropertiesDirty = false;

    this._metadata = undefined;
    this._group = undefined;

    this._ready = false;
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
    return this._ready;
  }

  get tileset() {
    return this._tileset;
  }

  get tile() {
    return this._tile;
  }

  get url() {
    return this._resource.getUrlComponent(true);
  }

  get batchTable() {
    return undefined;
  }

  get metadata() {
    return this._metadata;
  }

  set metadata(value) {
    this._metadata = value;
  }

  get group() {
    return this._group;
  }

  set group(value) {
    this._group = value;
  }

  /**
   * Creates an instance of Tileset3DTileContent from a parsed JSON object
   * @param {Cesium3DTileset} tileset
   * @param {Cesium3DTile} tile
   * @param {Resource} resource
   * @param {object} json
   * @returns {Tileset3DTileContent}
   */
  static fromJson(tileset, tile, resource, json) {
    const content = new Tileset3DTileContent(tileset, tile, resource);
    content._tileset.loadTileset(content._resource, json, content._tile);
    content._ready = true;

    return content;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
   * always returns <code>false</code> since a tile of this type does not have any features.
   */
  hasProperty(batchId, name) {
    return false;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
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

export default Tileset3DTileContent;
