import {
  Cartesian3,
  Cesium3DTileset,
  Color,
  HeadingPitchRange,
  Multiple3DTileContent,
  MetadataClass,
  GroupMetadata,
  RequestScheduler,
  Resource,
} from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";
import generateJsonBuffer from "../generateJsonBuffer.js";

describe(
  "Scene/Multiple3DTileContent",
  function () {
    let scene;

    // This scene is the same as Composite/Composite, just rephrased using multiple contents
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;
    const multipleContentsUrl =
      "./Data/Cesium3DTiles/MultipleContents/MultipleContents/tileset_1.1.json";
    const multipleContentsLegacyUrl =
      "./Data/Cesium3DTiles/MultipleContents/MultipleContents/tileset_1.0.json";

    // Test for older version of 3DTILES_multiple_contents that uses "content" instead of "contents"
    const multipleContentsLegacyWithContentUrl =
      "./Data/Cesium3DTiles/MultipleContents/MultipleContents/tileset_1.0_content.json";

    const tilesetResource = new Resource({ url: "http://example.com" });

    const contents = [
      {
        uri: "pointcloud.pnts",
      },
      {
        uri: "batched.b3dm",
      },
      {
        uri: "gltfModel.glb",
      },
    ];

    const contentsJson = {
      contents: contents,
    };

    // legacy
    const contentJson = {
      content: contents,
    };

    function makeGltfBuffer() {
      const gltf = {
        asset: {
          version: "1.0",
        },
      };
      return generateJsonBuffer(gltf).buffer;
    }

    let originalRequestsPerServer;

    function setZoom(distance) {
      const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, distance));
    }

    function viewAllTiles() {
      setZoom(26.0);
    }

    function viewNothing() {
      setZoom(200.0);
    }

    beforeAll(function () {
      scene = createScene();
      // One item in each data set is always located in the center, so point the camera there
      originalRequestsPerServer = RequestScheduler.maximumRequestsPerServer;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      RequestScheduler.maximumRequestsPerServer = originalRequestsPerServer;
      viewAllTiles();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    function expectRenderMultipleContents(tileset) {
      expect(scene).toPickAndCall(function (result) {
        // Pick a building
        const pickedBuilding = result;
        expect(pickedBuilding).toBeDefined();

        // Change the color of the picked building to yellow
        pickedBuilding.color = Color.clone(Color.YELLOW, pickedBuilding.color);

        // Expect the pixel color to be some shade of yellow
        Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toBeGreaterThan(0);
          expect(rgba[2]).toEqual(0);
          expect(rgba[3]).toEqual(255);
        });

        // Both a building and instance are located at the center, hide the building and pick the instance
        pickedBuilding.show = false;

        let pickedInstance;
        expect(scene).toPickAndCall(function (result) {
          pickedInstance = result;
          expect(pickedInstance).toBeDefined();
          expect(pickedInstance).not.toEqual(pickedBuilding);
        });

        // Change the color of the picked instance to green
        pickedInstance.color = Color.clone(Color.GREEN, pickedInstance.color);

        // Expect the pixel color to be some shade of green
        Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
          expect(rgba[0]).toEqual(0);
          expect(rgba[1]).toBeGreaterThan(0);
          expect(rgba[2]).toEqual(0);
          expect(rgba[3]).toEqual(255);
        });

        // Hide the instance, and expect the render to be blank
        pickedInstance.show = false;
        Cesium3DTilesTester.expectRenderBlank(scene, tileset);
      });
    }

    it("innerContentUrls returns the urls from object containing contents array", function () {
      const tileset = {};
      const tile = {};
      const content = new Multiple3DTileContent(
        tileset,
        tile,
        tilesetResource,
        contentsJson
      );

      expect(content.innerContentUrls).toEqual([
        "pointcloud.pnts",
        "batched.b3dm",
        "gltfModel.glb",
      ]);
    });

    it("innerContentUrls returns the urls from object containing content (legacy)", function () {
      const tileset = {};
      const tile = {};
      const content = new Multiple3DTileContent(
        tileset,
        tile,
        tilesetResource,
        contentJson
      );

      expect(content.innerContentUrls).toEqual([
        "pointcloud.pnts",
        "batched.b3dm",
        "gltfModel.glb",
      ]);
    });

    it("contentsFetchedPromise is undefined until requestInnerContents is successful", function () {
      const mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
        },
      };
      const tile = {};
      const content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        contentsJson
      );

      expect(content.contentsFetchedPromise).not.toBeDefined();

      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        return Promise.resolve(makeGltfBuffer());
      });
      content.requestInnerContents();
      expect(content.contentsFetchedPromise).toBeDefined();
    });

    it("contentsFetchedPromise is undefined if no requests are scheduled", function () {
      const mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
        },
      };
      const tile = {};
      const content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        contentsJson
      );

      expect(content.contentsFetchedPromise).not.toBeDefined();

      RequestScheduler.maximumRequestsPerServer = 2;
      content.requestInnerContents();

      expect(content.contentsFetchedPromise).not.toBeDefined();
    });

    it("requestInnerContents returns 0 if successful", function () {
      const mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
        },
      };
      const tile = {};
      const content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        contentsJson
      );

      const fetchArray = spyOn(
        Resource.prototype,
        "fetchArrayBuffer"
      ).and.callFake(function () {
        return Promise.resolve(makeGltfBuffer());
      });
      expect(content.requestInnerContents()).toBe(0);
      expect(fetchArray.calls.count()).toBe(3);
    });

    it("requestInnerContents schedules no requests if there are not enough open slots", function () {
      const mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
        },
      };
      const tile = {};
      const content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        contentsJson
      );

      const fetchArray = spyOn(Resource.prototype, "fetchArrayBuffer");
      RequestScheduler.maximumRequestsPerServer = 2;
      expect(content.requestInnerContents()).toBe(3);
      expect(fetchArray).not.toHaveBeenCalled();
    });

    it("resolves readyPromise", function () {
      return Cesium3DTilesTester.resolvesReadyPromise(
        scene,
        multipleContentsUrl
      );
    });

    it("renders multiple contents", function () {
      return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
        expectRenderMultipleContents
      );
    });

    it("renders multiple contents (legacy)", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        multipleContentsLegacyUrl
      ).then(expectRenderMultipleContents);
    });

    it("renders multiple contents (legacy with 'content')", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        multipleContentsLegacyWithContentUrl
      ).then(expectRenderMultipleContents);
    });

    it("renders valid tiles after tile failure", function () {
      const originalLoadJson = Cesium3DTileset.loadJson;
      spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
        return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
          const contents = tilesetJson.root.contents;
          const badTile = {
            uri: "nonexistent.b3dm",
          };
          contents.splice(1, 0, badTile);

          return tilesetJson;
        });
      });
      return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
        expectRenderMultipleContents
      );
    });

    it("renders valid tiles after tile failure (legacy)", function () {
      const originalLoadJson = Cesium3DTileset.loadJson;
      spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
        return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
          const content =
            tilesetJson.root.extensions["3DTILES_multiple_contents"].contents;
          const badTile = {
            uri: "nonexistent.b3dm",
          };
          content.splice(1, 0, badTile);

          return tilesetJson;
        });
      });
      return Cesium3DTilesTester.loadTileset(
        scene,
        multipleContentsLegacyUrl
      ).then(expectRenderMultipleContents);
    });

    it("cancelRequests cancels in-flight requests", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
        function (tileset) {
          viewAllTiles();
          scene.renderForSpecs();

          const multipleContents = tileset.root.content;
          multipleContents.cancelRequests();

          return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset).then(
            function () {
              // the content should be canceled once in total
              expect(multipleContents._cancelCount).toBe(1);
            }
          );
        }
      );
    });

    it("destroys", function () {
      return Cesium3DTilesTester.tileDestroys(scene, multipleContentsUrl);
    });

    describe("metadata", function () {
      const withGroupMetadataUrl =
        "./Data/Cesium3DTiles/MultipleContents/GroupMetadata/tileset_1.1.json";
      const withGroupMetadataLegacyUrl =
        "./Data/Cesium3DTiles/MultipleContents/GroupMetadata/tileset_1.0.json";
      const withExplicitContentMetadataUrl =
        "./Data/Cesium3DTiles/Metadata/MultipleContentsWithMetadata/tileset_1.1.json";
      const withExplicitContentMetadataLegacyUrl =
        "./Data/Cesium3DTiles/Metadata/MultipleContentsWithMetadata/tileset_1.0.json";
      const withImplicitContentMetadataUrl =
        "./Data/Cesium3DTiles/Metadata/ImplicitMultipleContentsWithMetadata/tileset_1.1.json";
      const withImplicitContentMetadataLegacyUrl =
        "./Data/Cesium3DTiles/Metadata/ImplicitMultipleContentsWithMetadata/tileset_1.0.json";

      let metadataClass;
      let groupMetadata;

      beforeAll(function () {
        metadataClass = new MetadataClass({
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
          class: metadataClass,
        });
      });

      it("groupMetadata returns undefined", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            const content = tileset.root.content;
            expect(content.groupMetadata).not.toBeDefined();
          }
        );
      });

      it("assigning groupMetadata throws", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            expect(function () {
              const content = tileset.root.content;
              content.groupMetadata = groupMetadata;
            }).toThrowDeveloperError();
          }
        );
      });

      it("initializes groupMetadata for inner contents", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withGroupMetadataUrl
        ).then(function (tileset) {
          const multipleContents = tileset.root.content;
          const innerContents = multipleContents.innerContents;

          const buildingsContent = innerContents[0];
          let groupMetadata = buildingsContent.groupMetadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(255, 127, 0)
          );
          expect(groupMetadata.getProperty("priority")).toBe(10);
          expect(groupMetadata.getProperty("isInstanced")).toBe(false);

          const cubesContent = innerContents[1];
          groupMetadata = cubesContent.groupMetadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(0, 255, 127)
          );
          expect(groupMetadata.getProperty("priority")).toBe(5);
          expect(groupMetadata.getProperty("isInstanced")).toBe(true);
        });
      });

      it("initializes groupMetadata for inner contents (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withGroupMetadataLegacyUrl
        ).then(function (tileset) {
          const multipleContents = tileset.root.content;
          const innerContents = multipleContents.innerContents;

          const buildingsContent = innerContents[0];
          let groupMetadata = buildingsContent.groupMetadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(255, 127, 0)
          );
          expect(groupMetadata.getProperty("priority")).toBe(10);
          expect(groupMetadata.getProperty("isInstanced")).toBe(false);

          const cubesContent = innerContents[1];
          groupMetadata = cubesContent.groupMetadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(0, 255, 127)
          );
          expect(groupMetadata.getProperty("priority")).toBe(5);
          expect(groupMetadata.getProperty("isInstanced")).toBe(true);
        });
      });

      it("content metadata returns undefined", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            const content = tileset.root.content;
            expect(content.metadata).not.toBeDefined();
          }
        );
      });

      it("assigning content metadata throws", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            expect(function () {
              const content = tileset.root.content;
              content.metadata = {};
            }).toThrowDeveloperError();
          }
        );
      });

      it("initializes explicit content metadata for inner contents", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withExplicitContentMetadataUrl
        ).then(function (tileset) {
          const multipleContents = tileset.root.content;
          const innerContents = multipleContents.innerContents;

          const batchedContent = innerContents[0];
          const batchedMetadata = batchedContent.metadata;
          expect(batchedMetadata).toBeDefined();
          expect(batchedMetadata.getProperty("highlightColor")).toEqual(
            new Cartesian3(0, 0, 255)
          );
          expect(batchedMetadata.getProperty("author")).toEqual("Cesium");

          const instancedContent = innerContents[1];
          const instancedMetadata = instancedContent.metadata;
          expect(instancedMetadata).toBeDefined();
          expect(instancedMetadata.getProperty("numberOfInstances")).toEqual(
            50
          );
          expect(instancedMetadata.getProperty("author")).toEqual(
            "Sample Author"
          );
        });
      });

      it("initializes explicit content metadata for inner contents (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withExplicitContentMetadataLegacyUrl
        ).then(function (tileset) {
          const multipleContents = tileset.root.content;
          const innerContents = multipleContents.innerContents;

          const batchedContent = innerContents[0];
          const batchedMetadata = batchedContent.metadata;
          expect(batchedMetadata).toBeDefined();
          expect(batchedMetadata.getProperty("highlightColor")).toEqual(
            new Cartesian3(0, 0, 255)
          );
          expect(batchedMetadata.getProperty("author")).toEqual("Cesium");

          const instancedContent = innerContents[1];
          const instancedMetadata = instancedContent.metadata;
          expect(instancedMetadata).toBeDefined();
          expect(instancedMetadata.getProperty("numberOfInstances")).toEqual(
            50
          );
          expect(instancedMetadata.getProperty("author")).toEqual(
            "Sample Author"
          );
        });
      });

      it("initializes implicit content metadata for inner contents", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withImplicitContentMetadataUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          // This retrieves the tile at (1, 1, 1)
          const subtreeChildTile = subtreeRootTile.children[0];

          const multipleContents = subtreeChildTile.content;
          const innerContents = multipleContents.innerContents;

          const buildingContent = innerContents[0];
          const buildingMetadata = buildingContent.metadata;
          expect(buildingMetadata).toBeDefined();
          expect(buildingMetadata.getProperty("height")).toEqual(50);
          expect(buildingMetadata.getProperty("color")).toEqual(
            new Cartesian3(0, 0, 255)
          );

          const treeContent = innerContents[1];
          const treeMetadata = treeContent.metadata;
          expect(treeMetadata).toBeDefined();
          expect(treeMetadata.getProperty("age")).toEqual(16);
        });
      });

      it("initializes implicit content metadata for inner contents (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withImplicitContentMetadataLegacyUrl
        ).then(function (tileset) {
          const placeholderTile = tileset.root;
          const subtreeRootTile = placeholderTile.children[0];

          // This retrieves the tile at (1, 1, 1)
          const subtreeChildTile = subtreeRootTile.children[0];

          const multipleContents = subtreeChildTile.content;
          const innerContents = multipleContents.innerContents;

          const buildingContent = innerContents[0];
          const buildingMetadata = buildingContent.metadata;
          expect(buildingMetadata).toBeDefined();
          expect(buildingMetadata.getProperty("height")).toEqual(50);
          expect(buildingMetadata.getProperty("color")).toEqual(
            new Cartesian3(0, 0, 255)
          );

          const treeContent = innerContents[1];
          const treeMetadata = treeContent.metadata;
          expect(treeMetadata).toBeDefined();
          expect(treeMetadata.getProperty("age")).toEqual(16);
        });
      });
    });
  },
  "WebGL"
);
