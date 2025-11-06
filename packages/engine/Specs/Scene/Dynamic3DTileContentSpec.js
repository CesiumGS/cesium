import Dynamic3DTileContent, {
  ContentHandle,
} from "../../Source/Scene/Dynamic3DTileContent.js";
import Clock from "../../Source/Core/Clock.js";
import JulianDate from "../../Source/Core/JulianDate.js";
import ClockRange from "../../Source/Core/ClockRange.js";
import ClockStep from "../../Source/Core/ClockStep.js";
import generateJsonBuffer from "../../../../Specs/generateJsonBuffer.js";
import ContextLimits from "../../Source/Renderer/ContextLimits.js";
import ImageBasedLighting from "../../Source/Scene/ImageBasedLighting.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";
import defined from "../../Source/Core/defined.js";
import Matrix4 from "../../Source/Core/Matrix4.js";
import Cesium3DTileset from "../../Source/Scene/Cesium3DTileset.js";
import Resource from "../../Source/Core/Resource.js";

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

class MockResourceFetchArrayBufferPromise {
  constructor() {
    this.mockResolve = undefined;
    this.mockReject = undefined;
    this.mockPromise = new Promise((resolve, reject) => {
      this.mockResolve = resolve;
      this.mockReject = reject;
    });
    const that = this;
    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      // XXX For some reason, fetchArrayBuffer twiddles with the
      // state of the request, and assigns the url from the
      // resource to it. Seriously, what is all this?
      this.request.url = this.url;
      return that.mockPromise;
    });
  }

  resolve(result) {
    this.mockResolve(result);
  }
  reject(error) {
    this.mockReject(error);
  }
}

function createMockTileset(dynamicExtensionObject) {
  const tileset = new Cesium3DTileset();
  tileset._extensions = {
    "3DTILES_dynamic": dynamicExtensionObject,
  };
  tileset._dynamicContentsDimensions = dynamicExtensionObject.dimensions;

  // XXX Has to be inserted, otherwise it crashes...
  tileset.imageBasedLighting = new ImageBasedLighting();

  // XXX Have to mock all sorts of stuff, because everybody
  // thinks that "private" does not mean anything.
  const root = {
    tileset: tileset,
    _tileset: tileset,
    computedTransform: new Matrix4(),
  };
  tileset._root = root;

  return tileset;
}

function initializeMockContextLimits() {
  // XXX Have to do this...
  ContextLimits._maximumCubeMapSize = 2;
  // otherwise, it crashes due to invalid array size after at https://github.com/CesiumGS/cesium/blob/453b40d6f10d6da35366ab7c7b7dc5667b1cde06/packages/engine/Source/Scene/DynamicEnvironmentMapManager.js#L84

  // XXX Have to do this as well. Sure, the maximum
  // aliased line width has to be set properly for
  // testing dynamic contents.
  ContextLimits._minimumAliasedLineWidth = -10000;
  ContextLimits._maximumAliasedLineWidth = 10000;
}

function createMockFrameState() {
  // XXX More mocking, otherwise it crashes somewhere...
  const frameState = {
    context: {
      id: "01234",
      uniformState: {
        view3D: new Matrix4(),
      },
    },
    passes: {},
    afterRender: [],
    brdfLutGenerator: {
      update() {
        // console.log("Oh, whatever...");
      },
    },
    fog: {},
  };
  return frameState;
}

async function waitForContentHandleReady(contentHandle, tileset, frameState) {
  return pollToPromise(() => {
    const currentContent = contentHandle._content;
    if (!defined(currentContent)) {
      console.log("No content yet");
      return false;
    }
    contentHandle.updateContent(tileset, frameState);
    for (const afterRenderCallback of frameState.afterRender) {
      afterRenderCallback();
    }
    if (!currentContent.ready) {
      console.log("currentContent not ready", currentContent);
      return false;
    }
    return true;
  });
}

describe(
  "Scene/Dynamic3DTileContent",
  function () {
    beforeAll(function () {
      initializeMockContextLimits();
    });

    it("___XXX_DYNAMIC_WORKS___", async function () {
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;

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
      const mockPromise = new MockResourceFetchArrayBufferPromise();

      // Initially, expect there to be no active contents, but
      // one pending request
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now reject the pending request, and wait for things to settle...
      mockPromise.reject("SPEC_REJECTION");
      await content.waitForSpecs();

      // Now expect there to be one content, but no pending requests
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(0);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
    });

    //========================================================================
    // Experimental

    it("returns the active content URIs matching the object that is returned by the default time-dynamic content property provider", function () {
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(isoDynamicExampleExtensionObject);
      const tile = tileset._root;

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
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;

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

      const mockPromise = new MockResourceFetchArrayBufferPromise();

      // Initially, expect there to be no active contents, but
      // one pending request
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now resolve the pending request...
      mockPromise.resolve(createDummyGltfBuffer());

      // Wait for things to settle...
      await content.waitForSpecs();

      // Now expect there to be one content, but no pending requests
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(1);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);
    });

    it("tracks the number of attempted requests in the tileset statistics", async function () {
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;

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
      const mockPromise = new MockResourceFetchArrayBufferPromise();

      // Initially, expect there to be no active contents, but
      // one pending request
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now reject the pending request and wait for things to settle
      mockPromise.reject("SPEC_REJECTION");
      await content.waitForSpecs();

      // Now expect there to be one content, but no pending requests
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(0);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
    });

    //========================================================================
    // DONE:

    it("returns an empty array as the active content URIs when there is no dynamicContentPropertyProvider", function () {
      const tilesetResource = new Resource({ url: "http://example.com" });

      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;

      // For spec: There is no dynamicContentPropertyProvider
      tileset.dynamicContentPropertyProvider = undefined;
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
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;

      tileset.dynamicContentPropertyProvider = () => {
        // For spec: Return undefined as the current properties
        return undefined;
      };

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
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;

      tileset.dynamicContentPropertyProvider = () => {
        // For spec: Return an object that does not have
        // the exampleTimeStamp (but an unused property)
        return {
          ignoredExamplePropertyForSpec: "Ignored",
          exampleRevision: "revision0",
        };
      };

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
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;

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
  },
  "WebGL",
);

describe(
  "Scene/Dynamic3DTileContent/ContentHandle",
  function () {
    beforeAll(function () {
      initializeMockContextLimits();
    });

    it("___XXX_DYNAMIC_CONTENT_HANDLE_WORKS___", async function () {
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;
      const frameState = createMockFrameState();

      const contentHeader = {
        uri: "exampleContent-2025-09-25-revision0.glb",
        keys: {
          exampleTimeStamp: "2025-09-25",
          exampleRevision: "revision0",
        },
      };
      const contentHandle = new ContentHandle(
        tile,
        tilesetResource,
        contentHeader,
      );

      contentHandle.addRequestListener({
        requestAttempted(request) {
          console.log("requestAttempted", request);
          //tileset.statistics.numberOfAttemptedRequests++;
        },
        requestStarted(request) {
          console.log("requestStarted", request);
          //tileset.statistics.numberOfPendingRequests++;
        },
        requestCancelled(request) {
          console.log("requestCancelled", request);
          //tileset.statistics.numberOfPendingRequests--;
        },
        requestCompleted(request) {
          console.log("requestCompleted", request);
          //tileset.statistics.numberOfPendingRequests--;
        },
        requestFailed(request) {
          console.log("requestFailed", request);
          //tileset.statistics.numberOfPendingRequests--;
        },
      });

      contentHandle.addContentListener({
        contentLoadedAndReady(content) {
          console.log("contentLoadedAndReady", content);
          //tileset.statistics.incrementLoadCounts(content);
        },
        contentUnloaded(content) {
          console.log("contentUnloaded", content);
          //tileset.statistics.decrementLoadCounts(content);
        },
      });

      const dynamicContentProperties = {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision0",
      };
      tileset.dynamicContentPropertyProvider = () => {
        return dynamicContentProperties;
      };

      // Create a mock promise to manually resolve the
      // resource request
      const mockPromise = new MockResourceFetchArrayBufferPromise();

      const triedContent = contentHandle.tryGetContent();
      console.log("tryGetContent", triedContent);

      // Now resolve the pending request...
      mockPromise.resolve(createDummyGltfBuffer());

      // Wait for the content to become "ready"
      await contentHandle.waitForSpecs();
      await waitForContentHandleReady(contentHandle, tileset, frameState);
    });

    //========================================================================
    // DONE:

    it("informs listeners about contentLoadedAndReady", async function () {
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;
      const frameState = createMockFrameState();

      const contentHeader = {
        uri: "exampleContent-2025-09-25-revision0.glb",
        keys: {
          exampleTimeStamp: "2025-09-25",
          exampleRevision: "revision0",
        },
      };
      const contentHandle = new ContentHandle(
        tile,
        tilesetResource,
        contentHeader,
      );

      // Attach the listener that is expected to be called
      let contentLoadedAndReadyCallCount = 0;
      contentHandle.addContentListener({
        contentLoadedAndReady(content) {
          //console.log("contentLoadedAndReady", content);
          contentLoadedAndReadyCallCount++;
        },
        contentUnloaded(content) {
          //console.log("contentUnloaded", content);
        },
      });

      const dynamicContentProperties = {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision0",
      };
      tileset.dynamicContentPropertyProvider = () => {
        return dynamicContentProperties;
      };

      // Create a mock promise to manually resolve the
      // resource request
      const mockPromise = new MockResourceFetchArrayBufferPromise();

      // Try to get the content (it's not there yet...)
      contentHandle.tryGetContent();

      // Now resolve the pending request...
      mockPromise.resolve(createDummyGltfBuffer());

      // Wait for the content to become "ready"
      await contentHandle.waitForSpecs();
      await waitForContentHandleReady(contentHandle, tileset, frameState);

      // Expect the listener to have been informed
      expect(contentLoadedAndReadyCallCount).toBe(1);
    });

    it("informs listeners about contentUnloaded", async function () {
      const tilesetResource = new Resource({ url: "http://example.com" });
      const tileset = createMockTileset(basicDynamicExampleExtensionObject);
      const tile = tileset._root;
      const frameState = createMockFrameState();

      const contentHeader = {
        uri: "exampleContent-2025-09-25-revision0.glb",
        keys: {
          exampleTimeStamp: "2025-09-25",
          exampleRevision: "revision0",
        },
      };
      const contentHandle = new ContentHandle(
        tile,
        tilesetResource,
        contentHeader,
      );

      // Attach the listener that is expected to be called
      let contentLoadedAndReadyCallCount = 0;
      let contentUnloadedCallCount = 0;
      contentHandle.addContentListener({
        contentLoadedAndReady(content) {
          //console.log("contentLoadedAndReady", content);
          contentLoadedAndReadyCallCount++;
        },
        contentUnloaded(content) {
          //console.log("contentUnloaded", content);
          contentUnloadedCallCount++;
        },
      });

      const dynamicContentProperties = {
        exampleTimeStamp: "2025-09-25",
        exampleRevision: "revision0",
      };
      tileset.dynamicContentPropertyProvider = () => {
        return dynamicContentProperties;
      };

      // Create a mock promise to manually resolve the
      // resource request
      const mockPromise = new MockResourceFetchArrayBufferPromise();

      // Try to get the content (it's not there yet...)
      contentHandle.tryGetContent();

      // Now resolve the pending request...
      mockPromise.resolve(createDummyGltfBuffer());

      // Wait for the content to become "ready"
      await contentHandle.waitForSpecs();
      await waitForContentHandleReady(contentHandle, tileset, frameState);

      // Reset the handle to unload the content
      contentHandle.reset();

      // Expect the listener to have been informed
      expect(contentLoadedAndReadyCallCount).toBe(1);
      expect(contentUnloadedCallCount).toBe(1);
    });
  },
  "WebGL",
);
