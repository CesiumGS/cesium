import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
import ImplicitSubtree from "./ImplicitSubtree.js";

export default function Implicit3DTileContent(
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("tile.implicitTileset", tile.implicitTileset);
  //>>includeEnd('debug');

  this._implicitTileset = tile.implicitTileset;
  this._implicitCoordinates = tile.implicitCoordinates;
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._readyPromise = when.defer();

  initialize(this, arrayBuffer, byteOffset);
}

Object.defineProperties(Implicit3DTileContent.prototype, {
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
  // Parse the subtree file
  byteOffset = defaultValue(byteOffset, 0);
  var uint8Array = new Uint8Array(arrayBuffer, byteOffset);
  // TODO: this is going to need a readyPromise...
  var subtree = new ImplicitSubtree(uint8Array, content._implicitTileset);

  var implicitTileset = content._implicitTileset;

  // Parse the tiles inside this immediate subtree
  var parentTile = content._tile.parent;
  var childIndex = content._implicitCoordinates.childIndex;
  var results = implicitTileset.transcodeSubtreeTiles(
    subtree,
    parentTile,
    childIndex
  );

  // Replace the parent's children with the new root tile.
  if (defined(parentTile)) {
    // TODO: Determine which way is the best:
    // 1. replace parentTile.children[index of content._tile] with the new tile
    // 2. replace parentTile.content with a newly constructed content (e.g. B3DM)
    // 3. just keep parent and child like external tilesets do
    // 4. just push the new tile to parent.children
    //parentTile.children.push(results.rootTile);
    //parentTile.children.remove
    //parentTile.children = [results.rootTile];
  } else {
    // If the placeholder tile was the root, keep the placeholder tile
    // and place the new root tile as the only child. This is cleaner than
    // trying to update the placeholder tile in place.
    content._tile.children = [results.rootTile];
  }

  // for each child subtree, make new placeholder tiles
  var childSubtrees = implicitTileset.listChildSubtrees(
    subtree,
    results.bottomRow
  );
  for (var i = 0; i < childSubtrees.length; i++) {
    // TODO: use an object not a pair
    var pair = childSubtrees[i];
    var leafTile = pair[0];
    var childIndex = pair[1];

    var implicitChildTile = implicitTileset.makePlaceholderChildSubtree(
      leafTile,
      childIndex
    );
    leafTile.children.push(implicitChildTile);
  }
}

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
 * always returns <code>false</code> since a tile of this type does not have any features.
 */
Implicit3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
 * always returns <code>undefined</code> since a tile of this type does not have any features.
 */
Implicit3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
};

Implicit3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color
) {};

Implicit3DTileContent.prototype.applyStyle = function (style) {};

Implicit3DTileContent.prototype.update = function (tileset, frameState) {};

Implicit3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Implicit3DTileContent.prototype.destroy = function () {
  return destroyObject(this);
};
