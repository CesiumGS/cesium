import Dynamic3DTileContent, {
  ContentHandle,
  RequestHandle,
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

// A basic top-level extension object that will be added to the
// tileset extensions: It defines the "dimensions" of the
// dynamic content, matching the basicDynamicExampleContent
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

// A basic dynamic content that represents what is read from
// the content JSON. The structure is described in the
// basicDynamicExampleExtensionObject
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

// A top-level extension object that will be added to the
// tileset extensions: It defines the "dimensions" of the
// dynamic content, matching the isoDynamicExampleContent,
// where the time stamp is an actual ISO8601 string.
const isoDynamicExampleExtensionObject = {
  dimensions: [
    {
      name: "exampleIsoTimeStamp",
      keySet: ["2013-12-25T00:00:00Z", "2013-12-26T00:00:00Z"],
    },
  ],
};

// A dynamic content that represents what is read from
// the content JSON. The structure is described in the
// isoDynamicExampleExtensionObject
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

/**
 * Creates a buffer containing a minimal valid glTF 2.0 asset
 * in JSON representation.
 *
 * This asset does not contain any binary data. It is only
 * used for the specs.
 *
 * @returns {ArrayBuffer} The buffer
 */
function createDummyGltfBuffer() {
  const gltf = {
    asset: {
      version: "2.0",
    },
  };
  return generateJsonBuffer(gltf).buffer;
}

/**
 * A class that tries to provide mocking infrastructure for the
 * obscure Resource.fetchArrayBuffer behavior.
 *
 * It establishes a spy on Resource.fetchArrayBuffer to return
 * a "mocking" promise. Calling "resolve" or "reject" will
 * resolve or reject this promise accordingly
 */
class ResourceFetchArrayBufferPromiseMock {
  /**
   * Returns a single mocking object.
   *
   * After calling this function, the next call to Resource.fetchArrayBuffer
   * will return a promise that can be resolved or rejected by calling
   * "resolve" or "reject" on this ResourceFetchArrayBufferPromiseMock
   *
   * @returns {ResourceFetchArrayBufferPromiseMock} The mocking object
   */
  static create() {
    const result = new ResourceFetchArrayBufferPromiseMock();
    ResourceFetchArrayBufferPromiseMock.setup([result]);
    return result;
  }

  /**
   * Creates a single object that can be used for mocking
   * Resource.fetchArrayBuffer calls.
   *
   * Instances that are created with this method can be passed
   * to the "setup" method.
   *
   * @returns {ResourceFetchArrayBufferPromiseMock} The mocking object
   */
  static createSingle() {
    const result = new ResourceFetchArrayBufferPromiseMock();
    return result;
  }

  /**
   * Set up the spy for Resource.fetchArrayBuffer to return the
   * mocking promises from the given mocking objects.
   *
   * Subsequent calls to Resource.fetchArrayBuffer will return
   * the "mocking promises" of the given objects. If any
   * of the given objects is undefined, then undefined will
   * be returned (emulating the "throttling" stuff..)
   *
   * @param {ResourceFetchArrayBufferPromiseMock|undefined} resourceFetchArrayBufferPromiseMocks The mocking objects
   */
  static setup(resourceFetchArrayBufferPromiseMocks) {
    let counter = 0;
    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      // XXX_DYNAMIC For some reason, fetchArrayBuffer twiddles with the
      // state of the request, and assigns the url from the
      // resource to it. Seriously, what is all this?
      this.request.url = this.url;
      const resourceFetchArrayBufferPromiseMock =
        resourceFetchArrayBufferPromiseMocks[counter];
      const promise = resourceFetchArrayBufferPromiseMock?.mockPromise;
      counter++;
      console.log(
        `Calling mocked Resource.fetchArrayBuffer for ${this.request.url}, returning ${promise}`,
      );
      return promise;
    });
  }

  /**
   * Default constructor.
   *
   * Only called from factory methods.
   */
  constructor() {
    this.mockResolve = undefined;
    this.mockReject = undefined;
    this.mockPromise = new Promise((resolve, reject) => {
      this.mockResolve = resolve;
      this.mockReject = reject;
    });
  }

  /**
   * Resolve the promise that was previously returned by
   * Resource.fetchArrayBuffer with the given object.
   *
   * @param {any} result The result
   */
  resolve(result) {
    this.mockResolve(result);
  }

  /**
   * Reject the promise that was previously returned by
   * Resource.fetchArrayBuffer with the given error.
   *
   * @param {any} error The error
   */
  reject(error) {
    this.mockReject(error);
  }
}

/**
 * Creates a new, actual Cesium3DTileset object that is used in these
 * specs.
 *
 * The returned tileset will have the given object as its
 * "3DTILES_dynamic" extension.
 *
 * The returned tileset may not be ~"fully valid". It may contain
 * some stuff that only has to be inserted so that it does not
 * crash at random places. (For example, its "root" may not be
 * a real Cesium3DTile objects, but only some dummy object).
 *
 * @param {any} dynamicExtensionObject The extension object that
 * defines the structure of the dynamic content
 * @returns The tileset
 */
function createMockTileset(dynamicExtensionObject) {
  const tileset = new Cesium3DTileset();
  tileset._extensions = {
    "3DTILES_dynamic": dynamicExtensionObject,
  };
  tileset._dynamicContentsDimensions = dynamicExtensionObject.dimensions;

  // XXX_DYNAMIC Has to be inserted, otherwise it crashes...
  tileset.imageBasedLighting = new ImageBasedLighting();

  // XXX_DYNAMIC Have to mock all sorts of stuff, because everybody
  // thinks that "private" does not mean anything.
  const root = {
    tileset: tileset,
    _tileset: tileset,
    computedTransform: new Matrix4(),
  };
  tileset._root = root;

  return tileset;
}

/**
 * A function that has to be called before all specs, and that
 * initializes some ContextLimits values with dummy values to
 * prevent crashes.
 */
function initializeMockContextLimits() {
  // XXX_DYNAMIC Have to do this...
  ContextLimits._maximumCubeMapSize = 2;
  // otherwise, it crashes due to invalid array size near https://github.com/CesiumGS/cesium/blob/453b40d6f10d6da35366ab7c7b7dc5667b1cde06/packages/engine/Source/Scene/DynamicEnvironmentMapManager.js#L84

  // XXX_DYNAMIC Have to do this as well. Sure, the maximum
  // aliased line width has to be set properly for
  // testing dynamic contents.
  ContextLimits._minimumAliasedLineWidth = -10000;
  ContextLimits._maximumAliasedLineWidth = 10000;
}

/**
 * Creates an object that can be used in place of a "FrameState"
 * for these specs.
 *
 * This is not a real FrameState object. It does not contain or
 * require a GL context. It only contains some properties that
 * are acccessed somewhere, and that are filled with dummy
 * values to prevent crashes, but still allow to load the
 * DUMMY(!) Model3DTileContent that is created from the
 * createDummyGltfBuffer glTF objects.
 *
 * @returns {any} Something that can be used like a FrameState
 * in the narrow context of these specs.
 */
function createMockFrameState() {
  // A dummy object that contains the properties that are
  // somewhere assumed to be present...
  const frameState = {
    context: {
      id: "MOCK_CONTEXT_ID",
      uniformState: {
        view3D: new Matrix4(),
      },
    },
    passes: {},
    afterRender: [],
    brdfLutGenerator: {
      update() {
        // Not updating anything here.
      },
    },
    fog: {},
  };
  return frameState;
}

/**
 * Wait util the content from the given content handle is "ready".
 *
 * This will poll the content handle util its content is available
 * (by the underlying request being resolved), and then poll
 * that content until its "ready" flag turns "true", calling
 * contentHandle.updateContent repeatedly.
 *
 * @param {ContentHandle} contentHandle The content handle
 * @param {Cesium3DTileset} tileset The tileset
 * @param {frameState} frameState The frame state
 * @returns {Promise<void>} The promise
 */
async function waitForContentHandleReady(contentHandle, tileset, frameState) {
  await contentHandle.waitForSpecs();
  return pollToPromise(() => {
    // The _content is created once the response was received
    const currentContent = contentHandle._content;
    if (!defined(currentContent)) {
      //console.log("No content yet");
      return false;
    }

    // All the magic is happening here...
    contentHandle.updateContent(tileset, frameState);

    // The afterRender callbacks are what's setting ready=true...
    for (const afterRenderCallback of frameState.afterRender) {
      afterRenderCallback();
    }
    if (!currentContent.ready) {
      //console.log("currentContent not ready", currentContent);
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

    /*/ Quarry/experiments
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

      // Create a promise mock to manually resolve the
      // resource request
      const resourceFetchArrayBufferPromiseMock = ResourceFetchArrayBufferPromiseMock.create();

      // Initially, expect there to be no active contents, but
      // one pending request
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now reject the pending request, and wait for things to settle...
      resourceFetchArrayBufferPromiseMock.reject("SPEC_REJECTION");

      await content.waitForSpecs();

      // Now expect there to be one content, but no pending requests
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(0);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
    });
    //*/

    //========================================================================
    // Experimental:
    // Test for the "setDefaultTimeDynamicContentPropertyProvider"
    // convenience function. It allows setting a dynamic content
    // property provider based on a CesiumJS "Clock", and uses
    // this to determine the current dynamic content properties
    // from the ISO8601 string of the currentTime of the clock.

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
    // Tileset statistics tracking:

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

      const resourceFetchArrayBufferPromiseMock =
        ResourceFetchArrayBufferPromiseMock.create();

      // Expect there to be NO active contents
      // Expect there to be ONE pending request
      // Expect there to be NO attempted requests
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now resolve the pending request...
      resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfBuffer());

      // Wait for things to settle...
      await content.waitForSpecs();

      // Expect there to be ONE active contents
      // Expect there to be NO pending requests
      // Expect there to be NO attempted requests (the request was resolved!)
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(1);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);
    });

    it("tracks the number of attempted requests in the tileset statistics when a request fails", async function () {
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

      // Create a promise mock to manually resolve the
      // resource request
      const resourceFetchArrayBufferPromiseMock =
        ResourceFetchArrayBufferPromiseMock.create();

      // Expect there to be NO active contents
      // Expect there to be ONE pending request
      // Expect there to be NO attempted requests
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now reject the pending request and wait for things to settle
      resourceFetchArrayBufferPromiseMock.reject("SPEC_REJECTION");
      await content.waitForSpecs();

      // Expect there to STILL be to active content (the request failed!)
      // Expect there to be NO more pending requests
      // Expect there to be ONE attempted request
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(0);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
    });

    it("tracks the number of attempted requests in the tileset statistics when a request was not issued due to throttling", async function () {
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

      // Set up the Resource.fetchArrayBuffer mock to return
      // "undefined", emulating that the request was not
      // issued due to throttling
      ResourceFetchArrayBufferPromiseMock.setup([undefined]);

      // Expect there to be NO active contents
      // Expect there to be ONE pending request
      // Expect there to be NO attempted requests
      const activeContentsA = content._activeContents;
      expect(activeContentsA).toEqual([]);
      expect(tileset.statistics.numberOfPendingRequests).toBe(1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Now wait for things to settle. This will involve the
      // fetchArrayBuffer call returning "undefined", meaning
      // that the request was not really issued
      await content.waitForSpecs();

      // Expect there to STILL be NO active contents
      // Expect there to be NO pending requests
      // Expect there to be ONE attempted requests
      const activeContentsB = content._activeContents;
      expect(activeContentsB.length).toEqual(0);
      expect(tileset.statistics.numberOfPendingRequests).toBe(0);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
    });

    //========================================================================
    // Active content URI handling

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

//============================================================================

//============================================================================
// RequestHandle:
// TODO: There should be dedicated tests for the listener handling
// The existing ones (that update the statistics) are actually
// already "integration tests".

describe("Scene/Dynamic3DTileContent/RequestHandle", function () {
  beforeAll(function () {
    initializeMockContextLimits();
  });

  /*/ Quarry/experiments
  it("___XXX_DYNAMIC_REQUEST_HANDLE_WORKS___", async function () {
    // XXX_DYNAMIC So here's the deal:
    //
    // Resource, Request, and RequestScheduler are exposing a
    // pretty confusing and underspecified behavior.
    //
    // For example, Resource.prototype._makeRequest (undocumented!!!) is 
    // doing a lot of stuff:
    // - Assigning some URLs.
    // - Creating a request function (Yeah. Why not...)
    // - Passing that whole thing to the RequestScheduler.
    // - Ignoring the quirks of that class, and setting up some 
    //   chain of promises for some sorts of "retries"....
    //
    // The actual behavior of Resource.fetchArraybuffer has nothing
    // to do with what the inlined code snippet suggests.
    //
    // The whole behavior that is related to "throttling" is 
    // undocumented and confusing (e.g. a request can suddenly
    // become "cancelled" when it is not issued at all...)
    //
    // The fact that it was necessary to introduce the RequestHandle 
    // and ContentHandle classes in an attempt to hide all this already
    // is a time sink that is hard to account for.
    // But in order to test whether these classes DO hide the quirks 
    // of the existing classes, it would be necessary to create mocks 
    // that perfectly(!) mimic this exact behavior. Nothing of that is 
    // specified, so it's nearly impossible to mock it in a way that 
    // reflects the actual behavior. 
    // 
    const urlA = "http://example.com/SPEC_DATA_A.glb";
    const urlB = "http://example.com/SPEC_DATA_B.glb";
    const urlC = "http://example.com/SPEC_DATA_C.glb";
    const resourceA = new Resource({
      url: urlA,
    });
    const requestHandleA = new RequestHandle(resourceA);

    const resourceB = new Resource({
      url: urlB
    });
    const requestHandleB = new RequestHandle(resourceB);

    const resourceC = new Resource({
      url: urlC
    });
    const requestHandleC = new RequestHandle(resourceC);

    // Create mocks to manually resolve the requests
    const resourceFetchArrayBufferPromiseMocks = [];
    resourceFetchArrayBufferPromiseMocks.push(ResourceFetchArrayBufferPromiseMock.createSingle());
    resourceFetchArrayBufferPromiseMocks.push(undefined); // Pretend throttling kicks in here...
    resourceFetchArrayBufferPromiseMocks.push(ResourceFetchArrayBufferPromiseMock.createSingle());
    resourceFetchArrayBufferPromiseMocks.push(ResourceFetchArrayBufferPromiseMock.createSingle());
    ResourceFetchArrayBufferPromiseMock.setup(resourceFetchArrayBufferPromiseMocks);

    // Track the URLs that are resolved/rejected for the specs
    const resolvedUrls = [];
    const rejectedUrls = [];

    // Fetch the promises from the request handles,
    // and track the resolved/rejected URLs
    const resultPromiseA = requestHandleA.getResultPromise();
    resultPromiseA
      .then(function (arrayBuffer) {
        //console.log("resolved A with ", arrayBuffer);
        resolvedUrls.push(urlA);
      })
      .catch(function (error) {
        //console.log("rejected A with ", error);
        rejectedUrls.push(urlA);
      });

      const resultPromiseB = requestHandleB.getResultPromise();
    resultPromiseB
      .then(function (arrayBuffer) {
        //console.log("resolved B with ", arrayBuffer);
        resolvedUrls.push(urlB);
      })
      .catch(function (error) {
        //console.log("rejected B with ", error);
        rejectedUrls.push(urlB);
      });

    const resultPromiseC = requestHandleC.getResultPromise();
    resultPromiseC
      .then(function (arrayBuffer) {
        //console.log("resolved C with ", arrayBuffer);
        resolvedUrls.push(urlC);
      })
      .catch(function (error) {
        //console.log("rejected C with ", error);
        rejectedUrls.push(urlC);
      });

    // Ensure that there are pending requests
    requestHandleA.ensureRequested();
    requestHandleB.ensureRequested();
    requestHandleC.ensureRequested();

    // Resolve the requests that have not been throttled
    resourceFetchArrayBufferPromiseMocks[0].resolve(new ArrayBuffer(12));
    // The second mock is "undefined", emulating throttling
    resourceFetchArrayBufferPromiseMocks[2].resolve(new ArrayBuffer(23));

    // Ensure that there are pending requests (this will retry
    // the one that has been throttled)
    requestHandleA.ensureRequested();
    requestHandleB.ensureRequested();
    requestHandleC.ensureRequested();

    // Finally, resolve the request that was retried after being
    // throttled in the first call
    resourceFetchArrayBufferPromiseMocks[3].resolve(new ArrayBuffer(34));

    // Wait and see...
    await resultPromiseA;
    await resultPromiseC;
    await resultPromiseB;

    //console.log("resolvedUrls: ", resolvedUrls);
    //console.log("rejectedUrls: ", rejectedUrls);

    // Expect the resolved URLs in the order in which they have been resolved
    // Expect no URLs to have been rejected
    expect(resolvedUrls).toEqual([ urlA, urlC, urlB ]);
    expect(rejectedUrls).toEqual([]);
  });
  //*/

  it("properly resolves the result promise when the resource promise is resolved", async function () {
    const resource = new Resource({ url: "http://example.com/SPEC_DATA.glb" });
    const requestHandle = new RequestHandle(resource);

    // Create a promise mock to manually resolve the
    // resource request
    const resourceFetchArrayBufferPromiseMock =
      ResourceFetchArrayBufferPromiseMock.create();

    // Fetch the promise from the request handle
    let resolveCount = 0;
    const resultPromise = requestHandle.getResultPromise();
    resultPromise
      .then(function (arrayBuffer) {
        if (defined(arrayBuffer)) {
          resolveCount++;
        }
      })
      .catch(function (error) {
        console.log("Should not happen in this spec: ", error);
      });

    // Ensure that there is a pending request
    requestHandle.ensureRequested();

    // This can be called any number of times...
    requestHandle.ensureRequested();
    requestHandle.ensureRequested();

    // Now resolve the pending request
    resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfBuffer());

    await expectAsync(resultPromise).toBeResolved();
    expect(resolveCount).toBe(1);
  });

  it("properly rejects the result promise when the resource promise is rejected", async function () {
    const resource = new Resource({ url: "http://example.com/SPEC_DATA.glb" });
    const requestHandle = new RequestHandle(resource);

    // Create a promise mock to manually resolve the
    // resource request
    const resourceFetchArrayBufferPromiseMock =
      ResourceFetchArrayBufferPromiseMock.create();

    // Fetch the promise from the request handle
    let rejectCount = 0;
    const resultPromise = requestHandle.getResultPromise();
    resultPromise
      .then(function (arrayBuffer) {
        console.log("Should not happen in this spec: ", arrayBuffer);
      })
      .catch(function (error) {
        rejectCount++;
      });

    // Ensure that there is a pending request
    requestHandle.ensureRequested();

    // This can be called any number of times...
    requestHandle.ensureRequested();
    requestHandle.ensureRequested();

    // Now resolve the pending request
    resourceFetchArrayBufferPromiseMock.reject("SPEC_REJECTION");

    await expectAsync(resultPromise).toBeRejectedWith("SPEC_REJECTION");
    expect(rejectCount).toBe(1);
  });

  it("properly rejects the result promise when the request is cancelled", async function () {
    const resource = new Resource({ url: "http://example.com/SPEC_DATA.glb" });
    const requestHandle = new RequestHandle(resource);

    // Create a promise mock to not actually send out a request
    ResourceFetchArrayBufferPromiseMock.create();

    // Fetch the promise from the request handle
    let rejectCount = 0;
    const resultPromise = requestHandle.getResultPromise();
    resultPromise
      .then(function (arrayBuffer) {
        console.log("Should not happen in this spec: ", arrayBuffer);
      })
      .catch(function (error) {
        rejectCount++;
      });

    // Ensure that there is a pending request
    requestHandle.ensureRequested();

    // This can be called any number of times...
    requestHandle.ensureRequested();
    requestHandle.ensureRequested();

    // Now cancel the pending request
    requestHandle.cancel();

    await expectAsync(resultPromise).toBeRejectedWithError();
    expect(rejectCount).toBe(1);
  });

  it("properly retries and eventually resolves throttled requests", async function () {
    const urlA = "http://example.com/SPEC_DATA_A.glb";
    const urlB = "http://example.com/SPEC_DATA_B.glb";
    const urlC = "http://example.com/SPEC_DATA_C.glb";
    const resourceA = new Resource({
      url: urlA,
    });
    const requestHandleA = new RequestHandle(resourceA);

    const resourceB = new Resource({
      url: urlB,
    });
    const requestHandleB = new RequestHandle(resourceB);

    const resourceC = new Resource({
      url: urlC,
    });
    const requestHandleC = new RequestHandle(resourceC);

    // Create mocks to manually resolve the requests
    const resourceFetchArrayBufferPromiseMocks = [];
    resourceFetchArrayBufferPromiseMocks.push(
      ResourceFetchArrayBufferPromiseMock.createSingle(),
    );
    resourceFetchArrayBufferPromiseMocks.push(undefined); // Pretend throttling kicks in here...
    resourceFetchArrayBufferPromiseMocks.push(
      ResourceFetchArrayBufferPromiseMock.createSingle(),
    );
    resourceFetchArrayBufferPromiseMocks.push(
      ResourceFetchArrayBufferPromiseMock.createSingle(),
    );
    ResourceFetchArrayBufferPromiseMock.setup(
      resourceFetchArrayBufferPromiseMocks,
    );

    // Track the URLs that are resolved/rejected for the specs
    const resolvedUrls = [];
    const rejectedUrls = [];

    // Fetch the promises from the request handles,
    // and track the resolved/rejected URLs
    const resultPromiseA = requestHandleA.getResultPromise();
    resultPromiseA
      .then(function (arrayBuffer) {
        //console.log("resolved A with ", arrayBuffer);
        resolvedUrls.push(urlA);
      })
      .catch(function (error) {
        //console.log("rejected A with ", error);
        rejectedUrls.push(urlA);
      });

    const resultPromiseB = requestHandleB.getResultPromise();
    resultPromiseB
      .then(function (arrayBuffer) {
        //console.log("resolved B with ", arrayBuffer);
        resolvedUrls.push(urlB);
      })
      .catch(function (error) {
        //console.log("rejected B with ", error);
        rejectedUrls.push(urlB);
      });

    const resultPromiseC = requestHandleC.getResultPromise();
    resultPromiseC
      .then(function (arrayBuffer) {
        //console.log("resolved C with ", arrayBuffer);
        resolvedUrls.push(urlC);
      })
      .catch(function (error) {
        //console.log("rejected C with ", error);
        rejectedUrls.push(urlC);
      });

    // Ensure that there are pending requests
    requestHandleA.ensureRequested();
    requestHandleB.ensureRequested();
    requestHandleC.ensureRequested();

    // Resolve the requests that have not been throttled
    resourceFetchArrayBufferPromiseMocks[0].resolve(new ArrayBuffer(12));
    // The second mock is "undefined", emulating throttling
    resourceFetchArrayBufferPromiseMocks[2].resolve(new ArrayBuffer(23));

    // Ensure that there are pending requests (this will retry
    // the one that has been throttled)
    requestHandleA.ensureRequested();
    requestHandleB.ensureRequested();
    requestHandleC.ensureRequested();

    // Finally, resolve the request that was retried after being
    // throttled in the first call
    resourceFetchArrayBufferPromiseMocks[3].resolve(new ArrayBuffer(34));

    // Wait and see...
    await resultPromiseA;
    await resultPromiseC;
    await resultPromiseB;

    //console.log("resolvedUrls: ", resolvedUrls);
    //console.log("rejectedUrls: ", rejectedUrls);

    // Expect the resolved URLs in the order in which they have been resolved
    // Expect no URLs to have been rejected
    expect(resolvedUrls).toEqual([urlA, urlC, urlB]);
    expect(rejectedUrls).toEqual([]);
  });
});
//============================================================================

//============================================================================
// ContentHandle:

describe(
  "Scene/Dynamic3DTileContent/ContentHandle",
  function () {
    beforeAll(function () {
      initializeMockContextLimits();
    });

    /*/ Quarry/experiments
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

      // Create a promise mock to manually resolve the
      // resource request
      const resourceFetchArrayBufferPromiseMock = ResourceFetchArrayBufferPromiseMock.create();

      const triedContent = contentHandle.tryGetContent();
      console.log("tryGetContent", triedContent);

      // Now resolve the pending request...
      resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfBuffer());

      // Wait for the content to become "ready"
      await waitForContentHandleReady(contentHandle, tileset, frameState);
    });
    //*/

    //========================================================================
    // Content listener handling.
    //
    // These listeners will, in reality, be attached to the content handles
    // that are created in the Dynamic3DTileContent, via the
    //  _attachTilesetStatisticsTracker function. There, they will
    // be used to update the tileset statistics according to the content
    // that is loaded or unloaded.
    //
    // It does not matter what these listeners are doing!
    //
    // There should be specs for the tileset statistics, to check whether
    // they are properly handling loaded/unloaded content.
    //
    // Here is a spec that only checks whether the listeners are informed
    // properly.
    //
    // (Later, there may be some "integration level" test (with an actual
    // tileset JSON being loaded from the Specs/Data), where the combination
    // of both is tested. But apart from that, "loading contents" and
    // "updating some statistics" are COMPLETELY unrelated things, and
    // should be tested independently)

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

      // Create a promise mock to manually resolve the
      // resource request
      const resourceFetchArrayBufferPromiseMock =
        ResourceFetchArrayBufferPromiseMock.create();

      // Try to get the content (it's not there yet...)
      contentHandle.tryGetContent();

      // Now resolve the pending request...
      resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfBuffer());

      // Wait for the content to become "ready"
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

      // Create a promise mock to manually resolve the
      // resource request
      const resourceFetchArrayBufferPromiseMock =
        ResourceFetchArrayBufferPromiseMock.create();

      // Try to get the content (it's not there yet...)
      contentHandle.tryGetContent();

      // Now resolve the pending request...
      resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfBuffer());

      // Wait for the content to become "ready"
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
