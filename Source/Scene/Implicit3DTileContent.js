import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import CesiumMath from "../Core/Math.js";
import HilbertOrder from "../Core/HilbertOrder.js";
import Matrix3 from "../Core/Matrix3.js";
import Rectangle from "../Core/Rectangle.js";
import S2Cell from "../Core/S2Cell.js";
import ImplicitSubtree from "./ImplicitSubtree.js";
import hasExtension from "./hasExtension.js";
import MetadataSemantic from "./MetadataSemantic.js";
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
 * @param {Object} [json] The JSON object containing the subtree. Mutually exclusive with arrayBuffer.
 * @param {ArrayBuffer} [arrayBuffer] The array buffer that stores the content payload. Mutually exclusive with json.
 * @param {Number} [byteOffset=0] The offset into the array buffer, if one was provided
 *
 * @exception {DeveloperError} One of json and arrayBuffer must be defined.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function Implicit3DTileContent(
  tileset,
  tile,
  resource,
  json,
  arrayBuffer,
  byteOffset
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("tile.implicitTileset", tile.implicitTileset);
  Check.defined("tile.implicitCoordinates", tile.implicitCoordinates);
  if (defined(json) === defined(arrayBuffer)) {
    throw new DeveloperError("One of json and arrayBuffer must be defined.");
  }
  //>>includeEnd('debug');

  const implicitTileset = tile.implicitTileset;
  const implicitCoordinates = tile.implicitCoordinates;

  this._implicitTileset = implicitTileset;
  this._implicitCoordinates = implicitCoordinates;
  this._implicitSubtree = undefined;
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;

  this._metadata = undefined;

  this.featurePropertiesDirty = false;
  this._group = undefined;

  const templateValues = implicitCoordinates.getTemplateValues();
  const subtreeResource = implicitTileset.subtreeUriTemplate.getDerivedResource(
    {
      templateValues: templateValues,
    }
  );
  this._url = subtreeResource.getUrlComponent(true);

  this._readyPromise = initialize(this, json, arrayBuffer, byteOffset);
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
      return this._readyPromise;
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

  /**
   * Part of the {@link Cesium3DTileContent} interface. <code>Implicit3DTileContent</code>
   * always returns <code>undefined</code>. Only transcoded tiles have content metadata.
   * @memberof Implicit3DTileContent.prototype
   * @private
   */
  metadata: {
    get: function () {
      return undefined;
    },
    set: function () {
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError("Implicit3DTileContent cannot have metadata");
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
      return this._group;
    },
    set: function (value) {
      this._group = value;
    },
  },
});

/**
 * Initialize the implicit content by parsing the subtree resource and setting
 * up a promise chain to expand the immediate subtree.
 *
 * @param {Implicit3DTileContent} content The implicit content
 * @param {Object} [json] The JSON containing the subtree. Mutually exclusive with arrayBuffer.
 * @param {ArrayBuffer} [arrayBuffer] The ArrayBuffer containing a subtree binary. Mutually exclusive with json.
 * @param {Number} [byteOffset=0] The byte offset into the arrayBuffer
 * @private
 */
function initialize(content, json, arrayBuffer, byteOffset) {
  byteOffset = defaultValue(byteOffset, 0);
  let uint8Array;
  if (defined(arrayBuffer)) {
    uint8Array = new Uint8Array(arrayBuffer, byteOffset);
  }

  const subtree = new ImplicitSubtree(
    content._resource,
    json,
    uint8Array,
    content._implicitTileset,
    content._implicitCoordinates
  );

  content._implicitSubtree = subtree;
  return subtree.readyPromise.then(function () {
    expandSubtree(content, subtree);
    return content;
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
  const placeholderTile = content._tile;

  // Parse the tiles inside this immediate subtree
  const childIndex = content._implicitCoordinates.childIndex;
  const results = transcodeSubtreeTiles(
    content,
    subtree,
    placeholderTile,
    childIndex
  );

  const statistics = content._tileset.statistics;

  // Link the new subtree to the existing placeholder tile.
  placeholderTile.children.push(results.rootTile);
  statistics.numberOfTilesTotal++;

  // for each child subtree, make new placeholder tiles
  const childSubtrees = listChildSubtrees(content, subtree, results.bottomRow);
  for (let i = 0; i < childSubtrees.length; i++) {
    const subtreeLocator = childSubtrees[i];
    const leafTile = subtreeLocator.tile;
    const implicitChildTile = makePlaceholderChildSubtree(
      content,
      leafTile,
      subtreeLocator.childIndex
    );
    leafTile.children.push(implicitChildTile);
    statistics.numberOfTilesTotal++;
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
  const results = [];
  const branchingFactor = content._implicitTileset.branchingFactor;
  for (let i = 0; i < bottomRow.length; i++) {
    const leafTile = bottomRow[i];
    if (!defined(leafTile)) {
      continue;
    }

    for (let j = 0; j < branchingFactor; j++) {
      const index = i * branchingFactor + j;
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
  const rootBitIndex = 0;
  const rootParentIsPlaceholder = true;
  const rootTile = deriveChildTile(
    content,
    subtree,
    placeholderTile,
    childIndex,
    rootBitIndex,
    rootParentIsPlaceholder
  );

  const statistics = content._tileset.statistics;

  // Sliding window over the levels of the tree.
  // Each row is branchingFactor * length of previous row
  // Tiles within a row are ordered by Morton index.
  let parentRow = [rootTile];
  let currentRow = [];

  const implicitTileset = content._implicitTileset;
  for (let level = 1; level < implicitTileset.subtreeLevels; level++) {
    const levelOffset = subtree.getLevelOffset(level);
    const numberOfChildren = implicitTileset.branchingFactor * parentRow.length;
    for (
      let childMortonIndex = 0;
      childMortonIndex < numberOfChildren;
      childMortonIndex++
    ) {
      const childBitIndex = levelOffset + childMortonIndex;

      if (!subtree.tileIsAvailableAtIndex(childBitIndex)) {
        currentRow.push(undefined);
        continue;
      }

      const parentMortonIndex = subtree.getParentMortonIndex(childMortonIndex);
      const parentTile = parentRow[parentMortonIndex];
      const childChildIndex =
        childMortonIndex % implicitTileset.branchingFactor;
      const childTile = deriveChildTile(
        content,
        subtree,
        parentTile,
        childChildIndex,
        childBitIndex
      );
      parentTile.children.push(childTile);
      statistics.numberOfTilesTotal++;
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

function getGeometricError(tileMetadata, implicitTileset, implicitCoordinates) {
  const semantic = MetadataSemantic.TILE_GEOMETRIC_ERROR;

  if (defined(tileMetadata) && tileMetadata.hasPropertyBySemantic(semantic)) {
    return tileMetadata.getPropertyBySemantic(semantic);
  }

  return (
    implicitTileset.geometricError / Math.pow(2, implicitCoordinates.level)
  );
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
  const implicitTileset = implicitContent._implicitTileset;
  let implicitCoordinates;
  if (defaultValue(parentIsPlaceholderTile, false)) {
    implicitCoordinates = parentTile.implicitCoordinates;
  } else {
    implicitCoordinates = parentTile.implicitCoordinates.getChildCoordinates(
      childIndex
    );
  }

  // Parse metadata and bounding volume semantics at the beginning
  // as the bounding volumes are needed below.
  let tileMetadata;
  let tileBounds;
  let contentBounds;
  if (defined(subtree.tilePropertyTableJson)) {
    tileMetadata = subtree.getTileMetadataView(implicitCoordinates);

    const boundingVolumeSemantics = parseBoundingVolumeSemantics(tileMetadata);
    tileBounds = boundingVolumeSemantics.tile;
    contentBounds = boundingVolumeSemantics.content;
  }

  // Content is not loaded at this point, so this flag is set for future reference.
  const contentPropertyTableJsons = subtree.contentPropertyTableJsons;
  const length = contentPropertyTableJsons.length;
  let hasImplicitContentMetadata = false;
  for (let i = 0; i < length; i++) {
    if (subtree.contentIsAvailableAtCoordinates(implicitCoordinates, i)) {
      hasImplicitContentMetadata = true;
      break;
    }
  }

  const boundingVolume = getTileBoundingVolume(
    implicitTileset,
    implicitCoordinates,
    childIndex,
    parentIsPlaceholderTile,
    parentTile,
    tileBounds
  );

  const contentJsons = [];
  for (let i = 0; i < implicitTileset.contentCount; i++) {
    if (!subtree.contentIsAvailableAtIndex(childBitIndex, i)) {
      continue;
    }
    const childContentTemplate = implicitTileset.contentUriTemplates[i];
    const childContentUri = childContentTemplate.getDerivedResource({
      templateValues: implicitCoordinates.getTemplateValues(),
    }).url;
    const contentJson = {
      uri: childContentUri,
    };

    const contentBoundingVolume = getContentBoundingVolume(
      boundingVolume,
      contentBounds
    );

    if (defined(contentBoundingVolume)) {
      contentJson.boundingVolume = contentBoundingVolume;
    }

    // combine() is used to pass through any additional properties the
    // user specified such as extras or extensions
    contentJsons.push(combine(contentJson, implicitTileset.contentHeaders[i]));
  }

  const childGeometricError = getGeometricError(
    tileMetadata,
    implicitTileset,
    implicitCoordinates
  );

  const tileJson = {
    boundingVolume: boundingVolume,
    geometricError: childGeometricError,
    refine: implicitTileset.refine,
    contents: contentJsons,
  };

  // combine() is used to pass through any additional properties the
  // user specified such as extras or extensions.
  const deep = true;
  const rootHeader = clone(implicitTileset.tileHeader, deep);
  delete rootHeader.boundingVolume;
  delete rootHeader.transform;
  const combinedTileJson = combine(tileJson, rootHeader, deep);

  const childTile = makeTile(
    implicitContent,
    implicitTileset.baseResource,
    combinedTileJson,
    parentTile
  );

  childTile.implicitCoordinates = implicitCoordinates;
  childTile.implicitSubtree = subtree;
  childTile.metadata = tileMetadata;
  childTile.hasImplicitContentMetadata = hasImplicitContentMetadata;

  return childTile;
}

/**
 * Checks whether the bounding volume's heights can be updated.
 * Returns true if the minimumHeight/maximumHeight parameter
 * is defined and the bounding volume is a region or S2 cell.
 *
 * @param {Object} [boundingVolume] The bounding volume
 * @param {Object} [tileBounds] The tile bounds
 * @param {Number} [tileBounds.minimumHeight] The minimum height
 * @param {Number} [tileBounds.maximumHeight] The maximum height
 * @returns {Boolean} Whether the bounding volume's heights can be updated
 * @private
 */
function canUpdateHeights(boundingVolume, tileBounds) {
  return (
    defined(boundingVolume) &&
    defined(tileBounds) &&
    (defined(tileBounds.minimumHeight) || defined(tileBounds.maximumHeight)) &&
    (hasExtension(boundingVolume, "3DTILES_bounding_volume_S2") ||
      defined(boundingVolume.region))
  );
}

/**
 * Update the minimum and maximum height of the bounding volume.
 * This is typically used to tighten a bounding volume using the
 * <code>TILE_MINIMUM_HEIGHT</code> and <code>TILE_MAXIMUM_HEIGHT</code>
 * semantics. Heights are only updated if the respective
 * minimumHeight/maximumHeight parameter is defined and the
 * bounding volume is a region or S2 cell.
 *
 * @param {Object} boundingVolume The bounding volume
 * @param {Object} [tileBounds] The tile bounds
 * @param {Number} [tileBounds.minimumHeight] The new minimum height
 * @param {Number} [tileBounds.maximumHeight] The new maximum height
 * @private
 */
function updateHeights(boundingVolume, tileBounds) {
  if (!defined(tileBounds)) {
    return;
  }

  if (hasExtension(boundingVolume, "3DTILES_bounding_volume_S2")) {
    updateS2CellHeights(
      boundingVolume.extensions["3DTILES_bounding_volume_S2"],
      tileBounds.minimumHeight,
      tileBounds.maximumHeight
    );
  } else if (defined(boundingVolume.region)) {
    updateRegionHeights(
      boundingVolume.region,
      tileBounds.minimumHeight,
      tileBounds.maximumHeight
    );
  }
}

/**
 * For a bounding region, update the minimum and maximum height. This
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
 * For a bounding S2 cell, update the minimum and maximum height. This
 * is typically used to tighten a bounding volume using the
 * <code>TILE_MINIMUM_HEIGHT</code> and <code>TILE_MAXIMUM_HEIGHT</code>
 * semantics. Heights are only updated if the respective
 * minimumHeight/maximumHeight parameter is defined.
 *
 * @param {Object} s2CellVolume An object describing the S2 cell
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
 * Gets the tile's bounding volume, which may be specified via
 * metadata semantics such as TILE_BOUNDING_BOX or implicitly
 * derived from the implicit root tile's bounding volume.
 * <p>
 * Priority of bounding volume types:
 * <ol>
 * <li>Explicit min/max height
 *   <ol>
 *     <li>With explicit region</li>
 *     <li>With implicit S2</li>
 *     <li>With implicit region</li>
 *   </ol>
 * </li>
 * <li>Explicit box</li>
 * <li>Explicit region</li>
 * <li>Explicit sphere</li>
 * <li>Implicit S2</li>
 * <li>Implicit box</li>
 * <li>Implicit region</li>
 * </ol>
 * </p>
 *
 * @param {ImplicitTileset} implicitTileset The implicit tileset struct which holds the root bounding volume
 * @param {ImplicitTileCoordinates} implicitCoordinates The coordinates of the child tile
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @param {Boolean} parentIsPlaceholderTile True if parentTile is a placeholder tile. This is true for the root of each subtree.
 * @param {Cesium3DTile} parentTile The parent of the new child tile
 * @param {Object} [tileBounds] The tile bounds
 * @returns {Object} An object containing the JSON for a bounding volume
 * @private
 */
function getTileBoundingVolume(
  implicitTileset,
  implicitCoordinates,
  childIndex,
  parentIsPlaceholderTile,
  parentTile,
  tileBounds
) {
  let boundingVolume;

  if (
    !defined(tileBounds) ||
    !defined(tileBounds.boundingVolume) ||
    (!canUpdateHeights(tileBounds.boundingVolume, tileBounds) &&
      canUpdateHeights(implicitTileset.boundingVolume, tileBounds))
  ) {
    boundingVolume = deriveBoundingVolume(
      implicitTileset,
      implicitCoordinates,
      childIndex,
      defaultValue(parentIsPlaceholderTile, false),
      parentTile
    );
  } else {
    boundingVolume = tileBounds.boundingVolume;
  }

  // The TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT metadata semantics
  // can be used to tighten the bounding volume
  updateHeights(boundingVolume, tileBounds);

  return boundingVolume;
}

/**
 * Gets the content bounding volume, which may be specified via
 * metadata semantics such as CONTENT_BOUNDING_BOX.
 * <p>
 * Priority of bounding volume types:
 * <ol>
 * <li>Explicit min/max height
 *   <ol>
 *     <li>With explicit region</li>
 *     <li>With tile bounding volume (S2 or region)</li>
 *   </ol>
 * </li>
 * <li>Explicit box</li>
 * <li>Explicit region</li>
 * <li>Explicit sphere</li>
 * <li>Tile bounding volume (when content.boundingVolume is undefined)</li>
 * </ol>
 * </p>
 *
 * @param {Object} tileBoundingVolume An object containing the JSON for the tile's bounding volume
 * @param {Object} [contentBounds] The content bounds
 * @returns {Object|undefined} An object containing the JSON for a bounding volume, or <code>undefined</code> if there is no bounding volume
 * @private
 */
function getContentBoundingVolume(tileBoundingVolume, contentBounds) {
  // content bounding volumes can only be specified via
  // metadata semantics such as CONTENT_BOUNDING_BOX
  let contentBoundingVolume;
  if (defined(contentBounds)) {
    contentBoundingVolume = contentBounds.boundingVolume;
  }

  // The CONTENT_MINIMUM_HEIGHT and CONTENT_MAXIMUM_HEIGHT metadata semantics
  // can be used to tighten the bounding volume
  if (canUpdateHeights(contentBoundingVolume, contentBounds)) {
    updateHeights(contentBoundingVolume, contentBounds);
  } else if (canUpdateHeights(tileBoundingVolume, contentBounds)) {
    contentBoundingVolume = clone(tileBoundingVolume, true);
    updateHeights(contentBoundingVolume, contentBounds);
  }

  return contentBoundingVolume;
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
  const rootBoundingVolume = implicitTileset.boundingVolume;

  if (hasExtension(rootBoundingVolume, "3DTILES_bounding_volume_S2")) {
    return deriveBoundingVolumeS2(
      parentIsPlaceholderTile,
      parentTile,
      childIndex,
      implicitCoordinates.level,
      implicitCoordinates.x,
      implicitCoordinates.y,
      implicitCoordinates.z
    );
  }

  if (defined(rootBoundingVolume.region)) {
    const childRegion = deriveBoundingRegion(
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

  const childBox = deriveBoundingBox(
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
 * Derive a bounding volume for a descendant tile (child, grandchild, etc.),
 * assuming a quadtree or octree implicit tiling scheme. The (level, x, y, [z])
 * coordinates are given to select the descendant tile and compute its position
 * and dimensions.
 * <p>
 * If z is present, octree subdivision is used. Otherwise, quadtree subdivision
 * is used. Quadtrees are always divided at the midpoint of the the horizontal
 * dimensions, i.e. (x, y), leaving the z axis unchanged.
 * </p>
 *
 * @param {Boolean} parentIsPlaceholderTile True if parentTile is a placeholder tile. This is true for the root of each subtree.
 * @param {Cesium3DTile} parentTile The parent of the new child tile
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @param {Number} level The level of the descendant tile relative to the root implicit tile
 * @param {Number} x The x coordinate of the descendant tile
 * @param {Number} y The y coordinate of the descendant tile
 * @param {Number} [z] The z coordinate of the descendant tile (octree only)
 * @returns {Object} An object with the 3DTILES_bounding_volume_S2 extension.
 * @private
 */
function deriveBoundingVolumeS2(
  parentIsPlaceholderTile,
  parentTile,
  childIndex,
  level,
  x,
  y,
  z
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bool("parentIsPlaceholderTile", parentIsPlaceholderTile);
  Check.typeOf.object("parentTile", parentTile);
  Check.typeOf.number("childIndex", childIndex);
  Check.typeOf.number("level", level);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  if (defined(z)) {
    Check.typeOf.number("z", z);
  }
  //>>includeEnd('debug');

  const boundingVolumeS2 = parentTile._boundingVolume;

  // Handle the placeholder tile case, where we just duplicate the placeholder's bounding volume.
  if (parentIsPlaceholderTile) {
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

  // Extract the first 3 face bits from the 64-bit S2 cell ID.
  // eslint-disable-next-line no-undef
  const face = Number(parentTile._boundingVolume.s2Cell._cellId >> BigInt(61));
  // The Hilbert curve is rotated for the "odd" faces on the S2 Earthcube.
  // See http://s2geometry.io/devguide/img/s2cell_global.jpg
  const position =
    face % 2 === 0
      ? HilbertOrder.encode2D(level, x, y)
      : HilbertOrder.encode2D(level, y, x);
  // eslint-disable-next-line no-undef
  const cell = S2Cell.fromFacePositionLevel(face, BigInt(position), level);

  let minHeight, maxHeight;
  if (defined(z)) {
    const midpointHeight =
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
        token: S2Cell.getTokenFromId(cell._cellId),
        minimumHeight: minHeight,
        maximumHeight: maxHeight,
      },
    },
  };
}

const scratchScaleFactors = new Cartesian3();
const scratchRootCenter = new Cartesian3();
const scratchCenter = new Cartesian3();
const scratchHalfAxes = new Matrix3();
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

  const rootCenter = Cartesian3.unpack(rootBox, 0, scratchRootCenter);
  const rootHalfAxes = Matrix3.unpack(rootBox, 3, scratchHalfAxes);

  const tileScale = Math.pow(2, -level);
  const modelSpaceX = -1 + (2 * x + 1) * tileScale;
  const modelSpaceY = -1 + (2 * y + 1) * tileScale;

  let modelSpaceZ = 0;
  const scaleFactors = Cartesian3.fromElements(
    tileScale,
    tileScale,
    1,
    scratchScaleFactors
  );

  if (defined(z)) {
    modelSpaceZ = -1 + (2 * z + 1) * tileScale;
    scaleFactors.z = tileScale;
  }

  let center = Cartesian3.fromElements(
    modelSpaceX,
    modelSpaceY,
    modelSpaceZ,
    scratchCenter
  );
  center = Matrix3.multiplyByVector(rootHalfAxes, center, scratchCenter);
  center = Cartesian3.add(center, rootCenter, scratchCenter);

  let halfAxes = Matrix3.clone(rootHalfAxes);
  halfAxes = Matrix3.multiplyByScale(halfAxes, scaleFactors, halfAxes);

  const childBox = new Array(12);
  Cartesian3.pack(center, childBox);
  Matrix3.pack(halfAxes, childBox, 3);
  return childBox;
}

const scratchRectangle = new Rectangle();
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

  const rectangle = Rectangle.unpack(rootRegion, 0, scratchRectangle);
  const rootMinimumHeight = rootRegion[4];
  const rootMaximumHeight = rootRegion[5];
  const tileScale = Math.pow(2, -level);

  const childWidth = tileScale * rectangle.width;
  const west = CesiumMath.negativePiToPi(rectangle.west + x * childWidth);
  const east = CesiumMath.negativePiToPi(west + childWidth);

  const childHeight = tileScale * rectangle.height;
  const south = CesiumMath.negativePiToPi(rectangle.south + y * childHeight);
  const north = CesiumMath.negativePiToPi(south + childHeight);

  // Height is only subdivided for octrees; It remains constant for quadtrees.
  let minimumHeight = rootMinimumHeight;
  let maximumHeight = rootMaximumHeight;
  if (defined(z)) {
    const childThickness = tileScale * (rootMaximumHeight - rootMinimumHeight);
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
  const implicitTileset = content._implicitTileset;
  const implicitCoordinates = parentTile.implicitCoordinates.getChildCoordinates(
    childIndex
  );

  const childBoundingVolume = deriveBoundingVolume(
    implicitTileset,
    implicitCoordinates,
    childIndex,
    false,
    parentTile
  );

  // Ignore tile metadata when computing geometric error for the placeholder tile
  // since the child subtree's metadata hasn't been loaded yet.
  // The actual geometric error will be computed in deriveChildTile.
  const childGeometricError = getGeometricError(
    undefined,
    implicitTileset,
    implicitCoordinates
  );

  const childContentUri = implicitTileset.subtreeUriTemplate.getDerivedResource(
    {
      templateValues: implicitCoordinates.getTemplateValues(),
    }
  ).url;
  const tileJson = {
    boundingVolume: childBoundingVolume,
    geometricError: childGeometricError,
    refine: implicitTileset.refine,
    contents: [
      {
        uri: childContentUri,
      },
    ],
  };

  const tile = makeTile(
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
  const Cesium3DTile = content._tile.constructor;
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
