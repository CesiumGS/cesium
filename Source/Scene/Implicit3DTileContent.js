import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Matrix3 from "../Core/Matrix3.js";
import Rectangle from "../Core/Rectangle.js";
import when from "../ThirdParty/when.js";
import ImplicitSubtree from "./ImplicitSubtree.js";
import ImplicitTileCoordinates from "./ImplicitTileCoordinates.js";
import TileBoundingRegion from "./TileBoundingRegion.js";
import TileOrientedBoundingBox from "./TileOrientedBoundingBox.js";

/**
 * A specialized {@link Cesium3DTileContent} that lazily evaluates an implicit
 * tileset. It is somewhat similar in operation to a
 * {@link Tileset3DTileContent} in that once the content is constructed, it
 * updates the tileset tree with more tiles. However, unlike external tilesets,
 * child subtrees are represented as additional placeholder nodes with
 * Implicit3DTileContent.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Implicit3DTileContent
 * @constructor
 *
 * @param {Cesium3DTileset} tileset The tileset this content belongs to
 * @param {Cesium3DTile} tile The tile this content belongs to.
 * @param {Resource} resource The resource for the tileset
 * @param {ArrayBuffer} arrayBuffer The array buffer that stores the content payload
 * @param {Number} [byteOffset=0] The offset into the array buffer
 * @private
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
  Check.defined("tile.implicitCoordinates", tile.implicitCoordinates);
  //>>includeEnd('debug');

  this._implicitTileset = tile.implicitTileset;
  this._implicitCoordinates = tile.implicitCoordinates;
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._readyPromise = when.defer();

  this.featurePropertiesDirty = false;

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

/**
 * Initialize the implicit content by parsing the subtree resource and setting
 * up a promise chain to expand the immediate subtree.
 *
 * @param {Implicit3DTileContent} content The implicit content
 * @param {ArrayBuffer} arrayBuffer The ArrayBuffer containing a subtree binary
 * @param {Number} [byteOffset=0] The byte offset into the arrayBuffer
 * @private
 */
function initialize(content, arrayBuffer, byteOffset) {
  // Parse the subtree file
  byteOffset = defaultValue(byteOffset, 0);
  var uint8Array = new Uint8Array(arrayBuffer, byteOffset);
  var subtree = new ImplicitSubtree(
    content._resource,
    uint8Array,
    content._implicitTileset
  );
  subtree.readyPromise
    .then(function () {
      expandSubtree(content, subtree);
      content._readyPromise.resolve();
    })
    .otherwise(function (error) {
      content._readyPromise.reject(error);
    });
}

/**
 * Expand a single subtree, modifying the {@link Cesium3DTileset} it belongs
 * to. This also creates placeholder tiles for the child subtrees to be lazily
 * expanded as needed.
 *
 * @param {Implicit3DTileContent} content The content
 * @param {ImplicitSubtree} subtree The parsed subtree
 * @private
 */
function expandSubtree(content, subtree) {
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
    var subtreeLocator = childSubtrees[i];
    var leafTile = subtreeLocator.tile;
    var implicitChildTile = makePlaceholderChildSubtree(
      content,
      leafTile,
      subtreeLocator.childIndex
    );
    leafTile.children.push(implicitChildTile);
  }
}

/**
 * A pair of (tile, childIndex) used for finding child subtrees.
 *
 * @typedef {Object} ChildSubtreeLocator
 * @property {Cesium3DTile} tile One of the tiles in the bottommost row of the subtree.
 * @property {Number} childIndex The morton index of the child tile relative to its parent
 * @private
 */

/**
 * Determine what child subtrees exist and return a list of information
 *
 * @param {Implicit3DTileContent} content The implicit content
 * @param {ImplicitSubtree} subtree The subtree for looking up availability
 * @param {Array<Cesium3DTile|undefined>} bottomRow The bottom row of tiles in a transcoded subtree
 * @returns {ChildSubtreeLocator[]} A list of identifiers for the child subtrees.
 * @private
 */
function listChildSubtrees(content, subtree, bottomRow) {
  var results = [];
  var branchingFactor = content._implicitTileset.branchingFactor;
  for (var i = 0; i < bottomRow.length; i++) {
    var leafTile = bottomRow[i];
    if (!defined(leafTile)) {
      continue;
    }

    for (var j = 0; j < branchingFactor; j++) {
      var index = i * branchingFactor + j;
      if (subtree.childSubtreeIsAvailable(index)) {
        results.push({
          tile: leafTile,
          childIndex: j,
        });
      }
    }
  }
  return results;
}

/**
 * Results of transcodeSubtreeTiles, containing the root tile of the
 * subtree and the bottom row of nodes for further processing.
 *
 * @typedef {Object} TranscodedSubtree
 * @property {Cesium3DTile} rootTile The transcoded root tile of the subtree
 * @property {Array<Cesium3DTile|undefined>} bottomRow The bottom row of transcoded tiles. This is helpful for processing child subtrees
 * @private
 */

/**
 * Transcode the implicitly-defined tiles within this subtree and generate
 * explicit {@link Cesium3DTile} objects. This function only transcode tiles,
 * child subtrees are handled separately.
 *
 * @param {Implicit3DTileContent} content The implicit content
 * @param {ImplicitSubtree} subtree The subtree to get availability information
 * @param {Cesium3DTile} parentOfRootTile The parent of the root tile, used for constructing the subtree root tile
 * @param {Number} childIndex The Morton index of the root tile relative to parentOfRootTile
 * @returns {TranscodedSubtree} The newly created subtree of tiles
 * @private
 */
function transcodeSubtreeTiles(content, subtree, parentOfRootTile, childIndex) {
  var rootBitIndex = 0;
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

      if (!subtree.tileIsAvailable(childBitIndex)) {
        currentRow.push(undefined);
        continue;
      }

      var parentMortonIndex = subtree.getParentMortonIndex(childMortonIndex);
      var parentTile = parentRow[parentMortonIndex];
      var childChildIndex = childMortonIndex % implicitTileset.branchingFactor;
      var childTile = deriveChildTile(
        content,
        subtree,
        parentTile,
        childChildIndex,
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
 * <p>
 * This creates a real tile for rendering, not a placeholder tile like some of
 * the other methods of ImplicitTileset.
 * </p>
 *
 * @param {Implicit3DTileContent} implicitContent The implicit content
 * @param {ImplicitSubtree} subtree The subtree the child tile belongs to
 * @param {Cesium3DTile|undefined} parentTile The parent of the new child tile
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @param {Number} childBitIndex The index of the child tile within the tile's availability information.
 * @returns {Cesium3DTile} the new child tile.
 * @private
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
  if (subtree.contentIsAvailable(childBitIndex)) {
    var childContentUri = implicitTileset.contentUriTemplate.getDerivedResource(
      {
        templateValues: implicitCoordinates.getTemplateValues(),
      }
    ).url;
    contentJson = {
      uri: childContentUri,
    };
  }

  var boundingVolume = deriveBoundingVolume(
    implicitTileset,
    implicitCoordinates
  );
  var childGeometricError =
    implicitTileset.geometricError / Math.pow(2, implicitCoordinates.level);

  var tileJson = {
    boundingVolume: boundingVolume,
    geometricError: childGeometricError,
    refine: implicitTileset.refine,
    content: contentJson,
  };

  var childTile = makeTile(
    implicitContent,
    implicitTileset.baseResource,
    tileJson,
    parentTile
  );
  childTile.implicitCoordinates = implicitCoordinates;
  return childTile;
}

/**
 * Given the coordinates of a tile, derive its bounding volume from the root.
 *
 * @param {ImplicitTileset} implicitTileset The implicit tileset struct which holds the root bounding volume
 * @param {ImplicitTileCoordinates} implicitCoordinates The coordinates of the child tile
 * @returns {Object} An object containing the JSON for a bounding volume
 * @private
 */
function deriveBoundingVolume(implicitTileset, implicitCoordinates) {
  var boundingVolume = implicitTileset.boundingVolume;
  var parameters;
  if (defined(boundingVolume.region)) {
    parameters = boundingVolume.region;
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
  }

  // box
  parameters = boundingVolume.box;
  var center = Cartesian3.unpack(parameters);
  var halfAxes = Matrix3.unpack(parameters, 3);
  var boundingBox = new TileOrientedBoundingBox(center, halfAxes);
  var derivedBox = boundingBox.deriveVolume(
    implicitCoordinates.level,
    implicitCoordinates.x,
    implicitCoordinates.y,
    implicitCoordinates.z
  );

  var childBox = new Array(12);
  Cartesian3.pack(derivedBox.boundingVolume.center, childBox);
  Matrix3.pack(derivedBox.boundingVolume.halfAxes, childBox, 3);

  return {
    box: childBox,
  };
}

/**
 * Create a placeholder 3D Tile whose content will be an Implicit3DTileContent
 * for lazy evaluation of a child subtree.
 *
 * @param {Implicit3DTileContent} content The content object.
 * @param {Cesium3DTile} parentTile The parent of the new child subtree.
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @returns {Cesium3DTile} The new placeholder tile
 * @private
 */
function makePlaceholderChildSubtree(content, parentTile, childIndex) {
  var implicitTileset = content._implicitTileset;
  var implicitCoordinates = parentTile.implicitCoordinates.deriveChildCoordinates(
    childIndex
  );

  var childBoundingVolume = deriveBoundingVolume(
    implicitTileset,
    implicitCoordinates
  );
  var childGeometricError =
    implicitTileset.geometricError / Math.pow(2, implicitCoordinates.level);
  var childContentUri = implicitTileset.subtreeUriTemplate.getDerivedResource({
    templateValues: implicitCoordinates.getTemplateValues(),
  }).url;
  var tileJson = {
    boundingVolume: childBoundingVolume,
    geometricError: childGeometricError,
    refine: implicitTileset.refine,
    content: {
      uri: childContentUri,
    },
  };

  var tile = makeTile(
    content,
    implicitTileset.baseResource,
    tileJson,
    parentTile
  );
  tile.implicitTileset = implicitTileset;
  tile.implicitCoordinates = implicitCoordinates;
  return tile;
}

/**
 * Make a {@link Cesium3DTile}. This uses the content's tile's constructor instead
 * of importing Cesium3DTile. This is to avoid a circular dependency between
 * this file and Cesium3DTile.js
 * @param {Implicit3DTileContent} content The implicit content
 * @param {Resource} baseResource The base resource for the tileset
 * @param {Object} tileJson The JSON header for the tile
 * @param {Cesium3DTile} parentTile The parent of the new tile
 * @returns {Cesium3DTile} The newly created tile.
 * @private
 */
function makeTile(content, baseResource, tileJson, parentTile) {
  var Cesium3DTile = content._tile.constructor;
  return new Cesium3DTile(content._tileset, baseResource, tileJson, parentTile);
}

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
 * always returns <code>false</code> since a tile of this type does not have any features.
 * @private
 */
Implicit3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Tileset3DTileContent</code>
 * always returns <code>undefined</code> since a tile of this type does not have any features.
 * @private
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
