import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import getMagic from "../Core/getMagic.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";

/**
 * Represents the contents of a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Composite|Composite}
 * tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Composite3DTileContent
 * @constructor
 *
 * @private
 */
function Composite3DTileContent(
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset,
  factory
) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._contents = [];
  this._readyPromise = when.defer();
  this._groupMetadata = undefined;

  initialize(this, arrayBuffer, byteOffset, factory);
}

Object.defineProperties(Composite3DTileContent.prototype, {
  featurePropertiesDirty: {
    get: function () {
      const contents = this._contents;
      const length = contents.length;
      for (let i = 0; i < length; ++i) {
        if (contents[i].featurePropertiesDirty) {
          return true;
        }
      }

      return false;
    },
    set: function (value) {
      const contents = this._contents;
      const length = contents.length;
      for (let i = 0; i < length; ++i) {
        contents[i].featurePropertiesDirty = value;
      }
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>featuresLength</code> for a tile in the composite.
   * @memberof Composite3DTileContent.prototype
   */
  featuresLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>pointsLength</code> for a tile in the composite.
   * @memberof Composite3DTileContent.prototype
   */
  pointsLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>trianglesLength</code> for a tile in the composite.
   * @memberof Composite3DTileContent.prototype
   */
  trianglesLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>geometryByteLength</code> for a tile in the composite.
   * @memberof Composite3DTileContent.prototype
   */
  geometryByteLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.   <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>texturesByteLength</code> for a tile in the composite.
   * @memberof Composite3DTileContent.prototype
   */
  texturesByteLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>batchTableByteLength</code> for a tile in the composite.
   * @memberof Composite3DTileContent.prototype
   */
  batchTableByteLength: {
    get: function () {
      return 0;
    },
  },

  innerContents: {
    get: function () {
      return this._contents;
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

  /**
   * Part of the {@link Cesium3DTileContent} interface. <code>Composite3DTileContent</code>
   * always returns <code>undefined</code>.  Instead call <code>batchTable</code> for a tile in the composite.
   * @memberof Composite3DTileContent.prototype
   */
  batchTable: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface. <code>Composite3DTileContent</code>
   * both stores the group metadata and propagates the group metadata to all of its children.
   * @memberof Composite3DTileContent.prototype
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  groupMetadata: {
    get: function () {
      return this._groupMetadata;
    },
    set: function (value) {
      this._groupMetadata = value;
      const contents = this._contents;
      const length = contents.length;
      for (let i = 0; i < length; ++i) {
        contents[i].groupMetadata = value;
      }
    },
  },
});

const sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

function initialize(content, arrayBuffer, byteOffset, factory) {
  byteOffset = defaultValue(byteOffset, 0);

  const uint8Array = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  byteOffset += sizeOfUint32; // Skip magic

  const version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      `Only Composite Tile version 1 is supported. Version ${version} is not.`
    );
  }
  byteOffset += sizeOfUint32;

  // Skip byteLength
  byteOffset += sizeOfUint32;

  const tilesLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  const contentPromises = [];

  for (let i = 0; i < tilesLength; ++i) {
    const tileType = getMagic(uint8Array, byteOffset);

    // Tile byte length is stored after magic and version
    const tileByteLength = view.getUint32(byteOffset + sizeOfUint32 * 2, true);

    const contentFactory = factory[tileType];

    if (defined(contentFactory)) {
      const innerContent = contentFactory(
        content._tileset,
        content._tile,
        content._resource,
        arrayBuffer,
        byteOffset
      );
      content._contents.push(innerContent);
      contentPromises.push(innerContent.readyPromise);
    } else {
      throw new RuntimeError(
        `Unknown tile content type, ${tileType}, inside Composite tile`
      );
    }

    byteOffset += tileByteLength;
  }

  when
    .all(contentPromises)
    .then(function () {
      content._readyPromise.resolve(content);
    })
    .otherwise(function (error) {
      content._readyPromise.reject(error);
    });
}

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
 * always returns <code>false</code>.  Instead call <code>hasProperty</code> for a tile in the composite.
 */
Composite3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
 * always returns <code>undefined</code>.  Instead call <code>getFeature</code> for a tile in the composite.
 */
Composite3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
};

Composite3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color
) {
  const contents = this._contents;
  const length = contents.length;
  for (let i = 0; i < length; ++i) {
    contents[i].applyDebugSettings(enabled, color);
  }
};

Composite3DTileContent.prototype.applyStyle = function (style) {
  const contents = this._contents;
  const length = contents.length;
  for (let i = 0; i < length; ++i) {
    contents[i].applyStyle(style);
  }
};

Composite3DTileContent.prototype.update = function (tileset, frameState) {
  const contents = this._contents;
  const length = contents.length;
  for (let i = 0; i < length; ++i) {
    contents[i].update(tileset, frameState);
  }
};

Composite3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Composite3DTileContent.prototype.destroy = function () {
  const contents = this._contents;
  const length = contents.length;
  for (let i = 0; i < length; ++i) {
    contents[i].destroy();
  }
  return destroyObject(this);
};
export default Composite3DTileContent;
