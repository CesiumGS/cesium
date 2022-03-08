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
    const tilesetResource = new Resource({
      url: "https://example.com/tileset.json",
    });

    const mockTileset = {
      modelMatrix: Matrix4.IDENTITY,
    };
    let metadataSchema; // intentionally left undefined

    const tileJson = {
      geometricError: 800,
      refine: "ADD",
      boundingVolume: {
        box: [0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256],
      },
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1],
      content: {
        uri: "https://example.com/{level}/{x}/{y}.b3dm",
        extras: {
          author: "Cesium",
        },
      },
      implicitTiling: {
        subdivisionScheme: "QUADTREE",
        subtreeLevels: 2,
        availableLevels: 2,
        subtrees: {
          uri: "https://example.com/{level}/{x}/{y}.subtree",
        },
      },
      extras: {
        year: "2021",
      },
    };

    let implicitTileset;
    let rootCoordinates;

    const quadtreeJson = {
      tileAvailability: {
        constant: 1,
      },
      contentAvailability: {
        constant: 1,
      },
      childSubtreeAvailability: {
        constant: 0,
      },
    };

    const quadtreeBuffer = ImplicitTilingTester.generateSubtreeBuffers({
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
    function gatherTilesPreorder(tile, minLevel, maxLevel, result) {
      const level = tile.implicitCoordinates.level;
      if (minLevel <= level && level <= maxLevel) {
        result.push(tile);
      }

      for (let i = 0; i < tile.children.length; i++) {
        gatherTilesPreorder(tile.children[i], minLevel, maxLevel, result);
      }
    }

    function getBoundingBoxArray(tile) {
      const boundingBox = tile.boundingVolume.boundingVolume;
      const box = new Array(12);
      Cartesian3.pack(boundingBox.center, box);
      Matrix3.pack(boundingBox.halfAxes, box, 3);
      return box;
    }

    let scene;

    // This scene is the same as Composite/Composite, just rephrased
    // using 3DTILES_multiple_contents
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;

    beforeAll(function () {
      scene = createScene();
      implicitTileset = new ImplicitTileset(
        tilesetResource,
        tileJson,
        metadataSchema
      );

      rootCoordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitTileset.subdivisionScheme,
        subtreeLevels: implicitTileset.subtreeLevels,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    let mockPlaceholderTile;
    beforeEach(function () {
      mockPlaceholderTile = new Cesium3DTile(mockTileset, tilesetResource, {
        geometricError: 400,
        boundingVolume: {
          box: [0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256],
        },
        transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1],
      });
      mockPlaceholderTile.implicitCoordinates = rootCoordinates;
      mockPlaceholderTile.implicitTileset = implicitTileset;

      // One item in each data set is always located in the center, so point the camera there
      const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 26.0));
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("loads subtree using JSON", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        quadtreeJson
      );
      return content.readyPromise.then(function () {
        const expectedChildrenCounts = [4, 0, 0, 0, 0];
        const tiles = [];
        const subtreeRootTile = mockPlaceholderTile.children[0];
        gatherTilesPreorder(subtreeRootTile, 0, 1, tiles);
        expect(expectedChildrenCounts.length).toEqual(tiles.length);
        for (let i = 0; i < tiles.length; i++) {
          expect(tiles[i].children.length).toEqual(expectedChildrenCounts[i]);
        }
      });
    });

    it("expands subtree", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        const expectedChildrenCounts = [2, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0];
        const tiles = [];
        const subtreeRootTile = mockPlaceholderTile.children[0];
        gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
        expect(expectedChildrenCounts.length).toEqual(tiles.length);
        for (let i = 0; i < tiles.length; i++) {
          expect(tiles[i].children.length).toEqual(expectedChildrenCounts[i]);
        }
      });
    });

    it("sets tile coordinates on each tile", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        const expectedCoordinates = [
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
        const tiles = [];
        const subtreeRootTile = mockPlaceholderTile.children[0];
        gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
        for (let i = 0; i < tiles.length; i++) {
          const expected = expectedCoordinates[i];
          const coordinates = new ImplicitTileCoordinates({
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
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      const refine =
        implicitTileset.refine === "ADD"
          ? Cesium3DTileRefine.ADD
          : Cesium3DTileRefine.REPLACE;

      const parentCoordinates = mockPlaceholderTile.implicitCoordinates;
      const childCoordinates = parentCoordinates.getChildCoordinates(0);

      const parentGeometricError = implicitTileset.geometricError / 4;
      const childGeometricError = implicitTileset.geometricError / 8;

      const rootBoundingVolume = [10, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256];
      const parentBox = Implicit3DTileContent._deriveBoundingBox(
        rootBoundingVolume,
        parentCoordinates.level,
        parentCoordinates.x,
        parentCoordinates.y
      );
      const childBox = Implicit3DTileContent._deriveBoundingBox(
        rootBoundingVolume,
        childCoordinates.level,
        childCoordinates.x,
        childCoordinates.y
      );

      return content.readyPromise.then(function () {
        const subtreeRootTile = mockPlaceholderTile.children[0];
        const childTile = subtreeRootTile.children[0];
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
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        expect(mockPlaceholderTile.children.length).toEqual(1);
      });
    });

    it("preserves tile extras", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        expect(mockPlaceholderTile.children[0].extras).toEqual(tileJson.extras);
      });
    });

    it("stores a reference to the subtree in each transcoded tile", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        expect(mockPlaceholderTile.implicitSubtree).not.toBeDefined();

        const subtreeRootTile = mockPlaceholderTile.children[0];
        const subtree = subtreeRootTile.implicitSubtree;
        expect(subtree).toBeDefined();

        const tiles = [];
        gatherTilesPreorder(subtreeRootTile, 0, 1, tiles);
        for (let i = 0; i < tiles.length; i++) {
          expect(tiles[i].implicitSubtree).toBe(subtree);
        }
      });
    });

    it("does not store references to subtrees in placeholder tiles", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        expect(mockPlaceholderTile.implicitSubtree).not.toBeDefined();

        const subtreeRootTile = mockPlaceholderTile.children[0];

        const tiles = [];
        gatherTilesPreorder(subtreeRootTile, 2, 2, tiles);
        for (let i = 0; i < tiles.length; i++) {
          expect(tiles[i].implicitSubtree).not.toBeDefined();
        }
      });
    });

    it("destroys", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        const subtree = content._implicitSubtree;
        expect(content.isDestroyed()).toBe(false);
        expect(subtree.isDestroyed()).toBe(false);

        content.destroy();
        expect(content.isDestroyed()).toBe(true);
        expect(subtree.isDestroyed()).toBe(true);
      });
    });

    it("returns default values for most Cesium3DTileContent properties", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
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
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      expect(content.url).toBe("https://example.com/0/0/0.subtree");
    });

    it("templates content URIs for each tile with content", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        const expectedCoordinates = [
          [0, 0, 0],
          [1, 0, 0],
          [1, 0, 1],
        ];
        const contentAvailability = [false, true, true];
        const templateUri = implicitTileset.contentUriTemplates[0];
        const subtreeRootTile = mockPlaceholderTile.children[0];
        const tiles = [];
        gatherTilesPreorder(subtreeRootTile, 0, 1, tiles);
        expect(expectedCoordinates.length).toEqual(tiles.length);
        for (let i = 0; i < tiles.length; i++) {
          const expected = expectedCoordinates[i];
          const coordinates = new ImplicitTileCoordinates({
            subdivisionScheme: implicitTileset.subdivisionScheme,
            subtreeLevels: implicitTileset.subtreeLevels,
            level: expected[0],
            x: expected[1],
            y: expected[2],
          });
          const expectedResource = templateUri.getDerivedResource({
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
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        const expectedCoordinates = [
          [2, 0, 0],
          [2, 1, 0],
          [2, 0, 1],
          [2, 1, 1],
          [2, 0, 2],
          [2, 1, 2],
          [2, 0, 3],
          [2, 1, 3],
        ];
        const templateUri = implicitTileset.subtreeUriTemplate;
        const subtreeRootTile = mockPlaceholderTile.children[0];
        const tiles = [];
        gatherTilesPreorder(subtreeRootTile, 2, 2, tiles);

        expect(expectedCoordinates.length).toEqual(tiles.length);
        for (let i = 0; i < tiles.length; i++) {
          const expected = expectedCoordinates[i];
          const coordinates = new ImplicitTileCoordinates({
            subdivisionScheme: implicitTileset.subdivisionScheme,
            subtreeLevels: implicitTileset.subtreeLevels,
            level: expected[0],
            x: expected[1],
            y: expected[2],
          });
          const expectedResource = templateUri.getDerivedResource({
            templateValues: coordinates.getTemplateValues(),
          });
          const placeholderTile = tiles[i];
          expect(placeholderTile._contentResource.url).toEqual(
            expectedResource.url
          );
          expect(placeholderTile.implicitTileset).toBeDefined();
          expect(placeholderTile.implicitCoordinates).toBeDefined();
        }
      });
    });

    it("propagates refine down the tree", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      const refine =
        implicitTileset.refine === "ADD"
          ? Cesium3DTileRefine.ADD
          : Cesium3DTileRefine.REPLACE;
      return content.readyPromise.then(function () {
        const subtreeRootTile = mockPlaceholderTile.children[0];
        const tiles = [];
        gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
        for (let i = 0; i < tiles.length; i++) {
          expect(tiles[i].refine).toEqual(refine);
        }
      });
    });

    it("divides the geometricError by 2 for each level of the tree", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      const rootGeometricError = implicitTileset.geometricError;
      return content.readyPromise.then(function () {
        const subtreeRootTile = mockPlaceholderTile.children[0];
        const tiles = [];
        gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
        for (let i = 0; i < tiles.length; i++) {
          const level = tiles[i].implicitCoordinates.level;
          expect(tiles[i].geometricError).toEqual(
            rootGeometricError / Math.pow(2, level)
          );
        }
      });
    });

    it("subdivides bounding volumes for each tile", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        const expectedCoordinates = [
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
        const rootBoundingVolume = [10, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 256];

        const subtreeRootTile = mockPlaceholderTile.children[0];
        const tiles = [];
        gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);

        expect(expectedCoordinates.length).toEqual(tiles.length);
        for (let i = 0; i < tiles.length; i++) {
          const coordinates = expectedCoordinates[i];

          const boundingBox = tiles[i].boundingVolume.boundingVolume;
          const childBox = new Array(12);
          Cartesian3.pack(boundingBox.center, childBox);
          Matrix3.pack(boundingBox.halfAxes, childBox, 3);

          const expectedBounds = Implicit3DTileContent._deriveBoundingBox(
            rootBoundingVolume,
            coordinates[0],
            coordinates[1],
            coordinates[2]
          );
          expect(childBox).toEqual(expectedBounds);
        }
      });
    });

    it("propagates transform", function () {
      const content = new Implicit3DTileContent(
        mockTileset,
        mockPlaceholderTile,
        tilesetResource,
        undefined,
        quadtreeBuffer,
        0
      );
      return content.readyPromise.then(function () {
        const subtreeRootTile = mockPlaceholderTile.children[0];
        expect(subtreeRootTile.computedTransform).toEqual(
          mockPlaceholderTile.transform
        );
      });
    });

    describe("_deriveBoundingVolumeS2", function () {
      const deriveBoundingVolumeS2 =
        Implicit3DTileContent._deriveBoundingVolumeS2;
      const simpleBoundingVolumeS2 = {
        token: "1",
        minimumHeight: 0,
        maximumHeight: 10,
      };
      const simpleBoundingVolumeS2Cell = new TileBoundingS2Cell(
        simpleBoundingVolumeS2
      );
      const implicitTilesetS2 = {
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
        const placeholderTile = {
          _boundingVolume: simpleBoundingVolumeS2Cell,
        };
        const result = deriveBoundingVolumeS2(
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
        const parentTile = {
          _boundingVolume: simpleBoundingVolumeS2Cell,
        };
        let expected = {
          token: "04",
          minimumHeight: 0,
          maximumHeight: 10,
        };
        let result = deriveBoundingVolumeS2(false, parentTile, 0, 1, 0, 0);
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
        const parentTile = {
          _boundingVolume: simpleBoundingVolumeS2Cell,
        };
        const expected0 = {
          token: "04",
          minimumHeight: 0,
          maximumHeight: 5,
        };
        const expected1 = {
          token: "04",
          minimumHeight: 5,
          maximumHeight: 10,
        };
        const result0 = deriveBoundingVolumeS2(
          false,
          parentTile,
          0,
          1,
          0,
          0,
          0
        );
        expect(result0).toEqual({
          extensions: {
            "3DTILES_bounding_volume_S2": expected0,
          },
        });
        const result1 = deriveBoundingVolumeS2(
          false,
          parentTile,
          4,
          1,
          0,
          0,
          0
        );
        expect(result1).toEqual({
          extensions: {
            "3DTILES_bounding_volume_S2": expected1,
          },
        });
      });
    });

    describe("_deriveBoundingBox", function () {
      const deriveBoundingBox = Implicit3DTileContent._deriveBoundingBox;
      const simpleBoundingBox = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
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
        const tile = [1, 3, 0, 4, 0, 0, 0, 2, 0, 0, 0, 1];
        const expected = [0, 1.5, 0, 1, 0, 0, 0, 0.5, 0, 0, 0, 1];
        const result = deriveBoundingBox(tile, 2, 1, 0);
        expect(result).toEqual(expected);
      });

      it("subdivides like an octree if z is given", function () {
        const tile = [1, 3, 0, 4, 0, 0, 0, 2, 0, 0, 0, 1];
        const expected = [0, 1.5, 0.25, 1, 0, 0, 0, 0.5, 0, 0, 0, 0.25];
        const result = deriveBoundingBox(tile, 2, 1, 0, 2);
        expect(result).toEqual(expected);
      });

      it("handles rotation and non-uniform scaling correctly", function () {
        const tile = [1, 2, 3, 0, 4, 0, 0, 0, 2, 1, 0, 0];
        const expected = [1.25, 1, 1.5, 0, 1, 0, 0, 0, 0.5, 0.25, 0, 0];
        const result = deriveBoundingBox(tile, 2, 1, 0, 2);
        expect(result).toEqual(expected);
      });
    });

    describe("_deriveBoundingRegion", function () {
      const deriveBoundingRegion = Implicit3DTileContent._deriveBoundingRegion;
      const simpleRegion = [
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
        const tile = makeRectangle(-1, -2, 3, 2, 0, 20);
        const expected = makeRectangle(0, 1, 1, 2, 0, 20);

        const result = deriveBoundingRegion(tile, 2, 1, 3);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON9);
      });

      it("deriveVolume subdivides like an octree if z is given", function () {
        // 4x4 degree rectangle so the subdivisions at level 2 will
        // be 1 degree each
        const tile = makeRectangle(-1, -2, 3, 2, 0, 20);
        const expected = makeRectangle(0, 1, 1, 2, 10, 15);

        const result = deriveBoundingRegion(tile, 2, 1, 3, 2);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON9);
      });

      it("handles the IDL", function () {
        const tile = makeRectangle(90, -45, -90, 45, 0, 20);
        const expected = makeRectangle(180, -45, -90, 0, 0, 20);

        const result = deriveBoundingRegion(tile, 1, 1, 0);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON9);
      });
    });

    describe("multiple contents", function () {
      const implicitMultipleContentsUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitMultipleContents/tileset_1.1.json";

      it("a single content is transcoded as a regular tile", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsUrl
        ).then(function (tileset) {
          // The root tile of this tileset only has one available content
          const transcodedRoot = tileset.root.children[0];
          const transcodedRootHeader = transcodedRoot._header;
          expect(transcodedRoot.content).toBeInstanceOf(
            Batched3DModel3DTileContent
          );
          expect(transcodedRootHeader.contents[0]).toEqual({
            uri: "ground/0/0/0.b3dm",
          });
          expect(transcodedRootHeader.extensions).not.toBeDefined();
        });
      });

      it("multiple contents are transcoded to a tile", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsUrl
        ).then(function (tileset) {
          const childTiles = tileset.root.children[0].children;
          for (let i = 0; i < childTiles.length; i++) {
            const childTile = childTiles[i];
            const content = childTile.content;
            expect(content).toBeInstanceOf(Multiple3DTileContent);

            const childTileHeader = childTile._header;
            expect(childTileHeader.content).not.toBeDefined();
          }
        });
      });
    });

    describe("3DTILES_multiple_contents", function () {
      const implicitMultipleContentsLegacyUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitMultipleContents/tileset_1.0.json";

      // Same as above tileset, but with "content" instead of "contents"
      const implicitMultipleContentsLegacyWithContentUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitMultipleContents/tileset_1.0_content.json";

      it("a single content is transcoded as a regular tile (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsLegacyUrl
        ).then(function (tileset) {
          // The root tile of this tileset only has one available content
          const transcodedRoot = tileset.root.children[0];
          const transcodedRootHeader = transcodedRoot._header;
          expect(transcodedRoot.content).toBeInstanceOf(
            Batched3DModel3DTileContent
          );
          expect(transcodedRootHeader.contents[0]).toEqual({
            uri: "ground/0/0/0.b3dm",
          });
          expect(transcodedRootHeader.extensions).not.toBeDefined();
        });
      });

      it("a single content is transcoded as a regular tile (legacy with 'content')", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsLegacyWithContentUrl
        ).then(function (tileset) {
          // The root tile of this tileset only has one available content
          const transcodedRoot = tileset.root.children[0];
          const transcodedRootHeader = transcodedRoot._header;
          expect(transcodedRoot.content).toBeInstanceOf(
            Batched3DModel3DTileContent
          );
          expect(transcodedRootHeader.contents[0]).toEqual({
            uri: "ground/0/0/0.b3dm",
          });
          expect(transcodedRootHeader.extensions).not.toBeDefined();
        });
      });

      it("multiple contents are transcoded to a tile (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsLegacyUrl
        ).then(function (tileset) {
          const childTiles = tileset.root.children[0].children;
          for (let i = 0; i < childTiles.length; i++) {
            const childTile = childTiles[i];
            const content = childTile.content;
            expect(content).toBeInstanceOf(Multiple3DTileContent);

            const childTileHeader = childTile._header;
            expect(childTileHeader.content).not.toBeDefined();
          }
        });
      });

      it("multiple contents are transcoded to a tile (legacy with 'content')", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsLegacyWithContentUrl
        ).then(function (tileset) {
          const childTiles = tileset.root.children[0].children;
          for (let i = 0; i < childTiles.length; i++) {
            const childTile = childTiles[i];
            const content = childTile.content;
            expect(content).toBeInstanceOf(Multiple3DTileContent);

            const childTileHeader = childTile._header;
            expect(childTileHeader.content).not.toBeDefined();
          }
        });
      });

      it("passes extensions through correctly (legacy)", function () {
        const originalLoadJson = Cesium3DTileset.loadJson;
        const metadataExtension = {
          group: "buildings",
        };
        const otherExtension = {
          someKey: "someValue",
        };

        spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
          return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
            const multiContent =
              tilesetJson.root.extensions["3DTILES_multiple_contents"];
            multiContent.contents.forEach(function (content) {
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
          implicitMultipleContentsLegacyUrl
        ).then(function (tileset) {
          // the placeholder tile does not have any extensions.
          const placeholderTile = tileset.root;
          const placeholderHeader = placeholderTile._header;
          expect(placeholderHeader.extensions).not.toBeDefined();
          expect(placeholderHeader.contents[0].extensions).not.toBeDefined();

          const transcodedRoot = placeholderTile.children[0];
          const transcodedRootHeader = transcodedRoot._header;
          expect(transcodedRootHeader.extensions).toEqual({
            "3DTILES_extension": otherExtension,
          });
          expect(transcodedRootHeader.contents[0].extensions).toEqual({
            "3DTILES_metadata": metadataExtension,
          });

          const childTiles = transcodedRoot.children;
          for (let i = 0; i < childTiles.length; i++) {
            const childTile = childTiles[i];

            const childTileHeader = childTile._header;
            expect(childTileHeader.extensions["3DTILES_extension"]).toEqual(
              otherExtension
            );

            const innerContentHeaders = childTileHeader.contents;

            innerContentHeaders.forEach(function (header) {
              expect(header.extensions).toEqual({
                "3DTILES_metadata": metadataExtension,
              });
            });
          }
        });
      });
    });

    describe("metadata", function () {
      const implicitTilesetUrl =
        "Data/Cesium3DTiles/Implicit/ImplicitTileset/tileset_1.1.json";
      const implicitGroupMetadataUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitGroupMetadata/tileset_1.1.json";
      const implicitContentMetadataUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentMetadata/tileset_1.1.json";
      const implicitMultipleContentsMetadataUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitMultipleContentsWithMetadata/tileset_1.1.json";
      const implicitHeightSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightSemantics/tileset_1.1.json";
      const implicitS2HeightSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightSemantics/s2-tileset_1.1.json";
      const implicitTileBoundingVolumeSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitTileBoundingVolumeSemantics/tileset_1.1.json";
      const implicitHeightAndSphereSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightAndSphereSemantics/tileset_1.1.json";
      const implicitHeightAndRegionSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightAndRegionSemantics/tileset_1.1.json";
      const implicitContentBoundingVolumeSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentBoundingVolumeSemantics/tileset_1.1.json";
      const implicitContentHeightSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentHeightSemantics/tileset_1.1.json";
      const implicitContentHeightAndRegionSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentHeightAndRegionSemantics/tileset_1.1.json";
      const implicitGeometricErrorSemanticsUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitGeometricErrorSemantics/tileset_1.1.json";

      let groupMetadataClass;
      let groupMetadata;
      beforeAll(function () {
        groupMetadataClass = new MetadataClass({
          id: "test",
          class: {
            properties: {
              name: {
                type: "STRING",
              },
              height: {
                type: "SCALAR",
                componentType: "FLOAT32",
              },
            },
          },
        });

        groupMetadata = new GroupMetadata({
          id: "testGroup",
          group: {
            properties: {
              name: "Test Group",
              height: 35.6,
            },
          },
          class: groupMetadataClass,
        });
      });

      it("assigns groupMetadata", function () {
        return Cesium3DTilesTester.loadTileset(scene, implicitTilesetUrl).then(
          function (tileset) {
            const content = tileset.root.content;
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
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);

          const groups = tileset.metadata.groups;
          const ground = groups.ground;
          expect(ground.getProperty("color")).toEqual(
            new Cartesian3(120, 68, 32)
          );
          expect(ground.getProperty("priority")).toBe(0);

          const sky = groups.sky;
          expect(sky.getProperty("color")).toEqual(
            new Cartesian3(206, 237, 242)
          );
          expect(sky.getProperty("priority")).toBe(1);

          tiles.forEach(function (tile) {
            if (tile.hasMultipleContents) {
              // child tiles have multiple contents
              const contents = tile.content.innerContents;
              expect(contents[0].groupMetadata).toBe(ground);
              expect(contents[1].groupMetadata).toBe(sky);
            } else {
              // parent tile is a single b3dm tile
              expect(tile.content.groupMetadata).toBe(ground);
            }
          });
        });
      });

      it("assigning content metadata throws", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitContentMetadataUrl
        ).then(function (tileset) {
          expect(function () {
            const placeholderTile = tileset.root;
            const content = placeholderTile.content;
            content.metadata = {};
          }).toThrowDeveloperError();
        });
      });

      it("content metadata gets transcoded correctly", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitContentMetadataUrl
        ).then(function (tileset) {
          const expectedHeights = [10, 20, 0, 30, 40];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            Cartesian3.ZERO,
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);

          for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const subtree = tile.implicitSubtree;
            const coordinates = tile.implicitCoordinates;
            const index = coordinates.tileIndex;
            const metadata = tile.content.metadata;

            if (!subtree.contentIsAvailableAtIndex(index, 0)) {
              expect(metadata.getProperty("height")).not.toBeDefined();
              expect(metadata.getProperty("color")).not.toBeDefined();
            } else {
              expect(metadata.getProperty("height")).toBe(
                expectedHeights[index]
              );
              expect(metadata.getProperty("color")).toEqual(
                expectedColors[index]
              );
            }
          }
        });
      });

      it("multiple content metadata views get transcoded correctly", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsMetadataUrl
        ).then(function (tileset) {
          const expectedHeights = [10, 20, 30, 40, 50];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            new Cartesian3(255, 255, 0),
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          // All tiles except the subtree root tile have tree content
          const expectedAges = [21, 7, 11, 16];

          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const coordinates = tile.implicitCoordinates;
            const index = coordinates.tileIndex;

            let buildingMetadata;
            if (i > 0) {
              expect(tile.hasMultipleContents).toBe(true);
              const buildingContent = tile.content.innerContents[0];
              buildingMetadata = buildingContent.metadata;
            } else {
              expect(tile.hasMultipleContents).toBe(false);
              buildingMetadata = tile.content.metadata;
            }

            expect(buildingMetadata.getProperty("height")).toBe(
              expectedHeights[index]
            );
            expect(buildingMetadata.getProperty("color")).toEqual(
              expectedColors[index]
            );

            if (i === 0) {
              continue;
            }

            const treeContent = tile.content.innerContents[1];
            const treeMetadata = treeContent.metadata;
            expect(treeMetadata.getProperty("age")).toEqual(
              expectedAges[index - 1]
            );
          }
        });
      });

      // view (lon, lat, height) = (0, 0, 0) from height meters above
      function viewCartographicOrigin(height) {
        const center = Cartesian3.fromDegrees(0.0, 0.0);
        const offset = new Cartesian3(0, 0, height);
        scene.camera.lookAt(center, offset);
      }

      it("uses height semantics to adjust region bounding volumes", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitHeightSemanticsUrl
        )
          .then(function (tileset) {
            const placeholderTile = tileset.root;
            const subtreeRootTile = placeholderTile.children[0];

            const implicitRegion =
              placeholderTile.implicitTileset.boundingVolume.region;
            const minimumHeight = implicitRegion[4];
            const maximumHeight = implicitRegion[5];

            // This tileset uses TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT
            // to set tighter bounding volumes
            const tiles = [];
            gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
            for (let i = 0; i < tiles.length; i++) {
              const tileRegion = tiles[i].boundingVolume;
              expect(tileRegion.minimumHeight).toBeGreaterThan(minimumHeight);
              expect(tileRegion.maximumHeight).toBeLessThan(maximumHeight);
            }
          })
          .otherwise(console.error);
      });

      it("uses height semantics to adjust S2 bounding volumes", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitS2HeightSemanticsUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitS2Volume =
            placeholderTile.implicitTileset.boundingVolume.extensions[
              "3DTILES_bounding_volume_S2"
            ];
          const minimumHeight = implicitS2Volume.minimumHeight;
          const maximumHeight = implicitS2Volume.maximumHeight;

          // This tileset uses TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT
          // to set tighter bounding volumes
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const tileS2Volume = tiles[i].boundingVolume;
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
        const cameraHeight = 100;
        const rootHalfWidth = 10;
        const originalLoadJson = Cesium3DTileset.loadJson;
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
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);

          // TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT only apply to
          // regions, so this will check that they are not used.
          tiles.forEach(function (tile) {
            const level = tile.implicitCoordinates.level;
            const halfWidth = getHalfWidth(tile.boundingVolume);
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
          const placeholderTile = tileset.root.children[0];
          const subtreeRootTile = placeholderTile.children[0];

          const rootHalfWidth = 2048;
          expect(getHalfWidth(subtreeRootTile.boundingVolume)).toBe(
            rootHalfWidth
          );

          for (let level = 1; level < 4; level++) {
            const halfWidthAtLevel = rootHalfWidth / (1 << level);
            const tiles = [];
            gatherTilesPreorder(subtreeRootTile, level, level, tiles);
            for (let i = 0; i < tiles.length; i++) {
              // In this tileset, each tile's TILE_BOUNDING_BOX is
              // smaller than the implicit tile bounds. Make sure
              // this is true.
              const tile = tiles[i];
              const halfWidth = getHalfWidth(tile.boundingVolume);
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
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          const minimumHeight = implicitRegion[4];
          const maximumHeight = implicitRegion[5];

          // This tileset uses TILE_BOUNDING_SPHERE, TILE_MINIMUM_HEIGHT, and
          // TILE_MAXIMUM_HEIGHT but TILE_BOUNDING_SPHERE is ignored
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const tileRegion = tiles[i].boundingVolume;
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
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          const west = implicitRegion[0];
          const south = implicitRegion[1];
          const east = implicitRegion[2];
          const north = implicitRegion[3];
          const minimumHeight = implicitRegion[4];
          const maximumHeight = implicitRegion[5];

          // This tileset uses TILE_BOUNDING_REGION, TILE_MINIMUM_HEIGHT, and
          // TILE_MAXIMUM_HEIGHT to set tighter bounding volumes
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const tileRegion = tiles[i].boundingVolume;
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
          const placeholderTile = tileset.root.children[0];
          const subtreeRootTile = placeholderTile.children[0];

          // This tileset defines the content bounding spheres in a
          // property with metadata semantic CONTENT_BOUNDING_SPHERE.
          // Check that each tile has a content bounding volume.
          const tiles = [];
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
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          const minimumHeight = implicitRegion[4];
          const maximumHeight = implicitRegion[5];

          // This tileset uses CONTENT_MINIMUM_HEIGHT and CONTENT_MAXIMUM_HEIGHT
          // to set tighter bounding volumes
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const contentRegion = tiles[i].contentBoundingVolume;
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
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          const west = implicitRegion[0];
          const south = implicitRegion[1];
          const east = implicitRegion[2];
          const north = implicitRegion[3];
          const minimumHeight = implicitRegion[4];
          const maximumHeight = implicitRegion[5];

          // This tileset uses CONTENT_BOUNDING_REGION, CONTENT_MINIMUM_HEIGHT, and
          // CONTENT_MAXIMUM_HEIGHT to set tighter bounding volumes
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const contentRegion = tiles[i].contentBoundingVolume;
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
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          // This tileset defines the geometric error in a
          // property with metadata semantic TILE_GEOMETRIC_ERROR.
          // Check that each tile has the right geometric error.
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          const geometricErrors = tiles.map(function (tile) {
            return tile.geometricError;
          });
          // prettier-ignore
          const expectedGeometricErrors = [
            300, 203, 112, 113, 114, 115, 201, 104, 105, 106,
            107, 202, 108, 109, 110, 111, 200, 103, 101, 102, 100
          ];
          expect(geometricErrors).toEqual(expectedGeometricErrors);
        });
      });
    });

    describe("3DTILES_metadata", function () {
      const implicitGroupMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitGroupMetadata/tileset_1.0.json";
      const implicitContentMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentMetadata/tileset_1.0.json";
      const implicitMultipleContentsMetadataLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitMultipleContentsWithMetadata/tileset_1.0.json";
      const implicitHeightSemanticsLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightSemantics/tileset_1.0.json";
      const implicitS2HeightSemanticsLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightSemantics/s2-tileset_1.0.json";
      const implicitTileBoundingVolumeSemanticsLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitTileBoundingVolumeSemantics/tileset_1.0.json";
      const implicitHeightAndSphereSemanticsLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightAndSphereSemantics/tileset_1.0.json";
      const implicitHeightAndRegionSemanticsLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitHeightAndRegionSemantics/tileset_1.0.json";
      const implicitContentBoundingVolumeSemanticsLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentBoundingVolumeSemantics/tileset_1.0.json";
      const implicitContentHeightSemanticsLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentHeightSemantics/tileset_1.0.json";
      const implicitContentHeightAndRegionSemanticsLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitContentHeightAndRegionSemantics/tileset_1.0.json";
      const implicitGeometricErrorSemanticsLegacyUrl =
        "Data/Cesium3DTiles/Metadata/ImplicitGeometricErrorSemantics/tileset_1.0.json";

      it("group metadata gets transcoded correctly (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitGroupMetadataLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);

          const groups = tileset.metadata.groups;
          const ground = groups.ground;
          expect(ground.getProperty("color")).toEqual(
            new Cartesian3(120, 68, 32)
          );
          expect(ground.getProperty("priority")).toBe(0);

          const sky = groups.sky;
          expect(sky.getProperty("color")).toEqual(
            new Cartesian3(206, 237, 242)
          );
          expect(sky.getProperty("priority")).toBe(1);

          tiles.forEach(function (tile) {
            if (tile.hasMultipleContents) {
              // child tiles have multiple contents
              const contents = tile.content.innerContents;
              expect(contents[0].groupMetadata).toBe(ground);
              expect(contents[1].groupMetadata).toBe(sky);
            } else {
              // parent tile is a single b3dm tile
              expect(tile.content.groupMetadata).toBe(ground);
            }
          });
        });
      });

      it("content metadata gets transcoded correctly (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitContentMetadataLegacyUrl
        ).then(function (tileset) {
          const expectedHeights = [10, 20, 0, 30, 40];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            Cartesian3.ZERO,
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);

          for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const subtree = tile.implicitSubtree;
            const coordinates = tile.implicitCoordinates;
            const index = coordinates.tileIndex;
            const metadata = tile.content.metadata;

            if (!subtree.contentIsAvailableAtIndex(index, 0)) {
              expect(metadata.getProperty("height")).not.toBeDefined();
              expect(metadata.getProperty("color")).not.toBeDefined();
            } else {
              expect(metadata.getProperty("height")).toBe(
                expectedHeights[index]
              );
              expect(metadata.getProperty("color")).toEqual(
                expectedColors[index]
              );
            }
          }
        });
      });

      it("multiple content metadata views get transcoded correctly (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitMultipleContentsMetadataLegacyUrl
        ).then(function (tileset) {
          const expectedHeights = [10, 20, 30, 40, 50];
          const expectedColors = [
            new Cartesian3(255, 255, 255),
            new Cartesian3(255, 0, 0),
            new Cartesian3(255, 255, 0),
            new Cartesian3(0, 255, 0),
            new Cartesian3(0, 0, 255),
          ];

          // All tiles except the subtree root tile have tree content
          const expectedAges = [21, 7, 11, 16];

          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 2, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const coordinates = tile.implicitCoordinates;
            const index = coordinates.tileIndex;

            let buildingMetadata;
            if (i > 0) {
              expect(tile.hasMultipleContents).toBe(true);
              const buildingContent = tile.content.innerContents[0];
              buildingMetadata = buildingContent.metadata;
            } else {
              expect(tile.hasMultipleContents).toBe(false);
              buildingMetadata = tile.content.metadata;
            }

            expect(buildingMetadata.getProperty("height")).toBe(
              expectedHeights[index]
            );
            expect(buildingMetadata.getProperty("color")).toEqual(
              expectedColors[index]
            );

            if (i === 0) {
              continue;
            }

            const treeContent = tile.content.innerContents[1];
            const treeMetadata = treeContent.metadata;
            expect(treeMetadata.getProperty("age")).toEqual(
              expectedAges[index - 1]
            );
          }
        });
      });

      // view (lon, lat, height) = (0, 0, 0) from height meters above
      function viewCartographicOrigin(height) {
        const center = Cartesian3.fromDegrees(0.0, 0.0);
        const offset = new Cartesian3(0, 0, height);
        scene.camera.lookAt(center, offset);
      }

      it("uses height semantics to adjust region bounding volumes (legacy)", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitHeightSemanticsLegacyUrl
        )
          .then(function (tileset) {
            const placeholderTile = tileset.root;
            const subtreeRootTile = placeholderTile.children[0];

            const implicitRegion =
              placeholderTile.implicitTileset.boundingVolume.region;
            const minimumHeight = implicitRegion[4];
            const maximumHeight = implicitRegion[5];

            // This tileset uses TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT
            // to set tighter bounding volumes
            const tiles = [];
            gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
            for (let i = 0; i < tiles.length; i++) {
              const tileRegion = tiles[i].boundingVolume;
              expect(tileRegion.minimumHeight).toBeGreaterThan(minimumHeight);
              expect(tileRegion.maximumHeight).toBeLessThan(maximumHeight);
            }
          })
          .otherwise(console.error);
      });

      it("uses height semantics to adjust S2 bounding volumes (legacy)", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitS2HeightSemanticsLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitS2Volume =
            placeholderTile.implicitTileset.boundingVolume.extensions[
              "3DTILES_bounding_volume_S2"
            ];
          const minimumHeight = implicitS2Volume.minimumHeight;
          const maximumHeight = implicitS2Volume.maximumHeight;

          // This tileset uses TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT
          // to set tighter bounding volumes
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const tileS2Volume = tiles[i].boundingVolume;
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

      it("ignores height semantics if the implicit volume is a box (legacy)", function () {
        const cameraHeight = 100;
        const rootHalfWidth = 10;
        const originalLoadJson = Cesium3DTileset.loadJson;
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
          implicitHeightSemanticsLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);

          // TILE_MINIMUM_HEIGHT and TILE_MAXIMUM_HEIGHT only apply to
          // regions, so this will check that they are not used.
          tiles.forEach(function (tile) {
            const level = tile.implicitCoordinates.level;
            const halfWidth = getHalfWidth(tile.boundingVolume);
            // Even for floats, divide by 2 operations are exact as long
            // as there is no overflow.
            expect(halfWidth).toEqual(rootHalfWidth / Math.pow(2, level));
          });
        });
      });

      it("uses tile bounding box from metadata semantics if present (legacy)", function () {
        viewCartographicOrigin(124000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitTileBoundingVolumeSemanticsLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root.children[0];
          const subtreeRootTile = placeholderTile.children[0];

          const rootHalfWidth = 2048;
          expect(getHalfWidth(subtreeRootTile.boundingVolume)).toBe(
            rootHalfWidth
          );

          for (let level = 1; level < 4; level++) {
            const halfWidthAtLevel = rootHalfWidth / (1 << level);
            const tiles = [];
            gatherTilesPreorder(subtreeRootTile, level, level, tiles);
            for (let i = 0; i < tiles.length; i++) {
              // In this tileset, each tile's TILE_BOUNDING_BOX is
              // smaller than the implicit tile bounds. Make sure
              // this is true.
              const tile = tiles[i];
              const halfWidth = getHalfWidth(tile.boundingVolume);
              expect(halfWidth).toBeLessThan(halfWidthAtLevel);
            }
          }
        });
      });

      it("prioritizes height semantics over bounding volume semantics (legacy)", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitHeightAndSphereSemanticsLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          const minimumHeight = implicitRegion[4];
          const maximumHeight = implicitRegion[5];

          // This tileset uses TILE_BOUNDING_SPHERE, TILE_MINIMUM_HEIGHT, and
          // TILE_MAXIMUM_HEIGHT but TILE_BOUNDING_SPHERE is ignored
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const tileRegion = tiles[i].boundingVolume;
            expect(tileRegion.minimumHeight).toBeDefined();
            expect(tileRegion.maximumHeight).toBeDefined();
            expect(tileRegion.minimumHeight).toBeGreaterThan(minimumHeight);
            expect(tileRegion.maximumHeight).toBeLessThan(maximumHeight);
          }
        });
      });

      it("uses height semantics to adjust region semantic (legacy)", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitHeightAndRegionSemanticsLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          const west = implicitRegion[0];
          const south = implicitRegion[1];
          const east = implicitRegion[2];
          const north = implicitRegion[3];
          const minimumHeight = implicitRegion[4];
          const maximumHeight = implicitRegion[5];

          // This tileset uses TILE_BOUNDING_REGION, TILE_MINIMUM_HEIGHT, and
          // TILE_MAXIMUM_HEIGHT to set tighter bounding volumes
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const tileRegion = tiles[i].boundingVolume;
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

      it("uses content bounding box from metadata semantics if present (legacy)", function () {
        viewCartographicOrigin(124000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitContentBoundingVolumeSemanticsLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root.children[0];
          const subtreeRootTile = placeholderTile.children[0];

          // This tileset defines the content bounding spheres in a
          // property with metadata semantic CONTENT_BOUNDING_SPHERE.
          // Check that each tile has a content bounding volume.
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          tiles.forEach(function (tile) {
            expect(
              tile.contentBoundingVolume instanceof TileBoundingSphere
            ).toBe(true);
            expect(tile.contentBoundingVolume).not.toBe(tile.boundingVolume);
          });
        });
      });

      it("uses content height semantics to adjust implicit region (legacy)", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitContentHeightSemanticsLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          const minimumHeight = implicitRegion[4];
          const maximumHeight = implicitRegion[5];

          // This tileset uses CONTENT_MINIMUM_HEIGHT and CONTENT_MAXIMUM_HEIGHT
          // to set tighter bounding volumes
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const contentRegion = tiles[i].contentBoundingVolume;
            expect(contentRegion.minimumHeight).toBeGreaterThan(minimumHeight);
            expect(contentRegion.maximumHeight).toBeLessThan(maximumHeight);
          }
        });
      });

      it("uses content height semantics to adjust content region semantic (legacy)", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitContentHeightAndRegionSemanticsLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          const implicitRegion =
            placeholderTile.implicitTileset.boundingVolume.region;

          const west = implicitRegion[0];
          const south = implicitRegion[1];
          const east = implicitRegion[2];
          const north = implicitRegion[3];
          const minimumHeight = implicitRegion[4];
          const maximumHeight = implicitRegion[5];

          // This tileset uses CONTENT_BOUNDING_REGION, CONTENT_MINIMUM_HEIGHT, and
          // CONTENT_MAXIMUM_HEIGHT to set tighter bounding volumes
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          for (let i = 0; i < tiles.length; i++) {
            const contentRegion = tiles[i].contentBoundingVolume;
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

      it("uses geometric error from metadata semantics if present (legacy)", function () {
        viewCartographicOrigin(10000);
        return Cesium3DTilesTester.loadTileset(
          scene,
          implicitGeometricErrorSemanticsLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          // This tileset defines the geometric error in a
          // property with metadata semantic TILE_GEOMETRIC_ERROR.
          // Check that each tile has the right geometric error.
          const tiles = [];
          gatherTilesPreorder(subtreeRootTile, 0, 3, tiles);
          const geometricErrors = tiles.map(function (tile) {
            return tile.geometricError;
          });
          // prettier-ignore
          const expectedGeometricErrors = [
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
