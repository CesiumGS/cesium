import {
  Clock,
  JulianDate,
  ClockRange,
  ClockStep,
  Buffer as CesiumBuffer,
  ImageBasedLighting,
  defined,
  Matrix4,
  Cesium3DTileset,
  Resource,
  ShaderProgram,
  Dynamic3DTileContent,
  RequestScheduler,
  ResourceCache,
  destroyObject,
} from "../../index.js";

// These are not written into the index.js. See "build.js".
import {
  ContentHandle,
  LRUCache,
  NDMap,
  RequestHandle,
} from "../../Source/Scene/Dynamic3DTileContent.js";

// This has to be imported from the source, and not
// from index.js.
import ContextLimits from "../../Source/Renderer/ContextLimits.js";

import generateJsonBuffer from "../../../../Specs/generateJsonBuffer.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

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
 * Creates an array buffer containing a minimal valid glTF 2.0 asset
 * in JSON representation.
 *
 * This asset does not contain any binary data. It is only
 * used for the specs.
 *
 * @returns {ArrayBuffer} The array buffer
 */
function createDummyGltfArrayBuffer() {
  const gltf = {
    asset: {
      version: "2.0",
    },
  };
  return generateJsonBuffer(gltf).buffer;
}

/**
 * Creates an embedded glTF with a single mesh primitive.
 *
 * The mesh primitive is a single unit square with normals and texture
 * coordinates in [(0,0)-(1.1)] and a simple material with a texture
 * with an image that is stored as an embedded 16x16 PNG file
 * where the red channel contains values in [0,256] (and the alpha
 * channels contains 255).
 *
 * @returns The glTF
 */
function createEmbeddedGltf() {
  const gltf = {
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5123,
        count: 6,
        type: "SCALAR",
        max: [3],
        min: [0],
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126,
        count: 4,
        type: "VEC3",
        max: [1.0, 1.0, 0.0],
        min: [0.0, 0.0, 0.0],
      },
      {
        bufferView: 1,
        byteOffset: 48,
        componentType: 5126,
        count: 4,
        type: "VEC3",
        max: [0.0, 0.0, 1.0],
        min: [0.0, 0.0, 1.0],
      },
      {
        bufferView: 1,
        byteOffset: 96,
        componentType: 5126,
        count: 4,
        type: "VEC2",
        max: [1.0, 1.0],
        min: [0.0, 0.0],
      },
    ],
    asset: {
      generator: "JglTF from https://github.com/javagl/JglTF",
      version: "2.0",
    },
    buffers: [
      {
        uri: "data:application/gltf-buffer;base64,AAABAAIAAQADAAIAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAA",
        byteLength: 156,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 12,
        target: 34963,
      },
      {
        buffer: 0,
        byteOffset: 12,
        byteLength: 144,
        byteStride: 12,
        target: 34962,
      },
    ],
    images: [
      {
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABs0lEQVR42hXMUwCWBwBA0b8Wlo1lLHNt2a4tLZtbrdZatm1jWcu2bSxrtWq1Zds438O5jzcUCoU+hSEsXxCO8EQgIl8SichEISrRiE4MQjElFrGJQ1ziEZ8EJOQrEpGYJCQlGcmDQQpJSSpS8zVpSEs60pOBjGQiM1nISrZgkF2+IQff8h05yUVu8pCXfOSnAAUpROFgUESKUozilKAkpShNGcryPT9QjvJUoGIwqCQ/UpkqVKUa1alBTWpRmzrUpR71aRAMGkojGtOEn/iZpjTjF5rTgl9pyW+04vdg0Fra0JZ2tKcDHelEZ7rQlW50pwc96RUMeksf+tKP/gxgIIMYzBCGMozhjGAko4LBaBnDWMYxnglMZBJ/MJkpTGUa05nBzGAwS2Yzh7n8yTzms4CFLGIxS1jKMpazIhislFWsZg1rWcd6NrCRTWxmC1vZxnZ2BIOdsovd7GEv+9jPAQ5yiMMc4Sh/cYzjweCEnOQUpznDWc5xngv8zUUu8Q+XucLVYPCvXOM6//E/N7jJLW5zh7vc4z4PeMijYPBYnvCUZzznBS95xWve8JZ3vOcDH/nEZ7gvfpBCxLDKAAAAAElFTkSuQmCC",
        mimeType: "image/png",
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 1,
              NORMAL: 2,
              TEXCOORD_0: 3,
            },
            indices: 0,
            mode: 4,
            material: 0,
          },
        ],
      },
    ],
    nodes: [
      {
        mesh: 0,
      },
    ],
    samplers: [
      {
        magFilter: 9728,
        minFilter: 9728,
        wrapS: 33071,
        wrapT: 33071,
      },
    ],
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    textures: [
      {
        sampler: 0,
        source: 0,
      },
    ],

    materials: [
      {
        pbrMetallicRoughness: {
          baseColorTexture: {
            index: 0,
          },
          metallicFactor: 0.0,
          roughnessFactor: 1.0,
        },
      },
    ],
  };

  //console.log(JSON.stringify(gltf, null, 2));
  return gltf;
}

/**
 * Creates an array buffer containing a simple glTF 2.0 asset
 * in embedded representation.
 *
 * @returns {ArrayBuffer} The array buffer
 */
function createSimpleGltfArrayBuffer() {
  const gltf = createEmbeddedGltf();
  return generateJsonBuffer(gltf).buffer;
}

/**
 * A class that tries to provide mocking infrastructure for the
 * obscure Resource.fetchArrayBuffer behavior.
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
    ResourceFetchArrayBufferPromiseMock.setupSequence([result]);
    return result;
  }

  /**
   * Creates a single object that can be used for mocking
   * Resource.fetchArrayBuffer calls.
   *
   * Instances that are created with this method do not yet perform
   * any mocking. They are supposed to be passed to the "setupSequence"
   * method.
   *
   * @returns {ResourceFetchArrayBufferPromiseMock} The mocking object
   */
  static createUnbound() {
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
   * This is intended for mocking an exact sequence of calls
   * to the fetchArrayBuffer function.
   *
   * @param {ResourceFetchArrayBufferPromiseMock|undefined} resourceFetchArrayBufferPromiseMocks The mocking objects
   */
  static setupSequence(resourceFetchArrayBufferPromiseMocks) {
    let counter = 0;
    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      // XXX_DYNAMIC For some reason, fetchArrayBuffer assigns the
      // url from the resource to the request of the resource.
      this.request.url = this.url;
      console.log(`Calling mocked Resource.fetchArrayBuffer for ${this.url}`);
      const resourceFetchArrayBufferPromiseMock =
        resourceFetchArrayBufferPromiseMocks[counter];
      const promise = resourceFetchArrayBufferPromiseMock?.mockPromise;
      counter++;
      console.log(
        `Calling mocked Resource.fetchArrayBuffer for ${this.url}, returning ${promise}`,
      );
      return promise;
    });
  }

  /**
   * Create a mocking object for a single URL.
   *
   * This will set up the spy for Resource.fetchArrayBuffer to return the
   * a mocking promise, if the requested URL matches the given URL.
   * (Otherwise, the original fetchArrayBuffer will be called).
   *
   * The mocking promise can be resolved or rejected by calling
   * "resolve" or "reject" on the returned object.
   *
   * @param {string|undefined} mockedUrl The mocked URL
   * @returns {ResourceFetchArrayBufferPromiseMock} resourceFetchArrayBufferPromiseMock The mocking object
   */
  static createSingle(mockedUrl) {
    const resourceFetchArrayBufferPromiseMock =
      ResourceFetchArrayBufferPromiseMock.createUnbound();
    const oldFetchArrayBuffer = Resource.prototype.fetchArrayBuffer;
    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      // XXX_DYNAMIC For some reason, fetchArrayBuffer assigns the
      // url from the resource to the request of the resource.
      this.request.url = this.url;
      if (this.url === mockedUrl) {
        const promise = resourceFetchArrayBufferPromiseMock.mockPromise;
        console.log(
          `Calling fake Resource.fetchArrayBuffer for ${this.url}, returning ${promise}`,
        );
        return promise;
      }
      const boundFetchArrayBuffer = oldFetchArrayBuffer.bind(this);
      const originalResult = boundFetchArrayBuffer();
      console.log(`Calling fake Resource.fetchArrayBuffer for ${this.url}`);
      console.log(
        `  (The mocked URL was ${mockedUrl}, returning original result ${originalResult})`,
      );

      return originalResult;
    });
    return resourceFetchArrayBufferPromiseMock;
  }

  /**
   * Set up the spy for Resource.fetchArrayBuffer to return a
   * promise that is resolved with the given result, if the
   * requested URL matches the given URL.
   * (Otherwise, the original fetchArrayBuffer will be called).
   *
   *
   * @param {string|undefined} mockedUrl The mocked URL
   * @param {any} result The result for the resolved promise
   */
  static createSingleResolved(mockedUrl, result) {
    const oldFetchArrayBuffer = Resource.prototype.fetchArrayBuffer;
    spyOn(Resource.prototype, "fetchArrayBuffer").and.callFake(function () {
      // XXX_DYNAMIC For some reason, fetchArrayBuffer assigns the
      // url from the resource to the request of the resource.
      this.request.url = this.url;
      if (this.url === mockedUrl) {
        console.log(
          `Calling fake Resource.fetchArrayBuffer for ${this.url}, returning resolved ${result}`,
        );
        return Promise.resolve(result);
      }
      const boundFetchArrayBuffer = oldFetchArrayBuffer.bind(this);
      const originalResult = boundFetchArrayBuffer();
      console.log(`Calling fake Resource.fetchArrayBuffer for ${this.url}`);
      console.log(
        `  (The mocked URL was ${mockedUrl}, returning original result ${originalResult})`,
      );
      return originalResult;
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
 * A counter for mocked buffer IDs. Should be a static
 * property of CesiumBufferMocks, but linting complains
 * about that for whatever reason.
 */
let CESIUM_BUFFER_MOCK_ID_COUNTER = 0;

/**
 * A class containing utility functions for mocking aspects that are
 * related to the CesiumJS "Buffer" class.
 */
class CesiumBufferMocks {
  /**
   * Establishes spies on the CesiumJS "Buffer" "createVertexBuffer" and
   * "createIndexBuffer" functions, to return things that are actually
   * (JavaScript!) "Buffer" objects, but also have a (dummy) "destroy()"
   * function to somehow conform to the CesiumJS "Buffer".
   */
  static setup() {
    spyOn(CesiumBuffer, "createVertexBuffer").and.callFake(function (options) {
      console.log("Calling fake Buffer.createVertexBuffer for spec");
      const mockedBuffer = CesiumBufferMocks.createMockedBufferFrom(
        options.typedArray,
      );
      return mockedBuffer;
    });
    spyOn(CesiumBuffer, "createIndexBuffer").and.callFake(function (options) {
      console.log("Calling fake Buffer.createIndexBuffer for spec");
      const mockedBuffer = CesiumBufferMocks.createMockedBufferFrom(
        options.typedArray,
      );
      return mockedBuffer;
    });
  }

  /**
   * Creates a new buffer from the given typed array.
   *
   * The result with be a JavaScript "Buffer" with a dummy "destroy()"
   * method, to resemble a CesiumJS "Buffer", and ... some other
   * random stuff that is accessed somewhere. Whatever.
   *
   * @param {TypedArray} typedArray The typed array
   * @returns {any} The result
   */
  static createMockedBufferFrom(typedArray) {
    const mockedBuffer = typedArray.buffer.slice(
      typedArray.byteOffset,
      typedArray.byteOffset + typedArray.byteLength,
    );
    mockedBuffer.sizeInBytes = typedArray.byteLength;
    mockedBuffer._id = `MOCKED_BUFFER_ID_${CESIUM_BUFFER_MOCK_ID_COUNTER++}`;
    mockedBuffer.destroy = () => {
      destroyObject(mockedBuffer);
      return undefined;
    };

    return mockedBuffer;
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
  tileset.imageBasedLighting = new ImageBasedLighting();
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
  ContextLimits._maximumCubeMapSize = 2;
  ContextLimits._minimumAliasedLineWidth = -10000;
  ContextLimits._maximumAliasedLineWidth = 10000;
  ContextLimits._maximumTextureSize = 16384;
}

/**
 * Creates an object that can be used in place of a "FrameState"
 * for these specs.
 *
 * This is not a real FrameState object. It does not contain or
 * require a GL context. It only contains some properties that
 * are acccessed somewhere, and that are filled with dummy
 * values to prevent crashes. It may not be able to handle
 * loading arbitrary glTF objects.
 *
 * @returns {any} Something that can be used like a FrameState
 * in the narrow context of these specs.
 */
function createMockFrameState() {
  // Dummy objects that contain the properties and functions
  // that are somewhere assumed to be present...
  const mockShaderProgram = new ShaderProgram({
    vertexShaderText: "",
    fragmentShaderText: "",
  });
  mockShaderProgram._cachedShader = {
    cache: {
      releaseShaderProgram: () => {},
    },
  };
  const mockGl = {
    createTexture: () => {
      return -1;
    },
    createBuffer: () => {
      return -1;
    },
    activeTexture: () => {},
    bindBuffer: () => {},
    bufferData: () => {},
    pixelStorei: () => {},
    bindTexture: () => {},
    deleteTexture: () => {},
    texParameteri: () => {},
    texImage2D: () => {},
  };
  const frameState = {
    context: {
      id: "MOCK_CONTEXT_ID",
      uniformState: {
        view3D: new Matrix4(),
      },
      createPickId: () => {
        return {
          name: "MOCK_PICK_ID",
          destroy: () => {},
        };
      },
      shaderCache: {
        getShaderProgram: () => {
          return mockShaderProgram;
        },
      },
      _gl: mockGl,
    },
    passes: {},
    afterRender: [],
    brdfLutGenerator: {
      update: () => {},
    },
    fog: {},
  };
  return frameState;
}

/**
 * Implementation of a 'RequestListener' that just counts how often
 * each method is called, only for the specs.
 */
class CountingRequestListener {
  constructor() {
    this.requestAttemptedCount = 0;
    this.requestStartedCount = 0;
    this.requestCancelledCount = 0;
    this.requestCompletedCount = 0;
    this.requestFailedCount = 0;
  }
  /** @inheritdoc */
  requestAttempted(request) {
    this.requestAttemptedCount++;
  }
  /** @inheritdoc */
  requestStarted(request) {
    this.requestStartedCount++;
  }
  /** @inheritdoc */
  requestCancelled(request) {
    this.requestCancelledCount++;
  }
  /** @inheritdoc */
  requestCompleted(request) {
    this.requestCompletedCount++;
  }
  /** @inheritdoc */
  requestFailed(request) {
    this.requestFailedCount++;
  }
}

/**
 * Wait util the content from the given content handle is "ready".
 *
 * This will poll the content handle until its content is available
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
  if (contentHandle.failed) {
    console.error("Failed to load content for spec");
    return Promise.reject(new Error("Failed to load content for spec"));
  }
  return pollToPromise(() => {
    // The _content is created once the response was received
    const currentContent = contentHandle._content;
    if (!defined(currentContent)) {
      //console.log("No content yet");
      return false;
    }

    // Has to be set to avoid the use of workers...
    currentContent._model._loader._asynchronous = false;

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

describe("Scene/Dynamic3DTileContent", function () {
  beforeEach(function () {
    initializeMockContextLimits();

    // These two lines missing took me about 5 hours
    // of pain-in-the-ass debugging for a single
    // (fairly useless) spec. We're having fun, right?
    RequestScheduler.clearForSpecs();
    ResourceCache.clearForSpecs();
  });

  beforeAll(function () {
    CesiumBufferMocks.setup();
  });

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
  // Tileset statistics tracking
  //
  // Note: These already are some sort of an "integration tests".
  //
  // The statistics tracking is set up in the Dynamic3DTileContent class.
  // The functions that update the statistics are an implementation of
  // the "RequestListener" interface. There are dedicated tests for the
  // RequestListener handling in the RequestHandle specs.

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
    resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfArrayBuffer());

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
    ResourceFetchArrayBufferPromiseMock.setupSequence([undefined]);

    // Expect there to be NO active contents
    // Expect there to be NO pending request
    // Expect there to be ONE attempted request
    const activeContentsA = content._activeContents;
    expect(activeContentsA).toEqual([]);
    expect(tileset.statistics.numberOfPendingRequests).toBe(0);
    expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
  });

  it("tracks the number of loaded bytes in the tileset statistics", async function () {
    // The following highly specific convoluted code that involves
    // lots of mocks of internal/private functions and brittle
    // promise handling checks... *drumroll*...
    // AN ADDITION.
    // Yes. That obscure statistics update that is done
    // somewhere, under some conditions, based on something.
    // We want "good test coverage", right? RIGHT?
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

    // Mock the fetchArrayBuffer call...
    ResourceFetchArrayBufferPromiseMock.createSingleResolved(
      "http://example.com/exampleContent-2025-09-25-revision0.glb",
      createSimpleGltfArrayBuffer(),
    );

    // Set up the mocking. Try to get the content to ensure that
    // there is a request that is immediately resolved. Wait
    // for the "update" calls to create the structures that
    // the content consists of, using the mocked frame state.
    // At some point, some functions will be called that should
    // update the model statistics by executing the
    // PrimitiveStatisticsPipelineStage. The model statistics
    // will be returned by the Cesium3DTileContent implementation
    // of Model3DTileContent. The Dynamic3DTileContent does not
    // care about all that, but returns the model contents as
    // the inner contents, meaning that they are taken into account
    // when passing the Dynamic3DTileContent instances to the
    // Cesium3DTilesetStatistics.incrementLoadCounts function.
    // This is a deeeep rabbit hole.
    console.log(
      "------------------------------------------------------------- before",
    );
    const frameState = createMockFrameState();
    const contentHandle = content._contentHandles.values().next().value;
    contentHandle.tryGetContent();
    await waitForContentHandleReady(contentHandle, tileset, frameState);
    console.log(
      "------------------------------------------------------------- after",
    );

    // Check that the loaded geometry and texture data is properly
    // reflected in the tileset statistics
    expect(tileset.statistics.geometryByteLength).toBe(144 + 12);
    expect(tileset.statistics.texturesByteLength).toBe(1024);

    // Reset the content handle, causing the content to be unloaded
    contentHandle.reset();

    // Check that the loaded geometry and texture data is properly
    // reflected in the tileset statistics
    expect(tileset.statistics.geometryByteLength).toBe(0);
    expect(tileset.statistics.texturesByteLength).toBe(0);
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
});

//============================================================================

//============================================================================
// RequestHandle:

describe("Scene/Dynamic3DTileContent/RequestHandle", function () {
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
    resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfArrayBuffer());

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
      ResourceFetchArrayBufferPromiseMock.createUnbound(),
    );
    resourceFetchArrayBufferPromiseMocks.push(undefined); // Pretend throttling kicks in here...
    resourceFetchArrayBufferPromiseMocks.push(
      ResourceFetchArrayBufferPromiseMock.createUnbound(),
    );
    resourceFetchArrayBufferPromiseMocks.push(
      ResourceFetchArrayBufferPromiseMock.createUnbound(),
    );
    ResourceFetchArrayBufferPromiseMock.setupSequence(
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

  it("informs listeners about attempted requests due to throttling", async function () {
    const resource = new Resource({ url: "http://example.com/SPEC_DATA.glb" });
    const requestHandle = new RequestHandle(resource);

    // Create a mock to return 'undefined' in the first 'fetchArrayBuffer' call,
    // emulating throttling, but being resolveable in the second call
    const resourceFetchArrayBufferPromiseMocks = [];
    resourceFetchArrayBufferPromiseMocks.push(undefined);
    const resourceFetchArrayBufferPromiseMock =
      ResourceFetchArrayBufferPromiseMock.createUnbound();
    resourceFetchArrayBufferPromiseMocks.push(
      resourceFetchArrayBufferPromiseMock,
    );
    ResourceFetchArrayBufferPromiseMock.setupSequence(
      resourceFetchArrayBufferPromiseMocks,
    );

    // Add the listener that will track the method calls for the spec
    const countingRequestListener = new CountingRequestListener();
    requestHandle.addRequestListener(countingRequestListener);

    // Fetch the result promise to wait for
    const resultPromise = requestHandle.getResultPromise();

    // Nothing has happened until now
    expect(countingRequestListener.requestAttemptedCount).toBe(0);
    expect(countingRequestListener.requestStartedCount).toBe(0);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);

    // Ensure that there is a pending request (this will
    // be throttled)
    requestHandle.ensureRequested();

    // Ensure that request was attempted (but was not scheduled
    // and never started, due to throttling)
    expect(countingRequestListener.requestAttemptedCount).toBe(1);
    expect(countingRequestListener.requestStartedCount).toBe(0);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);

    // Ensure that there is a pending request AGAIN - it will
    // not be throttled this time
    requestHandle.ensureRequested();

    // Ensure that the request now actually started
    expect(countingRequestListener.requestAttemptedCount).toBe(1);
    expect(countingRequestListener.requestStartedCount).toBe(1);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);

    // Resolve the pending request
    resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfArrayBuffer());

    // Wait for the result promise to be resolved
    try {
      await resultPromise;
    } catch (error) {
      // Ignored for spec
    }

    // Ensure that one request was attempted (due to throttling),
    // and only one started and was completed
    expect(countingRequestListener.requestAttemptedCount).toBe(1);
    expect(countingRequestListener.requestStartedCount).toBe(1);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(1);
    expect(countingRequestListener.requestFailedCount).toBe(0);
  });

  it("informs listeners about cancelled requests", async function () {
    const resource = new Resource({ url: "http://example.com/SPEC_DATA.glb" });
    const requestHandle = new RequestHandle(resource);

    // Add the listener that will track the method calls for the spec
    const countingRequestListener = new CountingRequestListener();
    requestHandle.addRequestListener(countingRequestListener);

    // Fetch the result promise to wait for
    const resultPromise = requestHandle.getResultPromise();

    // Nothing has happened until now
    expect(countingRequestListener.requestAttemptedCount).toBe(0);
    expect(countingRequestListener.requestStartedCount).toBe(0);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);

    // Ensure that there is a pending request
    requestHandle.ensureRequested();

    // Ensure that request has started
    expect(countingRequestListener.requestAttemptedCount).toBe(0);
    expect(countingRequestListener.requestStartedCount).toBe(1);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);

    // Cancel the pending request
    requestHandle.cancel();

    // Wait for the result promise to be resolved
    try {
      await resultPromise;
    } catch (error) {
      // Ignored for spec
    }

    // Ensure that one request has started, was attempted, and cancelled
    expect(countingRequestListener.requestAttemptedCount).toBe(1);
    expect(countingRequestListener.requestStartedCount).toBe(1);
    expect(countingRequestListener.requestCancelledCount).toBe(1);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);
  });

  it("informs listeners about failed requests", async function () {
    const resource = new Resource({ url: "http://example.com/SPEC_DATA.glb" });
    const requestHandle = new RequestHandle(resource);

    // Create a promise mock to manually resolve the
    // resource request
    const resourceFetchArrayBufferPromiseMock =
      ResourceFetchArrayBufferPromiseMock.create();

    // Add the listener that will track the method calls for the spec
    const countingRequestListener = new CountingRequestListener();
    requestHandle.addRequestListener(countingRequestListener);

    // Fetch the result promise to wait for
    const resultPromise = requestHandle.getResultPromise();

    // Nothing has happened until now
    expect(countingRequestListener.requestAttemptedCount).toBe(0);
    expect(countingRequestListener.requestStartedCount).toBe(0);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);

    // Ensure that there is a pending request
    requestHandle.ensureRequested();

    // Ensure that request has started
    expect(countingRequestListener.requestAttemptedCount).toBe(0);
    expect(countingRequestListener.requestStartedCount).toBe(1);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);

    // Reject the pending request
    resourceFetchArrayBufferPromiseMock.reject("SPEC_REJECTION");

    // Wait for the result promise to be resolved
    try {
      await resultPromise;
    } catch (error) {
      // Ignored for spec
    }

    // Ensure that one request has started, was attempted, and failed
    expect(countingRequestListener.requestAttemptedCount).toBe(1);
    expect(countingRequestListener.requestStartedCount).toBe(1);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(1);
  });

  it("informs listeners about completed requests", async function () {
    const resource = new Resource({ url: "http://example.com/SPEC_DATA.glb" });
    const requestHandle = new RequestHandle(resource);

    // Create a promise mock to manually resolve the
    // resource request
    const resourceFetchArrayBufferPromiseMock =
      ResourceFetchArrayBufferPromiseMock.create();

    // Add the listener that will track the method calls for the spec
    const countingRequestListener = new CountingRequestListener();
    requestHandle.addRequestListener(countingRequestListener);

    // Fetch the result promise to wait for
    const resultPromise = requestHandle.getResultPromise();

    // Nothing has happened until now
    expect(countingRequestListener.requestAttemptedCount).toBe(0);
    expect(countingRequestListener.requestStartedCount).toBe(0);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);

    // Ensure that there is a pending request
    requestHandle.ensureRequested();

    // Ensure that request has started
    expect(countingRequestListener.requestAttemptedCount).toBe(0);
    expect(countingRequestListener.requestStartedCount).toBe(1);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(0);
    expect(countingRequestListener.requestFailedCount).toBe(0);

    // Now resolve the pending request
    resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfArrayBuffer());

    // Wait for the result promise to be resolved
    try {
      await resultPromise;
    } catch (error) {
      // Ignored for spec
    }

    // Ensure that one request has started and was completed
    expect(countingRequestListener.requestAttemptedCount).toBe(0);
    expect(countingRequestListener.requestStartedCount).toBe(1);
    expect(countingRequestListener.requestCancelledCount).toBe(0);
    expect(countingRequestListener.requestCompletedCount).toBe(1);
    expect(countingRequestListener.requestFailedCount).toBe(0);
  });
});

//============================================================================

//============================================================================
// ContentHandle:

describe("Scene/Dynamic3DTileContent/ContentHandle", function () {
  beforeEach(function () {
    initializeMockContextLimits();
  });

  it("___XXX_DYNAMIC Experiments with buffer mocking", async function () {
    const tilesetResource = new Resource({ url: "http://example.com" });
    const tileset = createMockTileset(basicDynamicExampleExtensionObject);
    const tile = tileset._root;
    const frameState = createMockFrameState();

    const contentHeader = {
      uri: "exampleContent.glb",
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
        console.log("contentLoadedAndReady", content);
        contentLoadedAndReadyCallCount++;
      },
      contentUnloaded(content) {
        console.log("contentUnloaded", content);
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
      ResourceFetchArrayBufferPromiseMock.createSingle(
        "http://example.com/exampleContent.glb",
      );

    // Try to get the content (it's not there yet...)
    contentHandle.tryGetContent();

    // Now resolve the pending request...
    resourceFetchArrayBufferPromiseMock.resolve(
      generateJsonBuffer(createEmbeddedGltf()).buffer,
    );

    // Wait for the content to become "ready"
    await waitForContentHandleReady(contentHandle, tileset, frameState);

    // Expect the listener to have been informed
    expect(contentLoadedAndReadyCallCount).toBe(1);
  });

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
    resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfArrayBuffer());

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
    resourceFetchArrayBufferPromiseMock.resolve(createDummyGltfArrayBuffer());

    // Wait for the content to become "ready"
    await waitForContentHandleReady(contentHandle, tileset, frameState);

    // Reset the handle to unload the content
    contentHandle.reset();

    // Expect the listener to have been informed
    expect(contentLoadedAndReadyCallCount).toBe(1);
    expect(contentUnloadedCallCount).toBe(1);
  });
});
//============================================================================

//============================================================================
// NDMap

describe("Scene/Dynamic3DTileContent/NDMap", function () {
  it("constructor throws for empty dimensionNames array", async function () {
    expect(function () {
      /*eslint-disable no-unused-vars*/
      const map = new NDMap([]);
      /*eslint-enable no-unused-vars*/
    }).toThrowDeveloperError();
  });

  it("constructor throws for duplicates in dimensionNames", async function () {
    expect(function () {
      /*eslint-disable no-unused-vars*/
      const map = new NDMap(["dimA", "dimB", "dimB"]);
      /*eslint-enable no-unused-vars*/
    }).toThrowDeveloperError();
  });

  it("basic set and get works", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // The map is initially empty
    expect(map.size).toBe(0);

    // Add an entry
    const key0a = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0a, "value0");

    // The size is now 1
    expect(map.size).toBe(1);

    // Fetch the first entry
    const key0b = {
      dimA: 12,
      dimB: 23,
      unused: 45,
    };
    const value0 = map.get(key0b);
    expect(value0).toBe("value0");
  });

  it("properly sets values for existing keys", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // The map is initially empty
    expect(map.size).toBe(0);

    // Add an entry
    const key0 = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0, "value0a");

    // The size is now 1
    expect(map.size).toBe(1);

    // Overwrite the entry with a new value
    map.set(key0, "value0b");

    // The size is now 1
    expect(map.size).toBe(1);

    // Fetch the the value of the entry
    const key0b = {
      dimA: 12,
      dimB: 23,
      unused: 45,
    };
    const value0 = map.get(key0b);
    expect(value0).toBe("value0b");
  });

  it("properly reports key presence and handles deletion", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // The map is initially empty
    expect(map.size).toBe(0);

    // Add an entry
    const key0a = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0a, "value0");

    // The size is now 1
    expect(map.size).toBe(1);

    // Define a key that is equivalent to the first one
    const key0b = {
      dimA: 12,
      dimB: 23,
      unused: 45,
    };

    // Ensure that the map has the key
    const actualHasB = map.has(key0b);
    expect(actualHasB).toBe(true);

    // Delete the key
    map.delete(key0b);

    // The size is now 0
    expect(map.size).toBe(0);

    // Expect the key to no longer be present
    const actualHasA = map.has(key0a);
    expect(actualHasA).toBe(false);
  });

  it("ignores missing dimensions", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // Add an entry that is missing one dimension
    const key0 = {
      dimA: 12,
    };
    map.set(key0, "value0");

    // Expect the value to be fetched nevertheless
    const value0 = map.get(key0);
    expect(value0).toBe("value0");
  });

  it("provides all keys", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // Add some entries
    const key0 = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0, "value0");

    const key1 = {
      dimA: 23,
      dimB: 34,
      unused: 45,
    };
    map.set(key1, "value1");

    const key2 = {
      dimA: 34,
      dimB: 45,
      unused: 56,
    };
    map.set(key2, "value2");

    // The keys do not retain the unused properties
    const expectedKeys = [
      {
        dimA: 12,
        dimB: 23,
      },
      {
        dimA: 23,
        dimB: 34,
      },
      {
        dimA: 34,
        dimB: 45,
      },
    ];
    const actualKeys = [...map.keys()];
    expect(actualKeys).toEqual(expectedKeys);
  });

  it("provides all values", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // Add some entries
    const key0 = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0, "value0");

    const key1 = {
      dimA: 23,
      dimB: 34,
      unused: 45,
    };
    map.set(key1, "value1");

    const key2 = {
      dimA: 34,
      dimB: 45,
      unused: 56,
    };
    map.set(key2, "value2");

    const expectedValues = ["value0", "value1", "value2"];
    const actualValues = [...map.values()];
    expect(actualValues).toEqual(expectedValues);
  });

  it("provides all entries", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // Add some entries
    const key0 = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0, "value0");

    const key1 = {
      dimA: 23,
      dimB: 34,
      unused: 45,
    };
    map.set(key1, "value1");

    const key2 = {
      dimA: 34,
      dimB: 45,
      unused: 56,
    };
    map.set(key2, "value2");

    const expectedEntries = [
      [
        {
          dimA: 12,
          dimB: 23,
        },
        "value0",
      ],
      [
        {
          dimA: 23,
          dimB: 34,
        },
        "value1",
      ],
      [
        {
          dimA: 34,
          dimB: 45,
        },
        "value2",
      ],
    ];

    const actualEntries = [...map.entries()];
    expect(actualEntries).toEqual(expectedEntries);
  });

  it("clears all entries", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // The map is initially empty
    expect(map.size).toBe(0);

    // Add some entries
    const key0 = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0, "value0");

    const key1 = {
      dimA: 23,
      dimB: 34,
      unused: 45,
    };
    map.set(key1, "value1");

    const key2 = {
      dimA: 34,
      dimB: 45,
      unused: 56,
    };
    map.set(key2, "value2");

    // The map now has a size of 3
    expect(map.size).toBe(3);

    // Clear the map
    map.clear();

    // The map now has a size of 0
    expect(map.size).toBe(0);
  });

  it("is iterable over its entries", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // Add some entries
    const key0 = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0, "value0");

    const key1 = {
      dimA: 23,
      dimB: 34,
      unused: 45,
    };
    map.set(key1, "value1");

    const key2 = {
      dimA: 34,
      dimB: 45,
      unused: 56,
    };
    map.set(key2, "value2");

    const expectedEntries = [
      [
        {
          dimA: 12,
          dimB: 23,
        },
        "value0",
      ],
      [
        {
          dimA: 23,
          dimB: 34,
        },
        "value1",
      ],
      [
        {
          dimA: 34,
          dimB: 45,
        },
        "value2",
      ],
    ];

    const actualEntries = [...map];
    expect(actualEntries).toEqual(expectedEntries);
  });

  it("iterates over entries in forEach", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // Add some entries
    const key0 = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0, "value0");

    const key1 = {
      dimA: 23,
      dimB: 34,
      unused: 45,
    };
    map.set(key1, "value1");

    const key2 = {
      dimA: 34,
      dimB: 45,
      unused: 56,
    };
    map.set(key2, "value2");

    const expectedEntries = [
      [
        {
          dimA: 12,
          dimB: 23,
        },
        "value0",
      ],
      [
        {
          dimA: 23,
          dimB: 34,
        },
        "value1",
      ],
      [
        {
          dimA: 34,
          dimB: 45,
        },
        "value2",
      ],
    ];

    const actualEntries = [];
    map.forEach((e) => {
      actualEntries.push(e);
    });
    expect(actualEntries).toEqual(expectedEntries);
  });

  it("gets an existing value instead of computing a default", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // The map is initially empty
    expect(map.size).toBe(0);

    // Add an entry
    const key0a = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    map.set(key0a, "value0a");

    // Query the value for an equivalent key
    // (not computing a default)
    const key0b = {
      dimA: 12,
      dimB: 23,
      unused: 99,
    };
    const value0 = map.getOrInsertComputed(key0b, () => "computedValue0");
    expect(value0).toBe("value0a");
  });

  it("computes a default only once", async function () {
    const map = new NDMap(["dimA", "dimB"]);

    // The map is initially empty
    expect(map.size).toBe(0);

    // Query the value for a key that does not exist,
    // computing the default
    const key0a = {
      dimA: 12,
      dimB: 23,
      unused: 34,
    };
    const value0a = map.getOrInsertComputed(key0a, () => "computedValue0a");
    expect(value0a).toBe("computedValue0a");

    // Query an equivalent key
    const key0b = {
      dimA: 12,
      dimB: 23,
      unused: 99,
    };
    const value0b = map.get(key0b);
    expect(value0b).toBe("computedValue0a");

    // Query an equivalent key, not computing the default
    const value0b2 = map.getOrInsertComputed(key0b, () => "computedValue0b");
    expect(value0b2).toBe("computedValue0a");

    // Just verify the map size again...
    expect(map.size).toBe(1);
  });
});

//============================================================================

//============================================================================
// LRUCache

describe("Scene/Dynamic3DTileContent/LRUCache", function () {
  it("constructor throws for non-positive maximum size", async function () {
    expect(function () {
      /*eslint-disable no-unused-vars*/
      const map = new LRUCache(0);
      /*eslint-enable no-unused-vars*/
    }).toThrowDeveloperError();
  });

  it("has the basic functionality of a map (with infinite size)", async function () {
    const m = new LRUCache(Number.POSITIVE_INFINITY);
    expect(m.size).toBe(0);

    m.set("key0", "value0a");
    expect(m.size).toBe(1);

    m.set("key0", "value0b");
    expect(m.size).toBe(1);

    expect(m.get("key0")).toBe("value0b");
    expect(m.has("key0")).toBeTrue();
    expect(m.has("keyX")).toBeFalse();

    m.set("key1", "value1");
    m.set("key2", "value2");
    expect(m.size).toBe(3);

    const expectedKeys = ["key0", "key1", "key2"];
    const actualKeys = [...m.keys()];
    expect(actualKeys).toEqual(expectedKeys);

    const expectedValues = ["value0b", "value1", "value2"];
    const actualValues = [...m.values()];
    expect(actualValues).toEqual(expectedValues);

    const expectedEntries = [
      ["key0", "value0b"],
      ["key1", "value1"],
      ["key2", "value2"],
    ];
    const actualEntries = [...m.entries()];
    expect(actualEntries).toEqual(expectedEntries);

    m.clear();
    expect(m.size).toBe(0);
  });

  it("properly evicts oldest element", async function () {
    const evictedKeys = [];
    const m = new LRUCache(2, (k, v) => {
      evictedKeys.push(k);
    });
    expect(m.size).toBe(0);

    m.set("key0", "value0");
    m.set("key1", "value1");
    m.set("key2", "value2");

    expect(evictedKeys).toEqual(["key0"]);
  });

  it("properly detects access as usage for LRU", async function () {
    const evictedKeys = [];
    const m = new LRUCache(2, (k, v) => {
      evictedKeys.push(k);
    });
    expect(m.size).toBe(0);

    m.set("key0", "value0");
    m.set("key1", "value1");

    // Move key0 up in the LRU sequence
    m.get("key0");
    m.set("key2", "value2");

    expect(evictedKeys).toEqual(["key1"]);
  });

  it("trimToSize evicts the oldest elements", async function () {
    const evictedKeys = [];
    const m = new LRUCache(Number.POSITIVE_INFINITY, (k, v) => {
      evictedKeys.push(k);
    });
    expect(m.size).toBe(0);

    m.set("key0", "value0");
    m.set("key1", "value1");
    m.set("key2", "value2");
    m.set("key3", "value3");

    expect(m.size).toBe(4);
    expect(evictedKeys).toEqual([]);

    m.trimToSize(2);

    expect(m.size).toBe(2);
    expect(evictedKeys).toEqual(["key0", "key1"]);

    m.set("key0", "value0");

    expect(m.size).toBe(3);
    expect([...m.keys()]).toEqual(["key2", "key3", "key0"]);

    expect(evictedKeys).toEqual(["key0", "key1"]);
  });

  it("setMaximumSize evicts the oldest elements and establishes the size constraint", async function () {
    const evictedKeys = [];
    const m = new LRUCache(Number.POSITIVE_INFINITY, (k, v) => {
      evictedKeys.push(k);
    });
    expect(m.size).toBe(0);

    m.set("key0", "value0");
    m.set("key1", "value1");
    m.set("key2", "value2");
    m.set("key3", "value3");

    expect(m.size).toBe(4);
    expect(evictedKeys).toEqual([]);

    m.setMaximumSize(2);

    expect(m.size).toBe(2);
    expect(evictedKeys).toEqual(["key0", "key1"]);

    m.set("key0", "value0");

    expect(m.size).toBe(2);
    expect(evictedKeys).toEqual(["key0", "key1", "key2"]);
  });
});
