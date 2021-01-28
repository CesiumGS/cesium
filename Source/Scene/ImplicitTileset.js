import defined from "../Core/defined.js";
import Cesium3DTile from "./Cesium3DTile.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";
import ImplicitTileCoordinates from "./ImplicitTileCoordinates.js";
import ImplicitTemplateUri from "./ImplicitTemplateUri.js";
import Cartesian3 from "../Core/Cartesian3.js";
import DeveloperError from "../Core/DeveloperError.js";

// TODO: Mark everything as private
export default function ImplicitTileset(
  tileset,
  resource,
  tileJson,
  extensionJson
) {
  this._tileset = tileset;
  this._resource = resource;
  this._tileJson = tileJson;
  this.geometricError = tileJson.geometricError;

  //>>includeStart('debug', pragmas.debug);
  if (defined(tileJson.boundingVolume.sphere)) {
    throw new DeveloperError(
      "Only box and region are supported for implicit tiling"
    );
  }
  //>>includeEnd('debug');

  // TODO: parse this?
  this.boundingVolume = tileJson.boundingVolume;
  this.refine = tileJson.refine;
  this.contentUriTemplate = new ImplicitTemplateUri(tileJson.content.uri);

  var extension = extensionJson["3DTILES_implicit_tiling"];
  this.subdivisionScheme =
    extension.subdivisionScheme.toUpperCase() === "OCTREE"
      ? ImplicitSubdivisionScheme.OCTREE
      : ImplicitSubdivisionScheme.QUADTREE;
  this.branchingFactor = ImplicitSubdivisionScheme.getBranchingFactor(
    this.subdivisionScheme
  );
  this.subtreeLevels = extension.subtreeLevels;
  this.maximumLevel = extension.maximumLevel;
  this.subtreeUriTemplate = new ImplicitTemplateUri(extension.subtrees.uri);
}

ImplicitTileset.prototype.makeRootPlaceholderTile = function (parentTile) {
  var rootCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: this.subdivisionScheme,
    level: 0,
    x: 0,
    y: 0,
    // The constructor will only use this for octrees.
    z: 0,
  });

  var contentJson = {
    content: {
      uri: this.subtreeUriTemplate.substitute(rootCoordinates),
    },
  };

  // TODO: use combine.js
  var tileJson = Object.assign({}, this._tileJson, contentJson);
  var tile = new Cesium3DTile(
    this._tileset,
    this._resource,
    tileJson,
    parentTile
  );
  tile.implicitTileset = this;
  tile.implicitCoordinates = rootCoordinates;
  return tile;
};

ImplicitTileset.prototype.listChildSubtrees = function (subtree, bottomRow) {
  var results = [];
  var branchingFactor = this.branchingFactor;
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
};

ImplicitTileset.prototype.transcodeSubtreeTiles = function (
  subtree,
  parentOfRootTile,
  childIndex
) {
  var rootBitIndex = 0;

  //>>includeStart('debug', pragmas.debug);
  if (!subtree.getTileAvailabilityBit(rootBitIndex)) {
    throw new DeveloperError("A subtree must have at least 1 available tile");
  }
  //>>includeEnd('debug');

  // TODO:
  var rootTile = this.deriveChildTile(
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

  for (var level = 1; level < this.subtreeLevels; level++) {
    var levelOffset = subtree.getLevelOffset(level);
    var numberOfChildren = this.branchingFactor * parentRow.length;
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
      var childIndex = childMortonIndex % this.branchingFactor;
      var childTile = this.deriveChildTile(
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
};

/**
 * Given a parent tile and information about which child to create, derive
 * the properties of the child tile implicitly.
 *
 * This creates a real tile for rendering, not a placeholder tile like some of
 * the other methods of ImplicitTileset.
 *
 * @param {ImplicitSubtree} subtree The subtree the child tile belongs to
 * @param {Cesium3DTile|undefined} parentTile The parent of the new child tile
 * @param {Number} childIndex The index of the child within the parentTile.children array.
 * @param {Number} childBitIndex The index of the child tile within the tile's availability information.
 * @return {Cesium3DTile} the new child tile.
 */
ImplicitTileset.prototype.deriveChildTile = function (
  subtree,
  parentTile,
  childIndex,
  childBitIndex
) {
  var implicitCoordinates;
  if (!defined(parentTile)) {
    implicitCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: this.subdivisionScheme,
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

  var content;
  if (subtree.getContentAvailabilityBit(childBitIndex)) {
    content = {
      uri: this.contentUriTemplate.substitute(implicitCoordinates),
    };
  }

  var boundingVolume = this.deriveBoundingVolume(implicitCoordinates);
  var tileJson = {
    boundingVolume: boundingVolume,
    // geometricError / 2^level
    geometricError: this.geometricError / (1 << implicitCoordinates.level),
    refine: this.refine,
    content: content,
  };

  var childTile = new Cesium3DTile(
    this._tileset,
    this._resource,
    tileJson,
    parentTile
  );
  childTile.implicitCoordinates = implicitCoordinates;
  return childTile;
};

// TODO: Check terrain code for this.
var ones = new Cartesian3(1, 1, 1);
var scratchNumberOfTiles = new Cartesian3();
var scratchCoordinatesVector = new Cartesian3();
var scratchRelativeDimensions = new Cartesian3();
var scratchRelativeCorner = new Cartesian3();
var scratchRootDimensions = new Cartesian3();
var scratchDimensions = new Cartesian3();
var scratchRootCorner = new Cartesian3();
var scratchCorner = new Cartesian3();
ImplicitTileset.prototype.deriveBoundingVolume = function (
  implicitCoordinates
) {
  var boundingVolume = this.boundingVolume;

  var tilesPerSide = Math.pow(2, implicitCoordinates.level);

  var numberOfTiles;
  var coordinates;
  if (
    implicitCoordinates.subdivisionScheme == ImplicitSubdivisionScheme.QUADTREE
  ) {
    numberOfTiles = Cartesian3.fromElements(
      tilesPerSide,
      tilesPerSide,
      1,
      scratchNumberOfTiles
    );
    coordinates = Cartesian3.fromElements(
      implicitCoordinates.x,
      implicitCoordinates.y,
      0,
      scratchCoordinatesVector
    );
  } else {
    numberOfTiles = new Cartesian3(tilesPerSide, tilesPerSide, tilesPerSide);
    coordinates = new Cartesian3(
      implicitCoordinates.x,
      implicitCoordinates.y,
      implicitCoordinates.z
    );
  }

  // corner and dimensions as a fraction of the root volume's dimensions
  var relativeDimensions = Cartesian3.divideComponents(
    ones,
    numberOfTiles,
    scratchRelativeDimensions
  );
  var relativeCorner = Cartesian3.multiplyComponents(
    coordinates,
    relativeDimensions,
    scratchRelativeCorner
  );

  if (defined(boundingVolume.region)) {
    var region = boundingVolume.region;
    var west = region[0];
    var south = region[1];
    var east = region[2];
    var north = region[3];
    var minimumHeight = region[4];
    var maximumHeight = region[5];

    var rootDimensions = Cartesian3.fromElements(
      east - west,
      north - south,
      maximumHeight - minimumHeight,
      scratchRootDimensions
    );
    var dimensions = Cartesian3.multiplyComponents(
      relativeDimensions,
      rootDimensions,
      scratchDimensions
    );

    var rootCorner = Cartesian3.fromElements(
      west,
      south,
      minimumHeight,
      scratchRootCorner
    );
    var corner = Cartesian3.multiplyComponents(
      relativeCorner,
      rootDimensions,
      scratchCorner
    );
    corner = Cartesian3.add(corner, rootCorner, scratchCorner);

    return {
      region: [
        corner.x,
        corner.y,
        corner.x + dimensions.x,
        corner.y + dimensions.y,
        corner.z,
        corner.z + dimensions.z,
      ],
    };
  }
  //box
  throw new DeveloperError("Not implemented yet!");
};

/**
 * Create a placeholder 3D Tile whose content will be an Implicit3DTileContent
 * for lazy evaluation of a child subtree.
 * @param {Cesium3DTile} parentTile The parent of the new child subtree.
 * @param {Number} childIndex The index i in the parentTile.children array.
 */
ImplicitTileset.prototype.makePlaceholderChildSubtree = function (
  parentTile,
  childIndex
) {
  var implicitCoordinates = parentTile.implicitCoordinates.deriveChildCoordinates(
    childIndex
  );

  var boundingVolume = this.deriveBoundingVolume(implicitCoordinates);
  var tileJson = {
    boundingVolume: boundingVolume,
    // geometricError / 2^level
    geometricError: this.geometricError / (1 << implicitCoordinates.level),
    refine: this.refine,
    content: {
      uri: this.subtreeUriTemplate.substitute(implicitCoordinates),
    },
  };

  var tile = new Cesium3DTile(
    this._tileset,
    this._resource,
    tileJson,
    parentTile
  );
  tile.implicitTileset = this;
  tile.implicitCoordinates = implicitCoordinates;
  return tile;
};
