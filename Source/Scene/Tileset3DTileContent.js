import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";

/**
 * Represents content for a tile in a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification|3D Tiles} tileset whose
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
function Tileset3DTileContent(
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._readyPromise = when.defer();

  this.featurePropertiesDirty = false;

  initialize(this, arrayBuffer, byteOffset);
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

  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
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
});

function initialize(content, arrayBuffer, byteOffset) {
  byteOffset = defaultValue(byteOffset, 0);
  var uint8Array = new Uint8Array(arrayBuffer);
  var jsonString = getStringFromTypedArray(uint8Array, byteOffset);
  var tilesetJson;

  try {
    tilesetJson = JSON.parse(jsonString);
  } catch (error) {
    content._readyPromise.reject(new RuntimeError("Invalid tile content."));
    return;
  }

  content._tileset.loadTileset(content._resource, tilesetJson, content._tile);
  content._readyPromise.resolve(content);
}

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
