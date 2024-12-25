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
 * @alias Empty3DTileContent
 * @constructor
 *
 * @private
 */
function Empty3DTileContent(tileset, tile) {
  this._tileset = tileset;
  this._tile = tile;

  this.featurePropertiesDirty = false;
}

Object.defineProperties(Empty3DTileContent.prototype, {
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
   * @memberof Empty3DTileContent.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  ready: {
    get: function () {
      return true;
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
      return undefined;
    },
  },

  metadata: {
    get: function () {
      return undefined;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError(
        "Empty3DTileContent cannot have content metadata",
      );
      //>>includeEnd('debug');
    },
  },

  batchTable: {
    get: function () {
      return undefined;
    },
  },

  group: {
    get: function () {
      return undefined;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError("Empty3DTileContent cannot have group metadata");
      //>>includeEnd('debug');
    },
  },
});

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Empty3DTileContent</code>
 * always returns <code>false</code> since a tile of this type does not have any features.
 */
Empty3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Empty3DTileContent</code>
 * always returns <code>undefined</code> since a tile of this type does not have any features.
 */
Empty3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
};

Empty3DTileContent.prototype.applyDebugSettings = function (enabled, color) {};

Empty3DTileContent.prototype.applyStyle = function (style) {};

Empty3DTileContent.prototype.update = function (tileset, frameState) {};

Empty3DTileContent.prototype.pick = function (ray, frameState, result) {
  return undefined;
};

Empty3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Empty3DTileContent.prototype.destroy = function () {
  return destroyObject(this);
};
export default Empty3DTileContent;
