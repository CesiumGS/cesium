import defined from "../Core/defined";
import Cesium3DTile from "./Cesium3DTile";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme";
import ImplicitTileCoordinates from "./ImplicitTileCoordinates";

export default function ImplicitTileset(tileJson, extensionJson) {
  this.geometricError = tileJson.geometricError;

  // TODO: parse this?
  // TODO: check that this is not box
  this.boundingVolume = tileJson.boundingVolume;
  this.refine = tileJson.refine;

  var extension = tileJson.extensions["3DTILES_implicit_tiling"];
  this.subdivisionScheme =
    extension.subdivisionScheme.toUpperCase() === "OCTREE"
      ? ImplicitSubdivisionScheme.OCTREE
      : ImplicitSubdivisionScheme.QUADTREE;
  this.subtreeLevels = extension.subtreeLevels;
  this.maximumLevel = extension.maximumLevel;
  this.subtreeUriTemplate = new ImplicitTemplateUri(extension.subtrees.uri);
  this.contentUriTemplate = new ImplicitTemplateUri(extension.content.uri);
}

ImplicitTileset.prototype.makeRootTile = function (
  tileset,
  baseResource,
  parentTile
) {
  var rootCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: this.subdivisionScheme,
    level: 0,
    x: 0,
    y: 0,
    // The constructor will only store this for octrees.
    z: 0,
  });

  var contentJson = {
    content: {
      uri: this.contentUriTemplate.substitute(rootCoordinates),
    },
  };

  var tileJson = Object.assign({}, this.tileJson, content);
  var tile = new Cesium3DTile(tileset, baseResource, tileJson, parentTile);
  tile.implicitCoordinates = rootCoordinates;
  return tile;
};

ImplicitTileset.prototype.listChildSubtrees = function (subtree, bottomRow) {
  var results = [];
  var branchingFactor = ImplicitSubdivisionScheme.getBranchingFactor(
    this.branchingFactor
  );
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

ImplicitTileset.prototype.deriveTile = function (
  subtree,
  parentTile,
  childIndex
) {
  var implicitCoordinates = parentTile.implicitCoordinates.deriveChildCoordinates(
    childIndex
  );

  var content;
  if (subtree.contentAvailability[tileIndex]) {
    content = {
      uri: this.contentUriTemplate.substitute(implicitCoordinates),
    };
  }

  var boundingVolume = this.deriveBoundingVolume(implicitCoordinates);
  var tileJson = {
    boundingVolume: boundingVolume,
    geometricError: parentTile.geometricError / 2,
    refine: parentTile.refine,
    content: content,
  };

  var childTile = new Cesium3DTile(
    this.tileset,
    this.resource,
    tileJson,
    parentTile
  );
  childTile.implicitCoordinates = implicitCoordinates;
  return childTile;
};
