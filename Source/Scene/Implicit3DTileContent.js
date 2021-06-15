import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import CesiumMath from "../Core/Math.js";
import HilbertOrder from "../Core/HilbertOrder.js";
import Matrix3 from "../Core/Matrix3.js";
import MortonOrder from "../Core/MortonOrder.js";
import Rectangle from "../Core/Rectangle.js";
import S2Cell from "../Core/S2Cell.js";
import when from "../ThirdParty/when.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";
import ImplicitSubtree from "./ImplicitSubtree.js";
import ImplicitTileMetadata from "./ImplicitTileMetadata.js";
import hasExtension from "./hasExtension.js";
import parseBoundingVolumeSemantics from "./parseBoundingVolumeSemantics.js";

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
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
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

  var implicitTileset = tile.implicitTileset;
  var implicitCoordinates = tile.implicitCoordinates;

  this._implicitTileset = implicitTileset;
  this._implicitCoordinates = implicitCoordinates;
  this._implicitSubtree = undefined;
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._readyPromise = when.defer();

  this.featurePropertiesDirty = false;
  this._groupMetadata = undefined;

  var templateValues = implicitCoordinates.getTemplateValues();
  var subtreeResource = implicitTileset.subtreeUriTemplate.getDerivedResource({
    templateValues: templateValues,
  });
  this._url = subtreeResource.getUrlComponent(true);

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
      return this._url;
    },
  },

  batchTable: {
    get: function () {
      return undefined;
    },
  },

  groupMetadata: {
    get: function () {
      return this._groupMetadata;
    },
    set: function (value) {
      this._groupMetadata = value;
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
    content._implicitTileset,
    content._implicitCoordinates
  );
  content._implicitSubtree = subtree;

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
 * Expand a single subtree placeholder tile. This transcodes the subtree into
 * a tree of {@link Cesium3DTile}. The root of this tree is stored in
 * the placeholder tile's children array. This method also creates placeholder
 * tiles for the child subtrees to be lazily expanded as needed.
 *
 * @param {Implicit3DTileContent} content The content
 * @param {ImplicitSubtree} subtree The parsed subtree
 * @private
 */
function expandSubtree(content, subtree) {
  var placeholderTile = content._tile;

  // Parse the tiles inside this immediate subtree
  var childIndex = content._implicitCoordinates.childIndex;
  var results = transcodeSubtreeTiles(
    content,
    subtree,
    placeholderTile,
    childIndex
  );

  // Link the new subtree to the existing placeholder tile.
  placeholderTile.children.push(results.rootTile);

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
      if (subtree.childSubtreeIsAvailableAtIndex(index)) {
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
 * @param {Cesium3DTile} placeholderTile The placeholder tile, used for constructing the subtree root tile
 * @param {Number} childIndex The Morton index of the root tile relative to parentOfRootTile
 * @returns {TranscodedSubtree} The newly created subtree of tiles
 * @private
 */
function transcodeSubtreeTiles(content, subtree, placeholderTile, childIndex) {
  var rootBitIndex = 0;
  var rootParentIsPlaceholder = true;
  var rootTile = deriveChildTile(
    content,
    subtree,
    placeholderTile,
    childIndex,
    rootBitIndex,
    rootParentIsPlaceholder
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

      if (!subtree.tileIsAvailableAtIndex(childBitIndex)) {
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
 * @param {Cesium3DTile} parentTile The parent of the new child tile
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @param {Number} childBitIndex The index of the child tile within the tile's availability information.
 * @param {Boolean} [parentIsPlaceholderTile=false] True if parentTile is a placeholder tile. This is true for the root of each subtree.
 * @returns {Cesium3DTile} The new child tile.
 * @private
 */
function deriveChildTile(
  implicitContent,
  subtree,
  parentTile,
  childIndex,
  childBitIndex,
  parentIsPlaceholderTile
) {
  var implicitTileset = implicitContent._implicitTileset;
  var implicitCoordinates;
  if (defaultValue(parentIsPlaceholderTile, false)) {
    implicitCoordinates = parentTile.implicitCoordinates;
  } else {
    implicitCoordinates = parentTile.implicitCoordinates.getChildCoordinates(
      childIndex
    );
  }

  // Parse metadata and bounding volume semantics at the beginning
  // as the bounding volumes are needed below.
  var tileMetadata;
  var tileBounds;
  var contentBounds;
  if (defined(subtree.metadataExtension)) {
    var metadataTable = subtree.metadataTable;
    tileMetadata = new ImplicitTileMetadata({
      class: metadataTable.class,
      implicitCoordinates: implicitCoordinates,
      implicitSubtree: subtree,
    });

    var boundingVolumeSemantics = parseBoundingVolumeSemantics(tileMetadata);
    tileBounds = boundingVolumeSemantics.tile;
    contentBounds = boundingVolumeSemantics.content;
  }

  var contentJsons = [];
  for (var i = 0; i < implicitTileset.contentCount; i++) {
    if (!subtree.contentIsAvailableAtIndex(childBitIndex, i)) {
      continue;
    }
    var childContentTemplate = implicitTileset.contentUriTemplates[i];
    var childContentUri = childContentTemplate.getDerivedResource({
      templateValues: implicitCoordinates.getTemplateValues(),
    }).url;
    var contentJson = {
      uri: childContentUri,
    };

    // content bounding volumes can only be specified via
    // metadata semantics such as CONTENT_BOUNDING_BOX
    if (defined(contentBounds) && defined(contentBounds.boundingVolume)) {
      contentJson.boundingVolume = contentBounds.boundingVolume;
    }

    // combine() is used to pass through any additional properties the
    // user specified such as extras or extensions
    contentJsons.push(combine(contentJson, implicitTileset.contentHeaders[i]));
  }

  var boundingVolume;

  if (defined(tileBounds) && defined(tileBounds.boundingVolume)) {
    boundingVolume = tileBounds.boundingVolume;
  } else {
    boundingVolume = deriveBoundingVolume(
      implicitTileset,
      implicitCoordinates,
      childIndex,
      defaultValue(parentIsPlaceholderTile, false),
      parentTile
    );

    // The TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT metadata semantics
    // can be used to tighten the bounding volume
    if (
      hasExtension(boundingVolume, "3DTILES_bounding_volume_S2") &&
      defined(tileBounds)
    ) {
      updateS2CellHeights(
        boundingVolume.extensions["3DTILES_bounding_volume_S2"],
        tileBounds.minimumHeight,
        tileBounds.maximumHeight
      );
    } else if (defined(boundingVolume.region) && defined(tileBounds)) {
      updateRegionHeights(
        boundingVolume.region,
        tileBounds.minimumHeight,
        tileBounds.maximumHeight
      );
    }
  }

  var childGeometricError =
    implicitTileset.geometricError / Math.pow(2, implicitCoordinates.level);

  var tileJson = {
    boundingVolume: boundingVolume,
    geometricError: childGeometricError,
    refine: implicitTileset.refine,
  };

  if (contentJsons.length === 1) {
    tileJson.content = contentJsons[0];
  } else if (contentJsons.length > 1) {
    tileJson.extensions = {
      "3DTILES_multiple_contents": {
        content: contentJsons,
      },
    };
  }

  var deep = true;
  var childTile = makeTile(
    implicitContent,
    implicitTileset.baseResource,
    // combine() is used to pass through any additional properties the
    // user specified such as extras or extensions
    combine(tileJson, implicitTileset.tileHeader, deep),
    parentTile
  );
  childTile.implicitCoordinates = implicitCoordinates;
  childTile.implicitSubtree = subtree;
  childTile.metadata = tileMetadata;

  return childTile;
}

/**
 * For a derived bounding region, update the minimum and maximum height. This
 * is typically used to tighten a bounding volume using the
 * <code>TILE_MINIMUM_HEIGHT</code> and <code>TILE_MAXIMUM_HEIGHT</code>
 * semantics. Heights are only updated if the respective
 * minimumHeight/maximumHeight parameter is defined.
 *
 * @param {Array} region A 6-element array describing the bounding region
 * @param {Number} [minimumHeight] The new minimum height
 * @param {Number} [maximumHeight] The new maximum height
 * @private
 */
function updateRegionHeights(region, minimumHeight, maximumHeight) {
  if (defined(minimumHeight)) {
    region[4] = minimumHeight;
  }

  if (defined(maximumHeight)) {
    region[5] = maximumHeight;
  }
}

/**
 * For a derived bounding S2 cell, update the minimum and maximum height. This
 * is typically used to tighten a bounding volume using the
 * <code>TILE_MINIMUM_HEIGHT</code> and <code>TILE_MAXIMUM_HEIGHT</code>
 * semantics. Heights are only updated if the respective
 * minimumHeight/maximumHeight parameter is defined.
 *
 * @param {Array} region A 6-element array describing the bounding region
 * @param {Number} [minimumHeight] The new minimum height
 * @param {Number} [maximumHeight] The new maximum height
 * @private
 */
function updateS2CellHeights(s2CellVolume, minimumHeight, maximumHeight) {
  if (defined(minimumHeight)) {
    s2CellVolume.minimumHeight = minimumHeight;
  }

  if (defined(maximumHeight)) {
    s2CellVolume.maximumHeight = maximumHeight;
  }
}

/**
 * Given the coordinates of a tile, derive its bounding volume from the root.
 *
 * @param {ImplicitTileset} implicitTileset The implicit tileset struct which holds the root bounding volume
 * @param {ImplicitTileCoordinates} implicitCoordinates The coordinates of the child tile
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @param {Boolean} parentIsPlaceholderTile True if parentTile is a placeholder tile. This is true for the root of each subtree.
 * @param {Cesium3DTile} parentTile The parent of the new child tile
 * @returns {Object} An object containing the JSON for a bounding volume
 * @private
 */
function deriveBoundingVolume(
  implicitTileset,
  implicitCoordinates,
  childIndex,
  parentIsPlaceholderTile,
  parentTile
) {
  var rootBoundingVolume = implicitTileset.boundingVolume;

  if (hasExtension(rootBoundingVolume, "3DTILES_bounding_volume_S2")) {
    return deriveBoundingVolumeS2(
      implicitTileset,
      parentTile,
      parentIsPlaceholderTile,
      childIndex
    );
  }

  if (defined(rootBoundingVolume.region)) {
    var childRegion = deriveBoundingRegion(
      rootBoundingVolume.region,
      implicitCoordinates.level,
      implicitCoordinates.x,
      implicitCoordinates.y,
      implicitCoordinates.z
    );

    return {
      region: childRegion,
    };
  }

  var childBox = deriveBoundingBox(
    rootBoundingVolume.box,
    implicitCoordinates.level,
    implicitCoordinates.x,
    implicitCoordinates.y,
    implicitCoordinates.z
  );

  return {
    box: childBox,
  };
}

/**
 * Derive a bounding volume for a child tile from a parent tile,
 * assuming a quadtree or octree implicit tiling scheme.
 * <p>
 * If implicitSubdivisionScheme is OCTREE, octree subdivision is used.
 * Otherwise, quadtree subdivision is used. Quadtrees are always divided
 * using the S2 cell hierarchy. Octrees have an additional split at the midpoint
 * of the the vertical (z) dimension.
 * </p>
 *
 * @param {ImplicitTileset} implicitTileset The implicit tileset struct which holds the root bounding volume
 * @param {Cesium3DTile} parentTile The parent of the new child tile
 * @param {Boolean} parentIsPlaceholderTile True if parentTile is a placeholder tile. This is true for the root of each subtree.
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @private
 */
function deriveBoundingVolumeS2(
  implicitTileset,
  parentTile,
  parentIsPlaceholderTile,
  childIndex
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("implicitTileset", implicitTileset);
  Check.typeOf.object("parentTile", parentTile);
  Check.typeOf.bool("parentIsPlaceholderTile", parentIsPlaceholderTile);
  Check.typeOf.number("childIndex", childIndex);
  //>>includeEnd('debug');

  var boundingVolumeS2;

  // Handle the placeholder tile case.
  if (parentIsPlaceholderTile) {
    boundingVolumeS2 = parentTile._boundingVolume;
    return {
      extensions: {
        "3DTILES_bounding_volume_S2": {
          token: S2Cell.getTokenFromId(boundingVolumeS2.s2Cell._cellId),
          minimumHeight: boundingVolumeS2.minimumHeight,
          maximumHeight: boundingVolumeS2.maximumHeight,
        },
      },
    };
  }
  boundingVolumeS2 = parentTile._boundingVolume;

  // Decode Morton index. The modulus 4 ensures that it works for both quadtrees and octrees.
  var childCoords = MortonOrder.decode2D(childIndex % 4);
  // Encode Hilbert index.
  var hilbertIndex = HilbertOrder.encode2D(1, childCoords[0], childCoords[1]);
  var childCell = boundingVolumeS2.s2Cell.getChild(hilbertIndex);

  var minHeight, maxHeight;
  if (implicitTileset.subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    var midpointHeight =
      (boundingVolumeS2.maximumHeight + boundingVolumeS2.minimumHeight) / 2;
    minHeight =
      childIndex < 4 ? boundingVolumeS2.minimumHeight : midpointHeight;
    maxHeight =
      childIndex < 4 ? midpointHeight : boundingVolumeS2.maximumHeight;
  } else {
    minHeight = boundingVolumeS2.minimumHeight;
    maxHeight = boundingVolumeS2.maximumHeight;
  }

  return {
    extensions: {
      "3DTILES_bounding_volume_S2": {
        token: S2Cell.getTokenFromId(childCell._cellId),
        minimumHeight: minHeight,
        maximumHeight: maxHeight,
      },
    },
  };
}

var scratchScaleFactors = new Cartesian3();
var scratchRootCenter = new Cartesian3();
var scratchCenter = new Cartesian3();
var scratchHalfAxes = new Matrix3();
/**
 * Derive a bounding volume for a descendant tile (child, grandchild, etc.),
 * assuming a quadtree or octree implicit tiling scheme. The (level, x, y, [z])
 * coordinates are given to select the descendant tile and compute its position
 * and dimensions.
 * <p>
 * If z is present, octree subdivision is used. Otherwise, quadtree subdivision
 * is used. Quadtrees are always divided at the midpoint of the the horizontal
 * dimensions, i.e. (x, y), leaving the z axis unchanged.
 * </p>
 * <p>
 * This computes the child volume directly from the root bounding volume rather
 * than recursively subdividing to minimize floating point error.
 * </p>
 *
 * @param {Number[]} rootBox An array of 12 numbers representing the bounding box of the root tile
 * @param {Number} level The level of the descendant tile relative to the root implicit tile
 * @param {Number} x The x coordinate of the descendant tile
 * @param {Number} y The y coordinate of the descendant tile
 * @param {Number} [z] The z coordinate of the descendant tile (octree only)
 * @returns {Number[]} An array of 12 numbers representing the bounding box of the descendant tile.
 * @private
 */
function deriveBoundingBox(rootBox, level, x, y, z) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rootBox", rootBox);
  Check.typeOf.number("level", level);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  if (defined(z)) {
    Check.typeOf.number("z", z);
  }
  //>>includeEnd('debug');

  if (level === 0) {
    return rootBox;
  }

  var rootCenter = Cartesian3.unpack(rootBox, 0, scratchRootCenter);
  var rootHalfAxes = Matrix3.unpack(rootBox, 3, scratchHalfAxes);

  var tileScale = Math.pow(2, -level);
  var modelSpaceX = -1 + (2 * x + 1) * tileScale;
  var modelSpaceY = -1 + (2 * y + 1) * tileScale;

  var modelSpaceZ = 0;
  var scaleFactors = Cartesian3.fromElements(
    tileScale,
    tileScale,
    1,
    scratchScaleFactors
  );

  if (defined(z)) {
    modelSpaceZ = -1 + (2 * z + 1) * tileScale;
    scaleFactors.z = tileScale;
  }

  var center = Cartesian3.fromElements(
    modelSpaceX,
    modelSpaceY,
    modelSpaceZ,
    scratchCenter
  );
  center = Matrix3.multiplyByVector(rootHalfAxes, center, scratchCenter);
  center = Cartesian3.add(center, rootCenter, scratchCenter);

  var halfAxes = Matrix3.clone(rootHalfAxes);
  halfAxes = Matrix3.multiplyByScale(halfAxes, scaleFactors, halfAxes);

  var childBox = new Array(12);
  Cartesian3.pack(center, childBox);
  Matrix3.pack(halfAxes, childBox, 3);
  return childBox;
}

var scratchRectangle = new Rectangle();
/**
 * Derive a bounding volume for a descendant tile (child, grandchild, etc.),
 * assuming a quadtree or octree implicit tiling scheme. The (level, x, y, [z])
 * coordinates are given to select the descendant tile and compute its position
 * and dimensions.
 * <p>
 * If z is present, octree subdivision is used. Otherwise, quadtree subdivision
 * is used. Quadtrees are always divided at the midpoint of the the horizontal
 * dimensions, i.e. (mid_longitude, mid_latitude), leaving the height values
 * unchanged.
 * </p>
 * <p>
 * This computes the child volume directly from the root bounding volume rather
 * than recursively subdividing to minimize floating point error.
 * </p>
 * @param {Number[]} rootRegion An array of 6 numbers representing the root implicit tile
 * @param {Number} level The level of the descendant tile relative to the root implicit tile
 * @param {Number} x The x coordinate of the descendant tile
 * @param {Number} y The x coordinate of the descendant tile
 * @param {Number} [z] The z coordinate of the descendant tile (octree only)
 * @returns {Number[]} An array of 6 numbers representing the bounding region of the descendant tile
 * @private
 */
function deriveBoundingRegion(rootRegion, level, x, y, z) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rootRegion", rootRegion);
  Check.typeOf.number("level", level);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  if (defined(z)) {
    Check.typeOf.number("z", z);
  }
  //>>includeEnd('debug');

  if (level === 0) {
    return rootRegion.slice();
  }

  var rectangle = Rectangle.unpack(rootRegion, 0, scratchRectangle);
  var rootMinimumHeight = rootRegion[4];
  var rootMaximumHeight = rootRegion[5];
  var tileScale = Math.pow(2, -level);

  var childWidth = tileScale * rectangle.width;
  var west = CesiumMath.negativePiToPi(rectangle.west + x * childWidth);
  var east = CesiumMath.negativePiToPi(west + childWidth);

  var childHeight = tileScale * rectangle.height;
  var south = CesiumMath.negativePiToPi(rectangle.south + y * childHeight);
  var north = CesiumMath.negativePiToPi(south + childHeight);

  // Height is only subdivided for octrees; It remains constant for quadtrees.
  var minimumHeight = rootMinimumHeight;
  var maximumHeight = rootMaximumHeight;
  if (defined(z)) {
    var childThickness = tileScale * (rootMaximumHeight - rootMinimumHeight);
    minimumHeight += z * childThickness;
    maximumHeight = minimumHeight + childThickness;
  }

  return [west, south, east, north, minimumHeight, maximumHeight];
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
  var implicitCoordinates = parentTile.implicitCoordinates.getChildCoordinates(
    childIndex
  );

  var childBoundingVolume = deriveBoundingVolume(
    implicitTileset,
    implicitCoordinates,
    childIndex,
    false,
    parentTile
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
 * Part of the {@link Cesium3DTileContent} interface.  <code>Implicit3DTileContent</code>
 * always returns <code>false</code> since a tile of this type does not have any features.
 * @private
 */
Implicit3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Implicit3DTileContent</code>
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
  this._implicitSubtree =
    this._implicitSubtree && this._implicitSubtree.destroy();
  return destroyObject(this);
};

// Exposed for testing
Implicit3DTileContent._deriveBoundingBox = deriveBoundingBox;
Implicit3DTileContent._deriveBoundingRegion = deriveBoundingRegion;
Implicit3DTileContent._deriveBoundingVolumeS2 = deriveBoundingVolumeS2;
