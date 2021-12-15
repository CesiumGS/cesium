import {
  Batched3DModel3DTileContent,
  Cartesian3,
  Cesium3DTile,
  Cesium3DTileRefine,
  Cesium3DTileset,
  Ellipsoid,
  HeadingPitchRange,
  Implicit3DTileContent,
  ImplicitSubdivisionScheme,
  ImplicitTileCoordinates,
  ImplicitTileset,
  Matrix3,
  Matrix4,
  MetadataClass,
  GroupMetadata,
  Multiple3DTileContent,
  Resource,
  TileBoundingSphere,
  TileBoundingS2Cell,
} from "../../Source/Cesium.js";
import CesiumMath from "../../Source/Core/Math.js";
import ImplicitTilingTester from "../ImplicitTilingTester.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/Implicit3DTileContent",
  function () {
    var tilesetResource = new Resource({
      url: "https://example.com/tileset.json",
    });
    var mockTileset = {
      modelMatrix: Matrix4.IDENTITY,
    };
    var metadataSchema; // intentionally left undefined

    var tileJson = {
      geometricError: 800,
      refine: "ADD",
      boundingVolume: {
        box: [0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256],
      },
      content: {
        uri: "https://example.com/{level}/{x}/{y}.b3dm",
        extras: {
          author: "Cesium",
        },
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
      extras: {
        year: "2021",
      },
    };

    var implicitTileset = new ImplicitTileset(
      tilesetResource,
      tileJson,
      metadataSchema
    );

    var quadtreeBuffer = ImplicitTilingTester.generateSubtreeBuffers({
      tileAvailability: {
        descriptor: "11010",
        bitLength: 5,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "01010",
          bitLength: 5,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "1111000011110000",
        bitLength: 16,
        isInternal: true,
      },
    }).subtreeBuffer;

    var rootCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitTileset.subdivisionScheme,
      subtreeLevels: implicitTileset.subtreeLevels,
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

    var scene;

    // This scene is the same as Composite/Composite, just rephrased
    // using 3DTILES_multiple_contents
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

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

      // One item in each data set is always located in the center, so point the camera there
      var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 26.0));
    });

    afterEach(function () {
      scene.primitives.removeAll();
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
            subtreeLevels: implicitTileset.subtreeLevels,
            level: expected[0],
            x: expected[1],
            y: expected[2],
          });
          expect(tiles[i].implicitCoordinates).toEqual(coordinates);
        }
      });
    });

    it("handles deeper subtrees correctly", function () {
      mockPlaceholderTile.implicitCoordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitTileset.subdivisionScheme,
        subtreeLevels: implicitTileset.subtreeLevels,
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
      var childCoordinates = parentCoordinates.getChildCoordinates(0);

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

    it("preserves tile extras", function () {
      var content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        expect(mockPlaceholderTile.children[0].extras).toEqual(tileJson.extras);
      });
    });

    it("stores a reference to the subtree in each transcoded tile", function () {
      var content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        expect(mockPlaceholderTile.implicitSubtree).not.toBeDefined();

        var subtreeRootTile = mockPlaceholderTile.children[0];
        var subtree = subtreeRootTile.implicitSubtree;
        expect(subtree).toBeDefined();

        var tiles = [];
        gatherTilesPreorder(subtreeRootTile, 0, 1, tiles);
        for (var i = 0; i < tiles.length; i++) {
          expect(tiles[i].implicitSubtree).toBe(subtree);
        }
      });
    });

    it("does not store references to subtrees in placeholder tiles", function () {
      var content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        expect(mockPlaceholderTile.implicitSubtree).not.toBeDefined();

        var subtreeRootTile = mockPlaceholderTile.children[0];

        var tiles = [];
        gatherTilesPreorder(subtreeRootTile, 2, 2, tiles);
        for (var i = 0; i < tiles.length; i++) {
          expect(tiles[i].implicitSubtree).not.toBeDefined();
        }
      });
    });

    it("destroys", function () {
      var content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        var subtree = content._implicitSubtree;
        expect(content.isDestroyed()).toBe(false);
        expect(subtree.isDestroyed()).toBe(false);

        content.destroy();
        expect(content.isDestroyed()).toBe(true);
        expect(subtree.isDestroyed()).toBe(true);
      });
    });

    it("returns default values for most Cesium3DTileContent properties", function () {
      var content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        quadtreeBuffer,
        0
      );

      expect(content.featurePropertiesDirty).toBe(false);
      expect(content.featuresLength).toBe(0);
      expect(content.pointsLength).toBe(0);
      expect(content.trianglesLength).toBe(0);
      expect(content.geometryByteLength).toBe(0);
      expect(content.texturesByteLength).toBe(0);
      expect(content.batchTableByteLength).toBe(0);
      expect(content.innerContents).not.toBeDefined();
      expect(content.tileset).toBe(mockTileset);
      expect(content.tile).toBe(mockPlaceholderTile);
      expect(content.batchTable).not.toBeDefined();
    });

    it("url returns the subtree url", function () {
      var content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        quadtreeBuffer,
        0
      );
      expect(content.url).toBe("https://example.com/0/0/0.subtree");
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
        var templateUri = implicitTileset.contentUriTemplates[0];
        var subtreeRootTile = mockPlaceholderTile.children[0];
        var tiles = [];
        gatherTilesPreorder(subtreeRootTile, 0, 1, tiles);
        expect(expectedCoordinates.length).toEqual(tiles.length);
        for (var i = 0; i < tiles.length; i++) {
          var expected = expectedCoordinates[i];
          var coordinates = new ImplicitTileCoordinates({
            subdivisionScheme: implicitTileset.subdivisionScheme,
            subtreeLevels: implicitTileset.subtreeLevels,
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
            subtreeLevels: implicitTileset.subtreeLevels,
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

    describe("_deriveBoundingVolumeS2", function () {
      var deriveBoundingVolumeS2 =
        Implicit3DTileContent._deriveBoundingVolumeS2;
      var simpleBoundingVolumeS2 = {
        token: "1",
        minimumHeight: 0,
        maximumHeight: 10,
      };
      var simpleBoundingVolumeS2Cell = new TileBoundingS2Cell(
        simpleBoundingVolumeS2
      );
      var implicitTilesetS2 = {
        boundingVolume: {
          extensions: {
            "3DTILES_bounding_volume_S2": simpleBoundingVolumeS2,
          },
        },
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      };

      it("throws if parentIsPlaceholderTile is undefined", function () {
        expect(function () {
          deriveBoundingVolumeS2(undefined, {}, 0, 0, 0, 0, 0);
        }).toThrowDeveloperError();
      });

      it("throws if parentTile is undefined", function () {
        expect(function () {
          deriveBoundingVolumeS2(false, undefined, 0, 0, 0, 0, 0);
        }).toThrowDeveloperError();
      });

      it("throws if childIndex is undefined", function () {
        expect(function () {
          deriveBoundingVolumeS2(false, {}, undefined, 0, 0, 0, 0);
        }).toThrowDeveloperError();
      });

      it("throws if level is undefined", function () {
        expect(function () {
          deriveBoundingVolumeS2(false, {}, 0, undefined, 0, 0, 0);
        }).toThrowDeveloperError();
      });

      it("throws if x is undefined", function () {
        expect(function () {
          deriveBoundingVolumeS2(false, {}, 0, 0, undefined, 0, 0);
        }).toThrowDeveloperError();
      });

      it("throws if y is undefined", function () {
        expect(function () {
          deriveBoundingVolumeS2(false, {}, 0, 0, 0, undefined, 0);
        }).toThrowDeveloperError();
      });

      it("throws if z is defined but not a number", function () {
        expect(function () {
          deriveBoundingVolumeS2(false, {}, 0, 0, 0, 0, "");
        }).toThrowDeveloperError();
      });

      it("returns implicit tileset boundingVolume if parentIsPlaceholderTile is true", function () {
        var placeholderTile = {
          _boundingVolume: simpleBoundingVolumeS2Cell,
        };
        var result = deriveBoundingVolumeS2(
          true,
          placeholderTile,
          0,
          0,
          0,
          0,
          0
        );
        expect(result).toEqual(implicitTilesetS2.boundingVolume);
        expect(result).not.toBe(implicitTilesetS2.boundingVolume);
      });

      it("subdivides correctly using QUADTREE", function () {
        var parentTile = {
          _boundingVolume: simpleBoundingVolumeS2Cell,
        };
        var expected = {
          token: "04",
          minimumHeight: 0,
          maximumHeight: 10,
        };
        var result = deriveBoundingVolumeS2(false, parentTile, 0, 1, 0, 0);
        expect(result).toEqual({
          extensions: {
            "3DTILES_bounding_volume_S2": expected,
          },
        });

        parentTile._boundingVolume = new TileBoundingS2Cell({
          token: "3",
          minimumHeight: 0,
          maximumHeight: 10,
        });
        expected = {
          token: "24",
          minimumHeight: 0,
          maximumHeight: 10,
        };
        result = deriveBoundingVolumeS2(false, parentTile, 0, 1, 0, 0);
        expect(result).toEqual({
          extensions: {
            "3DTILES_bounding_volume_S2": expected,
          },
        });
      });

      it("subdivides correctly using OCTREE", function () {
        implicitTilesetS2.subdivisionScheme = ImplicitSubdivisionScheme.OCTREE;
        var parentTile = {
          _boundingVolume: simpleBoundingVolumeS2Cell,
        };
        var expected0 = {
          token: "04",
          minimumHeight: 0,
          maximumHeight: 5,
        };
        var expected1 = {
          token: "04",
          minimumHeight: 5,
          maximumHeight: 10,
        };
        var result0 = deriveBoundingVolumeS2(false, parentTile, 0, 1, 0, 0, 0);
        expect(result0).toEqual({
          extensions: {
            "3DTILES_bounding_volume_S2": expected0,
          },
        });
        var result1 = deriveBoundingVolumeS2(false, parentTile, 4, 1, 0, 0, 0);
        expect(result1).toEqual({
          extensions: {
            "3DTILES_bounding_volume_S2": expected1,
          },
        });
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

    describe("3DTILES_multiple_contents", function () {
      var implicitMultipleContentsUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitMultipleContents/tileset.json";

      it("a single content is transcoded as a regular tile", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsUrl
        ).then(function (tileset) {
          // The root tile of this tileset only has one available content
          var transcodedRoot = tileset.root.children[0];
          var transcodedRootHeader = transcodedRoot._header;
          expect(transcodedRoot.content).toBeInstanceOf(
            Batched3DModel3DTileContent
          );
          expect(transcodedRootHeader.content).toEqual({
            uri: "ground/0/0/0.b3dm",
          });
          expect(transcodedRootHeader.extensions).not.toBeDefined();
        });
      });

      it("multiple contents are transcoded to a tile with a 3DTILES_multiple_contents extension", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsUrl
        ).then(function (tileset) {
          var childTiles = tileset.root.children[0].children;
          for (var i = 0; i < childTiles.length; i++) {
            var childTile = childTiles[i];
            var content = childTile.content;
            expect(content).toBeInstanceOf(Multiple3DTileContent);

            var childTileHeader = childTile._header;
            expect(childTileHeader.content).not.toBeDefined();
          }
        });
      });

      it("passes extensions through correctly", function () {
        var originalLoadJson = Cesium3DTileset.loadJson;
        var metadataExtension = {
          group: "buildings",
        };
        var otherExtension = {
          someKey: "someValue",
        };

        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            var multiContent =
              tilesetJson.root.extensions["3DTILES_multiple_contents"];
            multiContent.content.forEach(function (content) {
              content.extensions = {
                "3DTILES_metadata": metadataExtension,
              };
            });

            tilesetJson.root.extensions["3DTILES_extension"] = otherExtension;
            return tilesetJson;
          });
        });

        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsUrl
        ).then(function (tileset) {
          // the placeholder tile does not have any extensions.
          var placeholderTile = tileset.root;
          var placeholderHeader = placeholderTile._header;
          expect(placeholderHeader.extensions).not.toBeDefined();
          expect(placeholderHeader.content.extensions).not.toBeDefined();

          var transcodedRoot = placeholderTile.children[0];
          var transcodedRootHeader = transcodedRoot._header;
          expect(transcodedRootHeader.extensions).toEqual({
            "3DTILES_extension": otherExtension,
          });
          expect(transcodedRootHeader.content.extensions).toEqual({
            "3DTILES_metadata": metadataExtension,
          });

          var childTiles = transcodedRoot.children;
          for (var i = 0; i < childTiles.length; i++) {
            var childTile = childTiles[i];

            var childTileHeader = childTile._header;
            expect(childTileHeader.extensions["3DTILES_extension"]).toEqual(
              otherExtension
            );

            var innerContentHeaders =
              childTileHeader.extensions["3DTILES_multiple_contents"].content;

            innerContentHeaders.forEach(function (header) {
              expect(header.extensions).toEqual({
                "3DTILES_metadata": metadataExtension,
              });
            });
          }
        });
      });
    });

    describe("3DTILES_metadata", function () {
      var implicitTilesetUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitTileset/tileset.json";
      var implicitGroupMetadataUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitGroupMetadata/tileset.json";
      var implicitHeightSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightSemantics/tileset.json";
      var implicitS2HeightSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightSemantics/s2-tileset.json";
      var implicitTileBoundingVolumeSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitTileBoundingVolumeSemantics/tileset.json";
      var implicitHeightAndSphereSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightAndSphereSemantics/tileset.json";
      var implicitHeightAndRegionSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightAndRegionSemantics/tileset.json";
      var implicitContentBoundingVolumeSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentBoundingVolumeSemantics/tileset.json";
      var implicitContentHeightSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentHeightSemantics/tileset.json";
      var implicitContentHeightAndRegionSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentHeightAndRegionSemantics/tileset.json";
      var implicitGeometricErrorSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitGeometricErrorSemantics/tileset.json";

      var metadataClass = new MetadataClass({
        id: "test",
        class: {
          properties: {
            name: {
              componentType: "STRING",
            },
            height: {
              componentType: "FLOAT32",
            },
          },
        },
      });
      var groupMetadata = new GroupMetadata({
        id: "testGroup",
        group: {
          properties: {
            name: "Test Group",
            height: 35.6,
          },
        },
        class: metadataClass,
      });

      it("assigns groupMetadata", function () {
        return Cesium3DTilesTester.loadTileset(scene, implicitTilesetUrl).then(
          function (tileset) {
            var content = tileset.root.content;
            content.groupMetadata = groupMetadata;
            expect(content.groupMetadata).toBe(groupMetadata);
          }
        );
      });

      it("group metadata gets transcoded correctly", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitGroupMetadataUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root;
          var subtreeRootTile = placeholderTile.children[0];
          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);

          var groups = tileset.metadata.groups;
          var ground = groups.ground;
          expect(ground.getProperty("color")).toEqual(
            new Cartesian3(120, 68, 32)
          );
          expect(ground.getProperty("priority")).toBe(0);

          var sky = groups.sky;
          expect(sky.getProperty("color")).toEqual(
            new Cartesian3(206, 237, 242)
          );
          expect(sky.getProperty("priority")).toBe(1);

          tiles.forEach(function (tile) {
            if (tile.hasMultipleContents) {
              // child tiles have multiple contents
              var contents = tile.content.innerContents;
              expect(contents[0].groupMetadata).toBe(ground);
              expect(contents[1].groupMetadata).toBe(sky);
            } else {
              // parent tile is a single b3dm tile
              expect(tile.content.groupMetadata).toBe(ground);
            }
          });
        });
      });

      // view (lon, lat, height) = (0, 0, 0) from height meters above
      function viewCartographicOrigin(height) {
        var center = Cartesian3.fromDegrees(0.0, 0.0);
        var offset = new Cartesian3(0, 0, height);
        scene.camera.lookAt(center, offset);
      }

      it("uses height semantics to adjust region bounding volumes", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitHeightSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root;
          var subtreeRootTile = placeholderTile.children[0];

          var implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;
          var minimumHeight = implicitRegion[4];
          var maximumHeight = implicitRegion[5];

          // This tileset uses TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT
          // to set tighter bounding volumes
          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (var i = 0; i < tiles.length; i++) {
            var tileRegion = tiles[i].boundingVolume;
            expect(tileRegion.minimumHeight).toBeGreaterThan(minimumHeight);
            expect(tileRegion.maximumHeight).toBeLessThan(maximumHeight);
          }
        });
      });

      it("uses height semantics to adjust S2 bounding volumes", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitS2HeightSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root;
          var subtreeRootTile = placeholderTile.children[0];

          var implicitS2Volume =
            placeholderTile.implicitTileset.boundingVolume.extensions[
              "3DTILES_bounding_volume_S2"
            ];
          var minimumHeight = implicitS2Volume.minimumHeight;
          var maximumHeight = implicitS2Volume.maximumHeight;

          // This tileset uses TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT
          // to set tighter bounding volumes
          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (var i = 0; i < tiles.length; i++) {
            var tileS2Volume = tiles[i].boundingVolume;
            expect(tileS2Volume.minimumHeight).toBeGreaterThan(minimumHeight);
            expect(tileS2Volume.maximumHeight).toBeLessThan(maximumHeight);
          }
        });
      });

      // get half the bounding cube width from the bounding box's
      // halfAxes matrix
      function getHalfWidth(boundingBox) {
        return boundingBox.boundingVolume.halfAxes[0];
      }

      it("ignores height semantics if the implicit volume is a box", function () {
        var cameraHeight = 100;
        var rootHalfWidth = 10;
        var originalLoadJson = Cesium3DTileset.loadJson;
        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            tilesetJson.root.boundingVolume = {
              box: [
                Ellipsoid.WGS84.radii.x + cameraHeight,
                0,
                0,
                rootHalfWidth,
                0,
                0,
                0,
                rootHalfWidth,
                0,
                0,
                0,
                rootHalfWidth,
              ],
            };
            return tilesetJson;
          });
        });

        viewCartographicOrigin(cameraHeight);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitHeightSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root;
          var subtreeRootTile = placeholderTile.children[0];

          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);

          // TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT only apply to
          // regions, so this will check that they are not used.
          tiles.forEach(function (tile) {
            var level = tile.implicitCoordinates.level;
            var halfWidth = getHalfWidth(tile.boundingVolume);
            // Even for floats, divide by 2 operations are exact as long
            // as there is no overflow.
            expect(halfWidth).toEqual(rootHalfWidth / Math.pow(2, level));
          });
        });
      });

      it("uses tile bounding box from metadata semantics if present", function () {
        viewCartographicOrigin(124000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitTileBoundingVolumeSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root.children[0];
          var subtreeRootTile = placeholderTile.children[0];

          var rootHalfWidth = 2048;
          expect(getHalfWidth(subtreeRootTile.boundingVolume)).toBe(
            rootHalfWidth
          );

          for (var level = 1; level < 4; level++) {
            var halfWidthAtLevel = rootHalfWidth / (1 << level);
            var tiles = [];
            gatherTilesPreorder(subtreeRootTile, level, level, tiles);
            for (var i = 0; i < tiles.length; i++) {
              // In this tileset, each tile's TILE_BOUNDING_BOX is
              // smaller than the implicit tile bounds. Make sure
              // this is true.
              var tile = tiles[i];
              var halfWidth = getHalfWidth(tile.boundingVolume);
              expect(halfWidth).toBeLessThan(halfWidthAtLevel);
            }
          }
        });
      });

      it("prioritizes height semantics over bounding volume semantics", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitHeightAndSphereSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root;
          var subtreeRootTile = placeholderTile.children[0];

          var implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          var minimumHeight = implicitRegion[4];
          var maximumHeight = implicitRegion[5];

          // This tileset uses TILE_BOUNDING_SPHERE, TILE_MINIMUM_HEIGHT, and
          // TILE_MAXIMUM_HEIGHT but TILE_BOUNDING_SPHERE is ignored
          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (var i = 0; i < tiles.length; i++) {
            var tileRegion = tiles[i].boundingVolume;
            expect(tileRegion.minimumHeight).toBeDefined();
            expect(tileRegion.maximumHeight).toBeDefined();
            expect(tileRegion.minimumHeight).toBeGreaterThan(minimumHeight);
            expect(tileRegion.maximumHeight).toBeLessThan(maximumHeight);
          }
        });
      });

      it("uses height semantics to adjust region semantic", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitHeightAndRegionSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root;
          var subtreeRootTile = placeholderTile.children[0];

          var implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          var west = implicitRegion[0];
          var south = implicitRegion[1];
          var east = implicitRegion[2];
          var north = implicitRegion[3];
          var minimumHeight = implicitRegion[4];
          var maximumHeight = implicitRegion[5];

          // This tileset uses TILE_BOUNDING_REGION, TILE_MINIMUM_HEIGHT, and
          // TILE_MAXIMUM_HEIGHT to set tighter bounding volumes
          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (var i = 0; i < tiles.length; i++) {
            var tileRegion = tiles[i].boundingVolume;
            expect(tileRegion.minimumHeight).toBeGreaterThan(minimumHeight);
            expect(tileRegion.maximumHeight).toBeLessThan(maximumHeight);
            // Check that the bounding volume is using the explicit tile regions
            // which are shrunken compared to the implicit tile regions
            expect(tileRegion.rectangle.west).toBeGreaterThan(west);
            expect(tileRegion.rectangle.south).toBeGreaterThan(south);
            expect(tileRegion.rectangle.east).toBeLessThan(east);
            expect(tileRegion.rectangle.north).toBeLessThan(north);
          }
        });
      });

      it("uses content bounding box from metadata semantics if present", function () {
        viewCartographicOrigin(124000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitContentBoundingVolumeSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root.children[0];
          var subtreeRootTile = placeholderTile.children[0];

          // This tileset defines the content bounding spheres in a
          // property with metadata semantic CONTENT_BOUNDING_SPHERE.
          // Check that each tile has a content bounding volume.
          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          tiles.forEach(function (tile) {
            expect(
              tile.contentBoundingVolume instanceof TileBoundingSphere
            ).toBe(true);
            expect(tile.contentBoundingVolume).not.toBe(tile.boundingVolume);
          });
        });
      });

      it("uses content height semantics to adjust implicit region", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitContentHeightSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root;
          var subtreeRootTile = placeholderTile.children[0];

          var implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          var minimumHeight = implicitRegion[4];
          var maximumHeight = implicitRegion[5];

          // This tileset uses CONTENT_MINIMUM_HEIGHT and CONTENT_MAXIMUM_HEIGHT
          // to set tighter bounding volumes
          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (var i = 0; i < tiles.length; i++) {
            var contentRegion = tiles[i].contentBoundingVolume;
            expect(contentRegion.minimumHeight).toBeGreaterThan(minimumHeight);
            expect(contentRegion.maximumHeight).toBeLessThan(maximumHeight);
          }
        });
      });

      it("uses content height semantics to adjust content region semantic", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitContentHeightAndRegionSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root;
          var subtreeRootTile = placeholderTile.children[0];

          var implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          var west = implicitRegion[0];
          var south = implicitRegion[1];
          var east = implicitRegion[2];
          var north = implicitRegion[3];
          var minimumHeight = implicitRegion[4];
          var maximumHeight = implicitRegion[5];

          // This tileset uses CONTENT_BOUNDING_REGION, CONTENT_MINIMUM_HEIGHT, and
          // CONTENT_MAXIMUM_HEIGHT to set tighter bounding volumes
          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (var i = 0; i < tiles.length; i++) {
            var contentRegion = tiles[i].contentBoundingVolume;
            expect(contentRegion.minimumHeight).toBeGreaterThan(minimumHeight);
            expect(contentRegion.maximumHeight).toBeLessThan(maximumHeight);
            // Check that the content bounding volume is using the explicit tile
            // regions which are shrunken compared to the implicit tile regions
            expect(contentRegion.rectangle.west).toBeGreaterThan(west);
            expect(contentRegion.rectangle.south).toBeGreaterThan(south);
            expect(contentRegion.rectangle.east).toBeLessThan(east);
            expect(contentRegion.rectangle.north).toBeLessThan(north);
          }
        });
      });

      it("uses geometric error from metadata semantics if present", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitGeometricErrorSemanticsUrl
        ).then(function (tileset) {
          var placeholderTile = tileset.root;
          var subtreeRootTile = placeholderTile.children[0];

          // This tileset defines the geometric error in a
          // property with metadata semantic TILE_GEOMETRIC_ERROR.
          // Check that each tile has the right geometric error.
          var tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          var geometricErrors = tiles.map(function (tile) {
            return tile.geometricError;
          });
          // prettier-ignore
          var expectedGeometricErrors = [
            300, 203, 112, 113, 114, 115, 201, 104, 105, 106,
            107, 202, 108, 109, 110, 111, 200, 103, 101, 102, 100
          ];
          expect(geometricErrors).toEqual(expectedGeometricErrors);
        });
      });
    });
  },
  "WebGL"
);
