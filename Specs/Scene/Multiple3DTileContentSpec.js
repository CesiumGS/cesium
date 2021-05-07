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
  when,
} from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";
import generateJsonBuffer from "../generateJsonBuffer.js";

describe(
  "Scene/Multiple3DTileContent",
  function () {
    var scene;

    // This scene is the same as Composite/Composite, just rephrased
    // using 3DTILES_multiple_contents
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;
    var multipleContentsUrl =
      "./Data/Cesium3DTiles/MultipleContents/MultipleContents/tileset.json";

    var tilesetResource = new Resource({ url: "http://example.com" });
    var extensionJson = {
      content: [
        {
          uri: "pointcloud.pnts",
        },
        {
          uri: "batched.b3dm",
        },
        {
          uri: "gltfModel.glb",
        },
      ],
    };

    function makeGltfBuffer() {
      var gltf = {
        asset: {
          version: "1.0",
        },
      };
      return generateJsonBuffer(gltf).buffer;
    }

    var originalRequestsPerServer;

    function setZoom(distance) {
      var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
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
        var pickedBuilding = result;
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

        var pickedInstance;
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

    it("innerContentUrls returns the urls from the extension", function () {
      var tileset = {};
      var tile = {};
      var content = new Multiple3DTileContent(
        tileset,
        tile,
        tilesetResource,
        extensionJson
      );

      expect(content.innerContentUrls).toEqual([
        "pointcloud.pnts",
        "batched.b3dm",
        "gltfModel.glb",
      ]);
    });

    it("contentsFetchedPromise is undefined until requestInnerContents is successful", function () {
      var mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
        },
      };
      var tile = {};
      var content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        extensionJson
      );

      expect(content.contentsFetchedPromise).not.toBeDefined();

      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        return when.resolve(makeGltfBuffer());
      });
      content.requestInnerContents();
      expect(content.contentsFetchedPromise).toBeDefined();
    });

    it("contentsFetchedPromise is undefined if no requests are scheduled", function () {
      var mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
        },
      };
      var tile = {};
      var content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        extensionJson
      );

      expect(content.contentsFetchedPromise).not.toBeDefined();

      RequestScheduler.maximumRequestsPerServer = 2;
      content.requestInnerContents();

      expect(content.contentsFetchedPromise).not.toBeDefined();
    });

    it("requestInnerContents returns 0 if successful", function () {
      var mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
        },
      };
      var tile = {};
      var content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        extensionJson
      );

      var fetchArray = spyOn(
        Resource.prototype,
        "fetchArrayBuffer"
      ).and.callFake(function () {
        return when.resolve(makeGltfBuffer());
      });
      expect(content.requestInnerContents()).toBe(0);
      expect(fetchArray.calls.count()).toBe(3);
    });

    it("requestInnerContents schedules no requests if there are not enough open slots", function () {
      var mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
        },
      };
      var tile = {};
      var content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        extensionJson
      );

      var fetchArray = spyOn(Resource.prototype, "fetchArrayBuffer");
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

    it("renders valid tiles after tile failure", function () {
      var originalLoadJson = Cesium3DTileset.loadJson;
      spyOn(Cesium3DTileset, "loadJson").and.callFake(function (tilesetUrl) {
        return originalLoadJson(tilesetUrl).then(function (tilesetJson) {
          var content =
            tilesetJson.root.extensions["3DTILES_multiple_contents"].content;
          var badTile = {
            uri: "nonexistent.b3dm",
          };
          content.splice(1, 0, badTile);

          return tilesetJson;
        });
      });
      return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
        expectRenderMultipleContents
      );
    });

    it("cancelRequests cancels in-flight requests", function () {
      viewNothing();
      return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
        function (tileset) {
          viewAllTiles();
          scene.renderForSpecs();

          var multipleContents = tileset.root.content;
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

    describe("3DTILES_metadata", function () {
      var withGroupMetadataUrl =
        "./Data/Cesium3DTiles/MultipleContents/GroupMetadata/tileset.json";

      var metadataClass = new MetadataClass({
        id: "test",
        class: {
          properties: {
            name: {
              type: "STRING",
            },
            height: {
              type: "FLOAT32",
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

      it("groupMetadata returns undefined", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            var content = tileset.root.content;
            expect(content.groupMetadata).not.toBeDefined();
          }
        );
      });

      it("assigning groupMetadata throws", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            expect(function () {
              var content = tileset.root.content;
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
          var multipleContents = tileset.root.content;
          var innerContents = multipleContents.innerContents;

          var buildingsContent = innerContents[0];
          var groupMetadata = buildingsContent.groupMetadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(255, 127, 0)
          );
          expect(groupMetadata.getProperty("priority")).toBe(10);
          expect(groupMetadata.getProperty("isInstanced")).toBe(false);

          var cubesContent = innerContents[1];
          groupMetadata = cubesContent.groupMetadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(0, 255, 127)
          );
          expect(groupMetadata.getProperty("priority")).toBe(5);
          expect(groupMetadata.getProperty("isInstanced")).toBe(true);
        });
      });
    });
  },
  "WebGL"
);
