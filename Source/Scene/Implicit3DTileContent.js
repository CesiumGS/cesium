import Check from "../Core/Check.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Rectangle from "../Core/Rectangle.js";
import when from "../ThirdParty/when.js";
import Cesium3DTile from "./Cesium3DTile.js";
import ImplicitSubtree from "./ImplicitSubtree.js";
import ImplicitTileCoordinates from "./ImplicitTileCoordinates.js";
import ImplicitTileset from "./ImplicitTileset.js";
import TileBoundingRegion from "./TileBoundingRegion.js";

/**
 * A specialized {@link Cesium3DTileContent} that lazily evaluates an implicit
 * tileset. It is somewhat similar in operation to a
 * {@link Tileset3DTileContent} in that once the content is constructed, it
 * updates the tileset tree with more tiles. However, unlike external tilesets,
 * child subtrees are represented as additional placeholder nodes with
 * Implicit3DTileContent.
 *
 * @private
 * @param {Cesium3DTileset} tileset The tileset this content belongs to
 * @param {Cesium3DTile} tile The tile this content belongs to.
 * @param {Resource} resource The resource for the tileset
 * @param {ArrayBuffer} arrayBuffer The array buffer that stores the content payload
 * @param {Number} byteOffset The offset into the array buffer
 */
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

  // Parse the tiles inside this immediate subtree
  var placeholderTile = content._tile;
  var parentTile = placeholderTile.parent;
  var childIndex = content._implicitCoordinates.childIndex;
  var results = transcodeSubtreeTiles(content, subtree, parentTile, childIndex);

  // Replace the parent's children with the new root tile.
  if (defined(parentTile)) {
    // TODO: Which implementation works best?
    // 1. replace parentTile.children[index of content._tile] with the new tile
    // 2. replace parentTile.content with a newly constructed content (e.g. B3DM)
    // 3. just keep parent and child like external tilesets do
    // 4. just push the new tile to parent.children

    // Replace the placeholder tile with the child tile
    // This is method 1
    var index = parentTile.children.indexOf(placeholderTile);
    parentTile.children[index] = results.rootTile;
  } else {
    // If the placeholder tile was the root, keep the placeholder tile
    // and place the new root tile as the only child. This is cleaner than
    // trying to update the placeholder tile in place.
    content._tile.children = [results.rootTile];
  }

  // for each child subtree, make new placeholder tiles
  var childSubtrees = listChildSubtrees(content, subtree, results.bottomRow);
  for (var i = 0; i < childSubtrees.length; i++) {
    // TODO: use an object not a pair
    var pair = childSubtrees[i];
    var leafTile = pair[0];
    var childIndex = pair[1];

    var implicitChildTile = makePlaceholderChildSubtree(
      content,
      leafTile,
      childIndex
    );
    leafTile.children.push(implicitChildTile);
  }
}

/**
 * Create a placeholder tile whose content will resolve to an
 * Implicit3DTileContent. This also creates the ImplicitTileset and attaches
 * it to the newly created Cesium3DTile since it is not needed until the content
 * is fetched.
 *
 * @private
 * @param {Cesium3DTileset} tileset The tileset this implicit tileset belongs to. Needed to construct the Cesium3DTile
 * @param {Resource} baseResource The base resource. Needed to construct the Cesium3DTile.
 * @param {Object} tileHeader The JSON for the Cesium3DTile
 * @param {Cesium3DTile|undefined} parentTile The parent of the new Cesum3DTile (if defined)
 * @return {Cesium3DTile} A newly created tile that serves as a lazy placeholder for the implicit tileset.
 */
Implicit3DTileContent.makeRootPlaceholderTile = function (
  tileset,
  baseResource,
  tileHeader,
  parentTile
) {
  var implicitTileset = new ImplicitTileset(baseResource, tileHeader);
  var rootCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: implicitTileset.subdivisionScheme,
    level: 0,
    x: 0,
    y: 0,
    // The constructor will only use this for octrees.
    z: 0,
  });

  var contentJson = {
    content: {
      uri: implicitTileset.subtreeUriTemplate.getDerivedResource({
        templateValues: rootCoordinates.getTemplateValues(),
      }).url,
    },
  };

  var tileJson = combine(contentJson, tileHeader);
  var tile = new Cesium3DTile(tileset, baseResource, tileJson, parentTile);
  tile.implicitTileset = implicitTileset;
  tile.implicitCoordinates = rootCoordinates;
  return tile;
};

function listChildSubtrees(content, subtree, bottomRow) {
  var results = [];
  var branchingFactor = content._implicitTileset.branchingFactor;
  for (var i = 0; i < bottomRow.length; i++) {
    var leafTile = (bottomRow = bottomRow[i]);
    if (!defined(leafTile)) {
      continue;
    }

    for (var j = 0; j < branchingFactor; j++) {
      var index = i * branchingFactor + j;
      if (subtree.getChildSubtreeAvailabilityBit(index)) {
        results.push([leafTile, j]);
      }
    }
  }
  return results;
}

function transcodeSubtreeTiles(content, subtree, parentOfRootTile, childIndex) {
  var rootBitIndex = 0;

  //>>includeStart('debug', pragmas.debug);
  if (!subtree.getTileAvailabilityBit(rootBitIndex)) {
    throw new DeveloperError("A subtree must have at least 1 available tile");
  }
  //>>includeEnd('debug');

  // TODO: Consider treating the root tile differently so we don't
  var rootTile = deriveChildTile(
    content,
    subtree,
    parentOfRootTile,
    childIndex,
    rootBitIndex
  );

  // Sliding window over the levels of the tree.
  // Each row is branchingFactor * length of previous row
  // Tiles within a row are ordered by Morton index.
  var parentRow = [rootTile];
  var currentRow = [];

  var implicitTileset = content._implicitTileset;
  for (var level = 1; level < implicitTileset.subtreeLevels; level++) {
    var levelOffset = subtree.getLevelOffset(level);
    var numberOfChildren = implicitTileset.branchingFactor * parentRow.length;
    for (
      var childMortonIndex = 0;
      childMortonIndex < numberOfChildren;
      childMortonIndex++
    ) {
      var childBitIndex = levelOffset + childMortonIndex;

      if (!subtree.getTileAvailabilityBit(childBitIndex)) {
        currentRow.push(undefined);
        continue;
      }

      var parentMortonIndex = subtree.getParentMortonIndex(childMortonIndex);
      var parentTile = parentRow[parentMortonIndex];
      var childIndex = childMortonIndex % implicitTileset.branchingFactor;
      var childTile = deriveChildTile(
        content,
        subtree,
        parentTile,
        childIndex,
        childBitIndex
      );
      parentTile.children.push(childTile);
      currentRow.push(childTile);
    }

    parentRow = currentRow;
    currentRow = [];
  }

  return {
    rootTile: rootTile,
    // At the end of the last loop, bottomRow was moved to parentRow
    bottomRow: parentRow,
  };
}

/**
 * Given a parent tile and information about which child to create, derive
 * the properties of the child tile implicitly.
 *
 * This creates a real tile for rendering, not a placeholder tile like some of
 * the other methods of ImplicitTileset.
 *
 * @param {Implicit3DTileContent} implicitContent The implicit content
 * @param {ImplicitSubtree} subtree The subtree the child tile belongs to
 * @param {Cesium3DTile|undefined} parentTile The parent of the new child tile
 * @param {Number} childIndex The index of the child within the parentTile.children array.
 * @param {Number} childBitIndex The index of the child tile within the tile's availability information.
 * @return {Cesium3DTile} the new child tile.
 */
function deriveChildTile(
  implicitContent,
  subtree,
  parentTile,
  childIndex,
  childBitIndex
) {
  var implicitTileset = implicitContent._implicitTileset;
  var implicitCoordinates;
  if (!defined(parentTile) || !defined(parentTile.implicitCoordinates)) {
    implicitCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitTileset.subdivisionScheme,
      level: 0,
      x: 0,
      y: 0,
      // The constructor will only use this for octrees.
      z: 0,
    });
  } else {
    implicitCoordinates = parentTile.implicitCoordinates.deriveChildCoordinates(
      childIndex
    );
  }

  var contentJson;
  if (subtree.getContentAvailabilityBit(childBitIndex)) {
    contentJson = {
      uri: implicitTileset.contentUriTemplate.getDerivedResource({
        templateValues: implicitCoordinates.getTemplateValues(),
      }).url,
    };
  }

  var boundingVolume = deriveBoundingVolume(
    implicitTileset,
    implicitCoordinates
  );
  var tileJson = {
    boundingVolume: boundingVolume,
    // geometricError / 2^level
    geometricError:
      implicitTileset.geometricError / (1 << implicitCoordinates.level),
    refine: implicitTileset.refine,
    content: contentJson,
  };

  var childTile = new Cesium3DTile(
    implicitContent._tileset,
    implicitTileset.baseResource,
    tileJson,
    parentTile
  );
  childTile.implicitCoordinates = implicitCoordinates;
  return childTile;
}

/**
 * Given the coordinates of a tile, derive its bounding volume from the root.
 * @private
 * @param {ImplicitTileset} implicitTileset The implicit tileset struct which holds the root bounding volume
 * @param {ImplicitTileCoordinates} implicitCoordinates The coordinates of the child tile
 * @return {Object} An object containing the JSON for a bounding volume
 */
function deriveBoundingVolume(implicitTileset, implicitCoordinates) {
  var boundingVolume = implicitTileset.boundingVolume;
  if (defined(boundingVolume.region)) {
    var parameters = boundingVolume.region;
    var rectangle = Rectangle.unpack(parameters);

    var boundingRegion = new TileBoundingRegion({
      rectangle: rectangle,
      minimumHeight: parameters[4],
      maximumHeight: parameters[5],
    });
    var derivedRegion = boundingRegion.deriveVolume(
      implicitCoordinates.level,
      implicitCoordinates.x,
      implicitCoordinates.y,
      implicitCoordinates.z
    );

    var childRegion = new Array(6);
    Rectangle.pack(derivedRegion.rectangle, childRegion);
    childRegion[4] = derivedRegion.minimumHeight;
    childRegion[5] = derivedRegion.maximumHeight;

    return {
      region: childRegion,
    };
  } else {
    // box
    // TODO: Implement TileOrientedBoundingBox.derive
    throw new DeveloperError("Not implemented yet!");
  }
}

/**
 * Create a placeholder 3D Tile whose content will be an Implicit3DTileContent
 * for lazy evaluation of a child subtree.
 * @private
 * @param {Implicit3DTileContent} content The content object.
 * @param {Cesium3DTile} parentTile The parent of the new child subtree.
 * @param {Number} childIndex The index i in the parentTile.children array.
 * @return {Cesium3DTile} The new placeholder tile
 */
function makePlaceholderChildSubtree(content, parentTile, childIndex) {
  var implicitTileset = content._implicitTileset;
  var implicitCoordinates = parentTile.implicitCoordinates.deriveChildCoordinates(
    childIndex
  );

  var boundingVolume = deriveBoundingVolume(
    implicitTileset,
    implicitCoordinates
  );
  var tileJson = {
    boundingVolume: boundingVolume,
    // geometricError / 2^level
    geometricError:
      implicitTileset.geometricError / (1 << implicitCoordinates.level),
    refine: implicitTileset.refine,
    content: {
      uri: implicitTileset.subtreeUriTemplate.getDerivedResource({
        templateValues: implicitCoordinates.getTemplateValues(),
      }).url,
    },
  };

  var tile = new Cesium3DTile(
    content._tileset,
    implicitTileset.baseResource,
    tileJson,
    parentTile
  );
  tile.implicitTileset = implicitTileset;
  tile.implicitCoordinates = implicitCoordinates;
  return tile;
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
