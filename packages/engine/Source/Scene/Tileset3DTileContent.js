import destroyObject from "../Core/destroyObject.js";

/**
 * Represents content for a tile in a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset whose
 * content points to another 3D Tiles tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Tileset3DTileContent
 * @constructor
 *
 * @private
 */
function Tileset3DTileContent(tileset, tile, resource) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;

  this.featurePropertiesDirty = false;

  this._metadata = undefined;
  this._group = undefined;

  this._ready = false;
}

Object.defineProperties(Tileset3DTileContent.prototype, {
  featuresLength: {
    get: function () {
      return 0;
    },
  },

  pointsLength: {
    get: function () {
      return 0;
    },
  },

  trianglesLength: {
    get: function () {
      return 0;
    },
  },

  geometryByteLength: {
    get: function () {
      return 0;
    },
  },

  texturesByteLength: {
    get: function () {
      return 0;
    },
  },

  batchTableByteLength: {
    get: function () {
      return 0;
    },
  },

  innerContents: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Returns true when the tile's content is ready to render; otherwise false
   *
   * @memberof Tileset3DTileContent.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  tileset: {
    get: function () {
      return this._tileset;
    },
  },

  tile: {
    get: function () {
      return this._tile;
    },
  },

  url: {
    get: function () {
      return this._resource.getUrlComponent(true);
    },
  },

  batchTable: {
    get: function () {
      return undefined;
    },
  },

  metadata: {
    get: function () {
      return this._metadata;
    },
    set: function (value) {
      this._metadata = value;
    },
  },

  group: {
    get: function () {
      return this._group;
    },
    set: function (value) {
      this._group = value;
    },
  },
});

/**
 * Creates an instance of Tileset3DTileContent from a parsed JSON object
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 * @param {Resource} resource
 * @param {object} json
 * @returns {Tileset3DTileContent}
 */
Tileset3DTileContent.fromJson = function (tileset, tile, resource, json) {
  const content = new Tileset3DTileContent(tileset, tile, resource);
  content._tileset.loadTileset(content._resource, json, content._tile);
  content._ready = true;

  return content;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
 * always returns <code>false</code> since a tile of this type does not have any features.
 */
Tileset3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
 * always returns <code>undefined</code> since a tile of this type does not have any features.
 */
Tileset3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
};

Tileset3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color
) {};

Tileset3DTileContent.prototype.applyStyle = function (style) {};

Tileset3DTileContent.prototype.update = function (tileset, frameState) {};

Tileset3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Tileset3DTileContent.prototype.destroy = function () {
  return destroyObject(this);
};
export default Tileset3DTileContent;
