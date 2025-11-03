import { Cesium3DTileset, Resource } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import Dynamic3DTileContent from "../../Source/Scene/Dynamic3DTileContent.js";
import Clock from "../../Source/Core/Clock.js";
import JulianDate from "../../Source/Core/JulianDate.js";
import ClockRange from "../../Source/Core/ClockRange.js";
import ClockStep from "../../Source/Core/ClockStep.js";
import generateJsonBuffer from "../../../../Specs/generateJsonBuffer.js";
import ContextLimits from "../../Source/Renderer/ContextLimits.js";

const basicDynamicExampleExtensionObject = {
  dimensions: [
    {
      name: "exampleTimeStamp",
      keySet: ["2025-09-25", "2025-09-26"],
    },
    {
      name: "exampleRevision",
      keySet: ["revision0", "revision1"],
    },
  ],
};

const basicDynamicExampleContent = {
  dynamicContents: [
    {
      uri: "exampleContent-2025-09-25-revision0.glb",
      keys: {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision0",
      },
    },
    {
      uri: "exampleContent-2025-09-25-revision1.glb",
      keys: {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision1",
      },
    },
    {
      uri: "exampleContent-2025-09-26-revision1.glb",
      keys: {
        exampleTimeStamp: "2025-09-26",
        exampleRevision: "revision0",
      },
    },
    {
      uri: "exampleContent-2025-09-26-revision1.glb",
      keys: {
        exampleTimeStamp: "2025-09-26",
        exampleRevision: "revision1",
      },
    },
  ],
};

const basicDynamicExampleTilesetJson = {
  asset: {
    version: "1.1",
  },

  extensions: {
    "3DTILES_dynamic": basicDynamicExampleExtensionObject,
  },

  geometricError: 4096,
  root: {
    boundingVolume: {
      box: [32.0, -1.5, 0, 32.0, 0, 0, 0, 1.5, 0, 0, 0, 0],
    },
    geometricError: 512,
    content: {
      uri: "content.json",
    },
    refine: "REPLACE",
  },
};

const isoDynamicExampleExtensionObject = {
  dimensions: [
    {
      name: "exampleIsoTimeStamp",
      keySet: ["2013-12-25T00:00:00Z", "2013-12-26T00:00:00Z"],
    },
  ],
};

const isoDynamicExampleContent = {
  dynamicContents: [
    {
      uri: "exampleContent-iso-A.glb",
      keys: {
        exampleIsoTimeStamp: "2013-12-25T00:00:00Z",
      },
    },
    {
      uri: "exampleContent-iso-B.glb",
      keys: {
        exampleIsoTimeStamp: "2013-12-26T00:00:00Z",
        exampleRevision: "revision1",
      },
    },
  ],
};

function createDummyGltfBuffer() {
  const gltf = {
    asset: {
      version: "2.0",
    },
  };
  return generateJsonBuffer(gltf).buffer;
}

describe(
  "Scene/Dynamic3DTileContent",
  function () {
    let scene;

    const tilesetResource = new Resource({ url: "http://example.com" });

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("___XXX_DYNAMIC_WORKS___", async function () {
      // Create a dummy tileset for testing the statistic tracking
      const tileset = {
        statistics: {
          numberOfPendingRequests: 0,
          numberOfAttemptedRequests: 0,
        },

        extensions: {
          "3DTILES_dynamic": basicDynamicExampleExtensionObject,
        },
      };

      // Create a dummy tile for testing the statistic tracking
      // XXX Have to mock all sorts of stuff, because everybody
      // thinks that "private" does not mean anything.
      const tile = {
        tileset: tileset,
        _tileset: tileset,
      };

      // XXX Have to do this...
      ContextLimits._maximumCubeMapSize = 2;
      // otherwise, it crashes due to invalid array size after at https://github.com/CesiumGS/cesium/blob/453b40d6f10d6da35366ab7c7b7dc5667b1cde06/packages/engine/Source/Scene/DynamicEnvironmentMapManager.js#L84

      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        basicDynamicExampleContent,
      );

      const dynamicContentProperties = {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision0",
      };
      tileset.dynamicContentPropertyProvider = () => {
        return dynamicContentProperties;
      };

      // Create a mock promise to manually resolve the
      // resource request
      // eslint-disable-next-line no-unused-vars
      let mockResolve;
      let mockReject;
      const mockPromise = new Promise((resolve, reject) => {
        mockResolve = resolve;
        mockReject = reject;
      });
      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        // XXX For some reason, fetchArrayBuffer twiddles with the
        // state of the request, and assigns the url from the
        // resource to it. Seriously, what is all this?
        this.request.url = this.url;
        console.log("returning mockPromise");
        return mockPromise;
      });

      // Initially, expect there to be no active contents, but
      // one pending request
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now reject the pending request, and wait for things to settle...
      mockReject("SPEC_REJECTION");
      for (const contentHandle of content._contentHandles.values()) {
        await contentHandle.awaitPromise();
      }

      // Now expect there to be one content, but no pending requests
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(0);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
    });

    it("BASIC___XXX_DYNAMIC_WORKS___", function () {
      // For spec: Create a dummy tileset and fill it
      // with the necessary (private!) properties
      const tileset = new Cesium3DTileset();
      tileset._extensions = {
        "3DTILES_dynamic": isoDynamicExampleExtensionObject,
      };
      tileset._dynamicContentsDimensions =
        isoDynamicExampleExtensionObject.dimensions;

      const tile = {};
      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        isoDynamicExampleContent,
      );

      // Create a dummy clock for the dynamic content property provider
      const clock = new Clock({
        startTime: JulianDate.fromIso8601("2013-12-25"),
        currentTime: JulianDate.fromIso8601("2013-12-25"),
        stopTime: JulianDate.fromIso8601("2013-12-26"),
        clockRange: ClockRange.LOOP_STOP,
        clockStep: ClockStep.SYSTEM_CLOCK_MULTIPLIER,
      });
      tileset.setDefaultTimeDynamicContentPropertyProvider(
        "exampleIsoTimeStamp",
        clock,
      );

      // Expect the active content URIs to match the content
      // URIs for the current dynamic content properties
      const activeContentUrisA = content._activeContentUris;
      expect(activeContentUrisA).toEqual(["exampleContent-iso-A.glb"]);

      // Change the current clock time, and expect this
      // to be reflected in the active content URIs
      clock.currentTime = JulianDate.fromIso8601("2013-12-26");

      const activeContentUrisB = content._activeContentUris;
      expect(activeContentUrisB).toEqual(["exampleContent-iso-B.glb"]);
    });

    it("___QUARRY___XXX_DYNAMIC_WORKS___", function () {
      const tileset = basicDynamicExampleTilesetJson;
      const tile = {};
      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        basicDynamicExampleContent,
      );

      const dynamicContentProperties = {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision0",
      };
      tileset.dynamicContentPropertyProvider = () => {
        return dynamicContentProperties;
      };

      // Expect the active content URIs to match the content
      // URIs for the current dynamic content properties
      const activeContentUrisA = content._activeContentUris;
      expect(activeContentUrisA).toEqual([
        "exampleContent-2025-09-25-revision0.glb",
      ]);

      // Change the dynamic content properties, and expect
      // this to be reflected in the active content URIs
      dynamicContentProperties.exampleRevision = "revision1";

      const activeContentUrisB = content._activeContentUris;
      expect(activeContentUrisB).toEqual([
        "exampleContent-2025-09-25-revision1.glb",
      ]);
    });

    //========================================================================
    // Experimental

    it("returns the active content URIs matching the object that is returned by the default time-dynamic content property provider", function () {
      // For spec: Create a dummy tileset and fill it
      // with the necessary (private!) properties
      const tileset = new Cesium3DTileset();
      tileset._extensions = {
        "3DTILES_dynamic": isoDynamicExampleExtensionObject,
      };
      tileset._dynamicContentsDimensions =
        isoDynamicExampleExtensionObject.dimensions;

      const tile = {};
      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        isoDynamicExampleContent,
      );

      // Create a dummy clock for the dynamic content property provider
      const clock = new Clock({
        startTime: JulianDate.fromIso8601("2013-12-25"),
        currentTime: JulianDate.fromIso8601("2013-12-25"),
        stopTime: JulianDate.fromIso8601("2013-12-26"),
        clockRange: ClockRange.LOOP_STOP,
        clockStep: ClockStep.SYSTEM_CLOCK_MULTIPLIER,
      });
      tileset.setDefaultTimeDynamicContentPropertyProvider(
        "exampleIsoTimeStamp",
        clock,
      );

      // Expect the active content URIs to match the content
      // URIs for the current dynamic content properties
      const activeContentUrisA = content._activeContentUris;
      expect(activeContentUrisA).toEqual(["exampleContent-iso-A.glb"]);

      // Change the current clock time, and expect this
      // to be reflected in the active content URIs
      clock.currentTime = JulianDate.fromIso8601("2013-12-26");

      const activeContentUrisB = content._activeContentUris;
      expect(activeContentUrisB).toEqual(["exampleContent-iso-B.glb"]);
    });

    //========================================================================
    // Veeery experimental...

    it("tracks the number of pending requests in the tileset statistics", async function () {
      // Create a dummy tileset for testing the statistic tracking
      const tileset = {
        statistics: {
          numberOfPendingRequests: 0,
          numberOfAttemptedRequests: 0,
        },

        extensions: {
          "3DTILES_dynamic": basicDynamicExampleExtensionObject,
        },
      };

      // Create a dummy tile for testing the statistic tracking
      // XXX Have to mock all sorts of stuff, because everybody
      // thinks that "private" does not mean anything.
      const tile = {
        tileset: tileset,
        _tileset: tileset,
      };

      // XXX Have to do this...
      ContextLimits._maximumCubeMapSize = 2;
      // otherwise, it crashes due to invalid array size after at https://github.com/CesiumGS/cesium/blob/453b40d6f10d6da35366ab7c7b7dc5667b1cde06/packages/engine/Source/Scene/DynamicEnvironmentMapManager.js#L84

      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        basicDynamicExampleContent,
      );

      const dynamicContentProperties = {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision0",
      };
      tileset.dynamicContentPropertyProvider = () => {
        return dynamicContentProperties;
      };

      // Create a mock promise to manually resolve the
      // resource request
      let mockResolve;
      // eslint-disable-next-line no-unused-vars
      let mockReject;
      const mockPromise = new Promise((resolve, reject) => {
        mockResolve = resolve;
        mockReject = reject;
      });
      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        // XXX For some reason, fetchArrayBuffer twiddles with the
        // state of the request, and assigns the url from the
        // resource to it. Seriously, what is all this?
        this.request.url = this.url;
        console.log("returning mockPromise");
        return mockPromise;
      });

      // Initially, expect there to be no active contents, but
      // one pending request
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now resolve the pending request...
      mockResolve(createDummyGltfBuffer());

      // Wait for things to settle...
      for (const contentHandle of content._contentHandles.values()) {
        await contentHandle.awaitPromise();
      }

      // Now expect there to be one content, but no pending requests
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(1);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);
    });

    it("tracks the number of attempted requests in the tileset statistics", async function () {
      // Create a dummy tileset for testing the statistic tracking
      const tileset = {
        statistics: {
          numberOfPendingRequests: 0,
          numberOfAttemptedRequests: 0,
        },

        extensions: {
          "3DTILES_dynamic": basicDynamicExampleExtensionObject,
        },
      };

      // Create a dummy tile for testing the statistic tracking
      // XXX Have to mock all sorts of stuff, because everybody
      // thinks that "private" does not mean anything.
      const tile = {
        tileset: tileset,
        _tileset: tileset,
      };

      // XXX Have to do this...
      ContextLimits._maximumCubeMapSize = 2;
      // otherwise, it crashes due to invalid array size after at https://github.com/CesiumGS/cesium/blob/453b40d6f10d6da35366ab7c7b7dc5667b1cde06/packages/engine/Source/Scene/DynamicEnvironmentMapManager.js#L84

      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        basicDynamicExampleContent,
      );

      const dynamicContentProperties = {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision0",
      };
      tileset.dynamicContentPropertyProvider = () => {
        return dynamicContentProperties;
      };

      // Create a mock promise to manually resolve the
      // resource request
      // eslint-disable-next-line no-unused-vars
      let mockResolve;
      let mockReject;
      const mockPromise = new Promise((resolve, reject) => {
        mockResolve = resolve;
        mockReject = reject;
      });
      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        // XXX For some reason, fetchArrayBuffer twiddles with the
        // state of the request, and assigns the url from the
        // resource to it. Seriously, what is all this?
        this.request.url = this.url;
        console.log("returning mockPromise");
        return mockPromise;
      });

      // Initially, expect there to be no active contents, but
      // one pending request
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now reject the pending request
      mockReject("SPEC_REJECTION");

      // Wait for things to settle...
      for (const contentHandle of content._contentHandles.values()) {
        await contentHandle.awaitPromise();
      }

      // Now expect there to be one content, but no pending requests
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(0);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
    });

    //========================================================================
    // DONE:

    it("returns an empty array as the active content URIs when there is no dynamicContentPropertyProvider", function () {
      const tileset = basicDynamicExampleTilesetJson;

      // For spec: There is no dynamicContentPropertyProvider
      tileset.dynamicContentPropertyProvider = undefined;
      const tile = {};
      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        basicDynamicExampleContent,
      );

      const activeContentUris = content._activeContentUris;
      expect(activeContentUris).toEqual([]);
    });

    it("returns an empty array as the active content URIs when the dynamicContentPropertyProvider returns undefined", function () {
      const tileset = basicDynamicExampleTilesetJson;

      tileset.dynamicContentPropertyProvider = () => {
        // For spec: Return undefined as the current properties
        return undefined;
      };

      const tile = {};
      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        basicDynamicExampleContent,
      );

      const activeContentUris = content._activeContentUris;
      expect(activeContentUris).toEqual([]);
    });

    it("returns an empty array as the active content URIs when the dynamicContentPropertyProvider returns an object that does not have the required properties", function () {
      const tileset = basicDynamicExampleTilesetJson;

      tileset.dynamicContentPropertyProvider = () => {
        // For spec: Return an object that does not have
        // the exampleTimeStamp (but an unused property)
        return {
          ignoredExamplePropertyForSpec: "Ignored",
          exampleRevision: "revision0",
        };
      };

      const tile = {};
      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        basicDynamicExampleContent,
      );

      const activeContentUris = content._activeContentUris;
      expect(activeContentUris).toEqual([]);
    });

    it("returns the active content URIs matching the object that is returned by the dynamicContentPropertyProvider", function () {
      const tileset = basicDynamicExampleTilesetJson;
      const tile = {};
      const content = new Dynamic3DTileContent(
        tileset,
        tile,
        tilesetResource,
        basicDynamicExampleContent,
      );

      const dynamicContentProperties = {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision0",
      };
      tileset.dynamicContentPropertyProvider = () => {
        return dynamicContentProperties;
      };

      // Expect the active content URIs to match the content
      // URIs for the current dynamic content properties
      const activeContentUrisA = content._activeContentUris;
      expect(activeContentUrisA).toEqual([
        "exampleContent-2025-09-25-revision0.glb",
      ]);

      // Change the dynamic content properties, and expect
      // this to be reflected in the active content URIs
      dynamicContentProperties.exampleRevision = "revision1";

      const activeContentUrisB = content._activeContentUris;
      expect(activeContentUrisB).toEqual([
        "exampleContent-2025-09-25-revision1.glb",
      ]);
    });

    /*
    it("requestInnerContents returns promise that resolves to content if successful", async function () {
      const mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
          numberOfAttemptedRequests: 0,
        },
      };
      const tile = {};
      const content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        contentsJson,
      );

      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        return Promise.resolve(makeGltfBuffer());
      });

      const promise = content.requestInnerContents();
      expect(mockTileset.statistics.numberOfPendingRequests).toBe(3);
      expect(mockTileset.statistics.numberOfAttemptedRequests).toBe(0);

      await expectAsync(promise).toBeResolvedTo(jasmine.any(Array));
      expect(mockTileset.statistics.numberOfPendingRequests).toBe(0);
      expect(mockTileset.statistics.numberOfAttemptedRequests).toBe(0);
    });

    it("requestInnerContents returns undefined and updates statistics if all requests cannot be scheduled", function () {
      const mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
          numberOfAttemptedRequests: 0,
        },
      };
      const tile = {};
      const content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        contentsJson,
      );

      RequestScheduler.maximumRequestsPerServer = 2;
      expect(content.requestInnerContents()).toBeUndefined();
      expect(mockTileset.statistics.numberOfPendingRequests).toBe(0);
      expect(mockTileset.statistics.numberOfAttemptedRequests).toBe(3);
    });

    it("requestInnerContents handles inner content failures", async function () {
      const mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
          numberOfAttemptedRequests: 0,
        },
        tileFailed: new Event(),
      };
      const tile = {};
      const content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        contentsJson,
      );

      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        return Promise.reject(new Error("my error"));
      });

      const failureSpy = jasmine.createSpy();
      mockTileset.tileFailed.addEventListener(failureSpy);

      const promise = content.requestInnerContents();
      expect(mockTileset.statistics.numberOfPendingRequests).toBe(3);
      expect(mockTileset.statistics.numberOfAttemptedRequests).toBe(0);

      await expectAsync(promise).toBeResolved();
      expect(mockTileset.statistics.numberOfPendingRequests).toBe(0);
      expect(mockTileset.statistics.numberOfAttemptedRequests).toBe(0);
      expect(failureSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: "my error",
        }),
      );
    });

    it("requestInnerContents handles cancelled requests", async function () {
      const mockTileset = {
        statistics: {
          numberOfPendingRequests: 0,
          numberOfAttemptedRequests: 0,
        },
      };
      const tile = {};
      const content = new Multiple3DTileContent(
        mockTileset,
        tile,
        tilesetResource,
        contentsJson,
      );

      spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
        return Promise.resolve(makeGltfBuffer());
      });

      const promise = content.requestInnerContents();
      expect(mockTileset.statistics.numberOfPendingRequests).toBe(3);
      expect(mockTileset.statistics.numberOfAttemptedRequests).toBe(0);

      content.cancelRequests();

      await expectAsync(promise).toBeResolved();
      expect(mockTileset.statistics.numberOfPendingRequests).toBe(0);
      expect(mockTileset.statistics.numberOfAttemptedRequests).toBe(3);
    });

    it("becomes ready", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        multipleContentsUrl,
      );
      expect(tileset.root.contentReady).toBeTrue();
      expect(tileset.root.content).toBeDefined();
    });

    it("renders multiple contents", function () {
      return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
        expectRenderMultipleContents,
      );
    });

    it("renders multiple contents (legacy)", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        multipleContentsLegacyUrl,
      ).then(expectRenderMultipleContents);
    });

    it("renders multiple contents (legacy with 'content')", function () {
      return Cesium3DTilesTester.loadTileset(
        scene,
        multipleContentsLegacyWithContentUrl,
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
        expectRenderMultipleContents,
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
        multipleContentsLegacyUrl,
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
            },
          );
        },
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
        metadataClass = MetadataClass.fromJson({
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

      it("group metadata returns undefined", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            const content = tileset.root.content;
            expect(content.group).not.toBeDefined();
          },
        );
      });

      it("assigning group metadata throws", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            expect(function () {
              const content = tileset.root.content;
              content.group = new Cesium3DContentGroup({
                metadata: groupMetadata,
              });
            }).toThrowDeveloperError();
          },
        );
      });

      it("initializes group metadata for inner contents", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withGroupMetadataUrl,
        ).then(function (tileset) {
          const multipleContents = tileset.root.content;
          const innerContents = multipleContents.innerContents;

          const buildingsContent = innerContents[0];
          let groupMetadata = buildingsContent.group.metadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(255, 127, 0),
          );
          expect(groupMetadata.getProperty("priority")).toBe(10);
          expect(groupMetadata.getProperty("isInstanced")).toBe(false);

          const cubesContent = innerContents[1];
          groupMetadata = cubesContent.group.metadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(0, 255, 127),
          );
          expect(groupMetadata.getProperty("priority")).toBe(5);
          expect(groupMetadata.getProperty("isInstanced")).toBe(true);
        });
      });

      it("initializes group metadata for inner contents (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withGroupMetadataLegacyUrl,
        ).then(function (tileset) {
          const multipleContents = tileset.root.content;
          const innerContents = multipleContents.innerContents;

          const buildingsContent = innerContents[0];
          let groupMetadata = buildingsContent.group.metadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(255, 127, 0),
          );
          expect(groupMetadata.getProperty("priority")).toBe(10);
          expect(groupMetadata.getProperty("isInstanced")).toBe(false);

          const cubesContent = innerContents[1];
          groupMetadata = cubesContent.group.metadata;
          expect(groupMetadata).toBeDefined();
          expect(groupMetadata.getProperty("color")).toEqual(
            new Cartesian3(0, 255, 127),
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
          },
        );
      });

      it("assigning content metadata throws", function () {
        return Cesium3DTilesTester.loadTileset(scene, multipleContentsUrl).then(
          function (tileset) {
            expect(function () {
              const content = tileset.root.content;
              content.metadata = {};
            }).toThrowDeveloperError();
          },
        );
      });

      it("initializes explicit content metadata for inner contents", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withExplicitContentMetadataUrl,
        ).then(function (tileset) {
          const multipleContents = tileset.root.content;
          const innerContents = multipleContents.innerContents;

          const batchedContent = innerContents[0];
          const batchedMetadata = batchedContent.metadata;
          expect(batchedMetadata).toBeDefined();
          expect(batchedMetadata.getProperty("highlightColor")).toEqual(
            new Cartesian3(0, 0, 255),
          );
          expect(batchedMetadata.getProperty("author")).toEqual("Cesium");

          const instancedContent = innerContents[1];
          const instancedMetadata = instancedContent.metadata;
          expect(instancedMetadata).toBeDefined();
          expect(instancedMetadata.getProperty("numberOfInstances")).toEqual(
            50,
          );
          expect(instancedMetadata.getProperty("author")).toEqual(
            "Sample Author",
          );
        });
      });

      it("initializes explicit content metadata for inner contents (legacy)", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withExplicitContentMetadataLegacyUrl,
        ).then(function (tileset) {
          const multipleContents = tileset.root.content;
          const innerContents = multipleContents.innerContents;

          const batchedContent = innerContents[0];
          const batchedMetadata = batchedContent.metadata;
          expect(batchedMetadata).toBeDefined();
          expect(batchedMetadata.getProperty("highlightColor")).toEqual(
            new Cartesian3(0, 0, 255),
          );
          expect(batchedMetadata.getProperty("author")).toEqual("Cesium");

          const instancedContent = innerContents[1];
          const instancedMetadata = instancedContent.metadata;
          expect(instancedMetadata).toBeDefined();
          expect(instancedMetadata.getProperty("numberOfInstances")).toEqual(
            50,
          );
          expect(instancedMetadata.getProperty("author")).toEqual(
            "Sample Author",
          );
        });
      });

      it("initializes implicit content metadata for inner contents", function () {
        return Cesium3DTilesTester.loadTileset(
          scene,
          withImplicitContentMetadataUrl,
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
            new Cartesian3(0, 0, 255),
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
          withImplicitContentMetadataLegacyUrl,
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
            new Cartesian3(0, 0, 255),
          );

          const treeContent = innerContents[1];
          const treeMetadata = treeContent.metadata;
          expect(treeMetadata).toBeDefined();
          expect(treeMetadata.getProperty("age")).toEqual(16);
        });
      });
    });
    */
  },
  "WebGL",
);
