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
} from "../../Source/Cesium.js";
import CesiumMath from "../../Source/Core/Math.js";
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

  function getBoundingBoxArray(tile) {
    var boundingBox = tile.boundingVolume.boundingVolume;
    var box = new Array(12);
    Cartesian3.pack(boundingBox.center, box);
    Matrix3.pack(boundingBox.halfAxes, box, 3);
    return box;
  }

  var mockPlaceholderTile;
  beforeEach(function () {
    mockPlaceholderTile = new Cesium3DTile(mockTileset, tilesetResource, {
      geometricError: 400,
      boundingVolume: {
        box: [0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256],
      },
    });
    mockPlaceholderTile.implicitCoordinates = rootCoordinates;
    mockPlaceholderTile.implicitTileset = implicitTileset;
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
      var subtreeRootTile = mockPlaceholderTile.children[0];
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
      var subtreeRootTile = mockPlaceholderTile.children[0];
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
      var subtreeRootTile = mockPlaceholderTile.children[0];
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
      var subtreeRootTile = mockPlaceholderTile.children[0];
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
      var subtreeRootTile = mockPlaceholderTile.children[0];
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
      var subtreeRootTile = mockPlaceholderTile.children[0];
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
      var rootBoundingVolume = [0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256];

      var subtreeRootTile = mockPlaceholderTile.children[0];
      var tiles = [];
      gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);

      expect(expectedCoordinates.length).toEqual(tiles.length);
      for (var i = 0; i < tiles.length; i++) {
        var coordinates = expectedCoordinates[i];

        var boundingBox = tiles[i].boundingVolume.boundingVolume;
        var childBox = new Array(12);
        Cartesian3.pack(boundingBox.center, childBox);
        Matrix3.pack(boundingBox.halfAxes, childBox, 3);

        var expectedBounds = Implicit3DTileContent._deriveBoundingBox(
          rootBoundingVolume,
          coordinates[0],
          coordinates[1],
          coordinates[2]
        );
        expect(childBox).toEqual(expectedBounds);
      }
    });
  });

  it("handles deeper subtrees correctly", function () {
    mockPlaceholderTile.implicitCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitTileset.subdivisionScheme,
      level: 2,
      x: 2,
      y: 1,
    });
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

    var parentCoordinates = mockPlaceholderTile.implicitCoordinates;
    var childCoordinates = parentCoordinates.deriveChildCoordinates(0);

    var parentGeometricError = implicitTileset.geometricError / 4;
    var childGeometricError = implicitTileset.geometricError / 8;

    var rootBoundingVolume = [0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256];
    var parentBox = Implicit3DTileContent._deriveBoundingBox(
      rootBoundingVolume,
      parentCoordinates.level,
      parentCoordinates.x,
      parentCoordinates.y
    );
    var childBox = Implicit3DTileContent._deriveBoundingBox(
      rootBoundingVolume,
      childCoordinates.level,
      childCoordinates.x,
      childCoordinates.y
    );

    return content.readyPromise.then(function () {
      var subtreeRootTile = mockPlaceholderTile.children[0];
      var childTile = subtreeRootTile.children[0];
      expect(subtreeRootTile.implicitCoordinates).toEqual(parentCoordinates);
      expect(childTile.implicitCoordinates).toEqual(childCoordinates);

      expect(subtreeRootTile.refine).toEqual(refine);
      expect(childTile.refine).toEqual(refine);

      expect(subtreeRootTile.geometricError).toEqual(parentGeometricError);
      expect(childTile.geometricError).toEqual(childGeometricError);

      expect(getBoundingBoxArray(subtreeRootTile)).toEqual(parentBox);
      expect(getBoundingBoxArray(childTile)).toEqual(childBox);
    });
  });

  it("puts the root tile inside the placeholder tile", function () {
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

  describe("_deriveBoundingBox", function () {
    var deriveBoundingBox = Implicit3DTileContent._deriveBoundingBox;
    var simpleBoundingBox = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
    it("throws if rootBox is undefined", function () {
      expect(function () {
        deriveBoundingBox(undefined, 0, 0, 0);
      }).toThrowDeveloperError();
    });

    it("throws if level is undefined", function () {
      expect(function () {
        deriveBoundingBox(simpleBoundingBox, undefined, 0, 0);
      }).toThrowDeveloperError();
    });

    it("throws if x is undefined", function () {
      expect(function () {
        deriveBoundingBox(simpleBoundingBox, 1, undefined, 0);
      }).toThrowDeveloperError();
    });

    it("throws if y is undefined", function () {
      expect(function () {
        deriveBoundingBox(simpleBoundingBox, 1, 0, undefined);
      }).toThrowDeveloperError();
    });

    it("subdivides like a quadtree if z is not given", function () {
      var tile = [1, 3, 0, 4, 0, 0, 0, 2, 0, 0, 0, 1];
      var expected = [0, 1.5, 0, 1, 0, 0, 0, 0.5, 0, 0, 0, 1];
      var result = deriveBoundingBox(tile, 2, 1, 0);
      expect(result).toEqual(expected);
    });

    it("subdivides like an octree if z is given", function () {
      var tile = [1, 3, 0, 4, 0, 0, 0, 2, 0, 0, 0, 1];
      var expected = [0, 1.5, 0.25, 1, 0, 0, 0, 0.5, 0, 0, 0, 0.25];
      var result = deriveBoundingBox(tile, 2, 1, 0, 2);
      expect(result).toEqual(expected);
    });

    it("handles rotation and non-uniform scaling correctly", function () {
      var tile = [1, 2, 3, 0, 4, 0, 0, 0, 2, 1, 0, 0];
      var expected = [1.25, 1, 1.5, 0, 1, 0, 0, 0, 0.5, 0.25, 0, 0];
      var result = deriveBoundingBox(tile, 2, 1, 0, 2);
      expect(result).toEqual(expected);
    });
  });

  describe("_deriveBoundingRegion", function () {
    var deriveBoundingRegion = Implicit3DTileContent._deriveBoundingRegion;
    var simpleRegion = [
      0,
      0,
      CesiumMath.PI_OVER_FOUR,
      CesiumMath.PI_OVER_FOUR,
      0,
      100,
    ];
    it("throws if rootRegion is undefined", function () {
      expect(function () {
        deriveBoundingRegion(undefined, 1, 0, 0);
      }).toThrowDeveloperError();
    });

    it("throws if level is undefined", function () {
      expect(function () {
        deriveBoundingRegion(simpleRegion, undefined, 0, 0);
      }).toThrowDeveloperError();
    });

    it("throws if x is undefined", function () {
      expect(function () {
        deriveBoundingRegion(simpleRegion, 1, undefined, 0);
      }).toThrowDeveloperError();
    });

    it("throws if y is undefined", function () {
      expect(function () {
        deriveBoundingRegion(simpleRegion, 1, 0, undefined);
      }).toThrowDeveloperError();
    });

    function makeRectangle(
      westDegrees,
      southDegrees,
      eastDegrees,
      northDegrees,
      minimumHeight,
      maximumHeight
    ) {
      return [
        CesiumMath.toRadians(westDegrees),
        CesiumMath.toRadians(southDegrees),
        CesiumMath.toRadians(eastDegrees),
        CesiumMath.toRadians(northDegrees),
        minimumHeight,
        maximumHeight,
      ];
    }

    it("subdivides like a quadtree if z is not given", function () {
      // 4x4 degree rectangle so the subdivisions at level 2 will
      // be 1 degree each
      var tile = makeRectangle(-1, -2, 3, 2, 0, 20);
      var expected = makeRectangle(0, 1, 1, 2, 0, 20);

      var result = deriveBoundingRegion(tile, 2, 1, 3);
      expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON9);
    });

    it("deriveVolume subdivides like an octree if z is given", function () {
      // 4x4 degree rectangle so the subdivisions at level 2 will
      // be 1 degree each
      var tile = makeRectangle(-1, -2, 3, 2, 0, 20);
      var expected = makeRectangle(0, 1, 1, 2, 10, 15);

      var result = deriveBoundingRegion(tile, 2, 1, 3, 2);
      expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON9);
    });

    it("handles the IDL", function () {
      var tile = makeRectangle(90, -45, -90, 45, 0, 20);
      var expected = makeRectangle(180, -45, -90, 0, 0, 20);

      var result = deriveBoundingRegion(tile, 1, 1, 0);
      expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON9);
    });
  });
});
