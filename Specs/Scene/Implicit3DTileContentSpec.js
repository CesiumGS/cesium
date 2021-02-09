import {
  Cartesian3,
  Cesium3DTile,
  Cesium3DTileRefine,
  Implicit3DTileContent,
  ImplicitTileCoordinates,
  ImplicitTileset,
  Matrix3,
  Matrix4,
  Resource,
  TileOrientedBoundingBox,
} from "../../Source/Cesium.js";
import ImplicitTilingTester from "../ImplicitTilingTester.js";

describe("Scene/Implicit3DTileContent", function () {
  var tilesetResource = new Resource({
    url: "https://example.com/tileset.json",
  });
  var mockTileset = {
    modelMatrix: Matrix4.IDENTITY,
  };

  var tileJson = {
    geometricError: 800,
    refine: "ADD",
    boundingVolume: {
      box: [0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256],
    },
    content: {
      uri: "https://example.com/{level}/{x}/{y}.b3dm",
    },
    extensions: {
      "3DTILES_implicit_tiling": {
        subdivisionScheme: "QUADTREE",
        subtreeLevels: 2,
        maximumLevel: 1,
        subtrees: {
          uri: "https://example.com/{level}/{x}/{y}.subtree",
        },
      },
    },
  };
  var implicitTileset = new ImplicitTileset(tilesetResource, tileJson);

  var quadtreeBuffer = ImplicitTilingTester.generateSubtreeBuffers({
    tileAvailability: {
      descriptor: "11010",
      bitLength: 5,
      isInternal: true,
    },
    contentAvailability: {
      descriptor: "01010",
      bitLength: 5,
      isInternal: true,
    },
    childSubtreeAvailability: {
      descriptor: "1111000011110000",
      bitLength: 16,
      isInternal: true,
    },
  }).subtreeBuffer;

  var rootCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: implicitTileset.subdivisionScheme,
    level: 0,
    x: 0,
    y: 0,
    z: 0,
  });

  function gatherTilesPreorder(tile, minLevel, maxLevel, result) {
    var level = tile.implicitCoordinates.level;
    if (minLevel <= level && level <= maxLevel) {
      result.push(tile);
    }

    for (var i = 0; i < tile.children.length; i++) {
      gatherTilesPreorder(tile.children[i], minLevel, maxLevel, result);
    }
  }

  var mockParentTile;
  var mockPlaceholderTile;
  beforeEach(function () {
    mockParentTile = new Cesium3DTile(mockTileset, tilesetResource, {
      geometricError: 400,
      boundingVolume: {
        box: [0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256],
      },
      children: [],
    });
    mockPlaceholderTile = new Cesium3DTile(mockTileset, tilesetResource, {
      geometricError: 400,
      boundingVolume: {
        box: [0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256],
      },
    });
    mockPlaceholderTile.implicitCoordinates = rootCoordinates;
    mockPlaceholderTile.implicitTileset = implicitTileset;

    mockParentTile.children.push(mockPlaceholderTile);
    mockPlaceholderTile.parent = mockParentTile;
  });

  it("expands subtree", function () {
    var content = new Implicit3DTileContent(
      mockTileset,
      mockPlaceholderTile,
      tilesetResource,
      quadtreeBuffer,
      0
    );
    return content.readyPromise.then(function () {
      var expectedChildrenCounts = [2, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0];
      var tiles = [];
      var subtreeRootTile = mockParentTile.children[0];
      gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
      expect(expectedChildrenCounts.length).toEqual(tiles.length);
      for (var i = 0; i < tiles.length; i++) {
        expect(tiles[i].children.length).toEqual(expectedChildrenCounts[i]);
      }
    });
  });

  it("sets tile coordinates on each tile", function () {
    var content = new Implicit3DTileContent(
      mockTileset,
      mockPlaceholderTile,
      tilesetResource,
      quadtreeBuffer,
      0
    );
    return content.readyPromise.then(function () {
      var expectedCoordinates = [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [2, 1, 0],
        [2, 0, 1],
        [2, 1, 1],
        [1, 0, 1],
        [2, 0, 2],
        [2, 1, 2],
        [2, 0, 3],
        [2, 1, 3],
      ];
      var tiles = [];
      var subtreeRootTile = mockParentTile.children[0];
      gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
      for (var i = 0; i < tiles.length; i++) {
        var expected = expectedCoordinates[i];
        var coordinates = new ImplicitTileCoordinates({
          subdivisionScheme: implicitTileset.subdivisionScheme,
          level: expected[0],
          x: expected[1],
          y: expected[2],
        });
        expect(tiles[i].implicitCoordinates).toEqual(coordinates);
      }
    });
  });

  it("templates content URIs for each tile with content", function () {
    var content = new Implicit3DTileContent(
      mockTileset,
      mockPlaceholderTile,
      tilesetResource,
      quadtreeBuffer,
      0
    );
    return content.readyPromise.then(function () {
      var expectedCoordinates = [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
      ];
      var contentAvailability = [false, true, true];
      var templateUri = implicitTileset.contentUriTemplate;
      var subtreeRootTile = mockParentTile.children[0];
      var tiles = [];
      gatherTilesPreorder(subtreeRootTile, 0, 1, tiles);
      expect(expectedCoordinates.length).toEqual(tiles.length);
      for (var i = 0; i < tiles.length; i++) {
        var expected = expectedCoordinates[i];
        var coordinates = new ImplicitTileCoordinates({
          subdivisionScheme: implicitTileset.subdivisionScheme,
          level: expected[0],
          x: expected[1],
          y: expected[2],
        });
        var expectedResource = templateUri.getDerivedResource({
          templateValues: coordinates.getTemplateValues(),
        });
        if (contentAvailability[i]) {
          expect(tiles[i]._contentResource.url).toEqual(expectedResource.url);
        } else {
          expect(tiles[i]._contentResource).not.toBeDefined();
        }
      }
    });
  });

  it("constructs placeholder tiles for child subtrees", function () {
    var content = new Implicit3DTileContent(
      mockTileset,
      mockPlaceholderTile,
      tilesetResource,
      quadtreeBuffer,
      0
    );
    return content.readyPromise.then(function () {
      var expectedCoordinates = [
        [2, 0, 0],
        [2, 1, 0],
        [2, 0, 1],
        [2, 1, 1],
        [2, 0, 2],
        [2, 1, 2],
        [2, 0, 3],
        [2, 1, 3],
      ];
      var templateUri = implicitTileset.subtreeUriTemplate;
      var subtreeRootTile = mockParentTile.children[0];
      var tiles = [];
      gatherTilesPreorder(subtreeRootTile, 2, 2, tiles);

      expect(expectedCoordinates.length).toEqual(tiles.length);
      for (var i = 0; i < tiles.length; i++) {
        var expected = expectedCoordinates[i];
        var coordinates = new ImplicitTileCoordinates({
          subdivisionScheme: implicitTileset.subdivisionScheme,
          level: expected[0],
          x: expected[1],
          y: expected[2],
        });
        var expectedResource = templateUri.getDerivedResource({
          templateValues: coordinates.getTemplateValues(),
        });
        var placeholderTile = tiles[i];
        expect(placeholderTile._contentResource.url).toEqual(
          expectedResource.url
        );
        expect(placeholderTile.implicitTileset).toBeDefined();
        expect(placeholderTile.implicitCoordinates).toBeDefined();
      }
    });
  });

  it("propagates refine down the tree", function () {
    var content = new Implicit3DTileContent(
      mockTileset,
      mockPlaceholderTile,
      tilesetResource,
      quadtreeBuffer,
      0
    );
    var refine =
      implicitTileset.refine === "ADD"
        ? Cesium3DTileRefine.ADD
        : Cesium3DTileRefine.REPLACE;
    return content.readyPromise.then(function () {
      var subtreeRootTile = mockParentTile.children[0];
      var tiles = [];
      gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
      for (var i = 0; i < tiles.length; i++) {
        expect(tiles[i].refine).toEqual(refine);
      }
    });
  });

  it("divides the geometricError by 2 for each level of the tree", function () {
    var content = new Implicit3DTileContent(
      mockTileset,
      mockPlaceholderTile,
      tilesetResource,
      quadtreeBuffer,
      0
    );
    var rootGeometricError = implicitTileset.geometricError;
    return content.readyPromise.then(function () {
      var subtreeRootTile = mockParentTile.children[0];
      var tiles = [];
      gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
      for (var i = 0; i < tiles.length; i++) {
        var level = tiles[i].implicitCoordinates.level;
        expect(tiles[i].geometricError).toEqual(
          rootGeometricError / Math.pow(2, level)
        );
      }
    });
  });

  it("subdivides bounding volumes for each tile", function () {
    var content = new Implicit3DTileContent(
      mockTileset,
      mockPlaceholderTile,
      tilesetResource,
      quadtreeBuffer,
      0
    );
    return content.readyPromise.then(function () {
      var expectedCoordinates = [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [2, 1, 0],
        [2, 0, 1],
        [2, 1, 1],
        [1, 0, 1],
        [2, 0, 2],
        [2, 1, 2],
        [2, 0, 3],
        [2, 1, 3],
      ];
      var rootBoundingVolume = new TileOrientedBoundingBox(
        new Cartesian3(),
        new Matrix3(256, 0, 0, 0, 256, 0, 0, 0, 256)
      );

      var subtreeRootTile = mockParentTile.children[0];
      var tiles = [];
      gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);

      expect(expectedCoordinates.length).toEqual(tiles.length);
      for (var i = 0; i < tiles.length; i++) {
        var coordinates = expectedCoordinates[i];
        var expectedBounds = rootBoundingVolume.deriveVolume(
          coordinates[0],
          coordinates[1],
          coordinates[2]
        );
        expect(tiles[i].boundingVolume).toEqual(expectedBounds);
      }
    });
  });

  it("puts the root tile inside the placeholder tile if no parent is given", function () {
    mockPlaceholderTile.parent = undefined;
    var content = new Implicit3DTileContent(
      mockTileset,
      mockPlaceholderTile,
      tilesetResource,
      quadtreeBuffer,
      0
    );
    return content.readyPromise.then(function () {
      expect(mockPlaceholderTile.children.length).toEqual(1);
    });
  });

  it("replaces the placeholder tile if a parent is given", function () {
    var content = new Implicit3DTileContent(
      mockTileset,
      mockPlaceholderTile,
      tilesetResource,
      quadtreeBuffer,
      0
    );
    return content.readyPromise.then(function () {
      var index = mockParentTile.children.indexOf(mockPlaceholderTile);
      expect(index).toEqual(-1);
      expect(mockParentTile.children.length).toEqual(1);
      expect(mockPlaceholderTile.children.length).toEqual(0);
    });
  });
});
