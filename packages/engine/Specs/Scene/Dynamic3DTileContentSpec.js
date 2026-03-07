import { Cartesian3, Math as CesiumMath, Matrix4 } from "../../index.js";
import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

// These are not written into the index.js. See "build.js".
import { LRUCache } from "../../Source/Scene/Dynamic3DTileContent.js";

/**
 * Move the camera to look at the spec tileset.
 *
 * This is a bit of copy-and-paste from other specs and could/should
 * be a configurable helper function in the "/Specs" directory:
 *
 * Moves the camera to look down (along -Z) at the origin, at
 * an unspecified position (but just right for the spec tileset).
 *
 * @param {Camera} camera
 */
function fitCameraForSpec(camera) {
  const centerX = 1.5;
  const centerY = -1.5;
  const distanceZ = 15;
  const fov = CesiumMath.PI_OVER_THREE;
  camera.frustum.fov = fov;
  camera.frustum.near = 0.01;
  camera.frustum.far = 100.0;
  const unitDistance = 1.0 / (2.0 * Math.tan(fov * 0.5));
  const distance = distanceZ ?? unitDistance;
  // This is either important or unnecessary: Reset the
  // lookAtTransform, because it completely messes up
  // the internal state of the camera. Better be safe.
  camera.lookAtTransform(Matrix4.IDENTITY);
  camera.position = new Cartesian3(centerX, centerY, distance);
  camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
  camera.up = Cartesian3.clone(Cartesian3.UNIT_Y, new Cartesian3());
  camera.right = Cartesian3.clone(Cartesian3.UNIT_X, new Cartesian3());
}

/**
 * Calls "scene.renderForSpecs" repeatedly, kicking off the process
 * that causes the content.update function to be called, which
 * requests content data, loads the content data, creates the
 * content, and updates the content, until it becomes "ready".
 *
 * Returns a promise that is resolved when
 * - the number of active and loaded contents
 *   is less than the given expected number
 * - OR all the active and loaded contents are "ready"
 *
 * @param {Scene} scene The scene
 * @param {Dynamic3DTileContent} content The content
 * @param {number} expectedActiveCount The expected number of active contents
 * @returns The promise
 */
async function waitForActiveLoadedContentsReady(
  scene,
  content,
  expectedActiveCount,
) {
  return pollToPromise(function () {
    scene.renderForSpecs();
    const activeContents = content._activeLoadedContents;
    if (activeContents.length < expectedActiveCount) {
      return false;
    }
    let allReady = true;
    for (const content of activeContents) {
      allReady &= content.ready;
    }
    scene.renderForSpecs();
    return allReady;
  });
}

describe(
  "Scene/Dynamic3DTileContent",
  function () {
    let scene;

    // The default tileset for these specs
    const dynamicContentTilesetUrl =
      "./Data/Cesium3DTiles/Dynamic/Dynamic/tileset.json";

    // The same as the default tileset, but with one content
    // having a URI for which no content file exists
    const invalidDynamicContentTilesetUrl =
      "./Data/Cesium3DTiles/Dynamic/Dynamic/tilesetWithInvalidContent.json";

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      // Cross fingers
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("considers all content URIs that are given in the content JSON", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        dynamicContentTilesetUrl,
      );

      // Pretend this was a unit test
      fitCameraForSpec(scene.camera);
      await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      const content = tileset.root.content;

      const allActual = content._allContentUris;
      const allExpected = [
        "content-2025-09-25-revision0.glb",
        "content-2025-09-26-revision0.glb",
        "content-2025-09-27-revision0.glb",
        "content-2025-09-25-revision1.glb",
        "content-2025-09-26-revision1.glb",
        "content-2025-09-27-revision1.glb",
        "content-2025-09-25-revision2.glb",
        "content-2025-09-26-revision2.glb",
        "content-2025-09-27-revision2.glb",
      ];

      expect(allActual).toEqual(allExpected);
    });

    it("does not consider any content to be 'active' without a dynamicContentUriCondition", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        dynamicContentTilesetUrl,
      );

      // For spec: No dynamicContentUriCondition
      tileset.dynamicContentUriCondition = undefined;

      // Pretend this was a unit test
      fitCameraForSpec(scene.camera);
      await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      const content = tileset.root.content;

      // There should be no active URIs without a dynamicContentUriCondition
      const activeActual = content._activeContentUris;
      const activeExpected = [];
      expect(activeActual).toEqual(activeExpected);
    });

    it("considers contents to be active when the dynamicContentUriCondition returns true", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        dynamicContentTilesetUrl,
      );

      // Assign the dynamic content URI condition. The properties
      // of this object will be changed, and the spec will check that
      // the corresponding content URIs become "active"
      const dynamicContentProperties = {};
      const dynamicContentsUriCondition = (keys) => {
        if (
          keys.exampleTimeStamp !== dynamicContentProperties.exampleTimeStamp
        ) {
          return false;
        }
        if (keys.exampleRevision !== dynamicContentProperties.exampleRevision) {
          return false;
        }
        return true;
      };
      tileset.dynamicContentUriCondition = dynamicContentsUriCondition;

      // Pretend this was a unit test
      fitCameraForSpec(scene.camera);
      await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      const content = tileset.root.content;

      // When the "exampleRevision" is invalid, no URI is active
      dynamicContentProperties.exampleTimeStamp = "2025-09-25";
      dynamicContentProperties.exampleRevision = "DOES_NOT_EXIST";
      const activeActual0 = content._activeContentUris;
      const activeExpected0 = [];
      expect(activeActual0).toEqual(activeExpected0);

      // For valid properties, the corresponding content URI is active
      dynamicContentProperties.exampleTimeStamp = "2025-09-25";
      dynamicContentProperties.exampleRevision = "revision0";
      const activeActual1 = content._activeContentUris;
      const activeExpected1 = ["content-2025-09-25-revision0.glb"];
      expect(activeActual1).toEqual(activeExpected1);

      // For other valid properties, the corresponding content URI is active
      dynamicContentProperties.exampleTimeStamp = "2025-09-26";
      dynamicContentProperties.exampleRevision = "revision1";
      const activeActual2 = content._activeContentUris;
      const activeExpected2 = ["content-2025-09-26-revision1.glb"];
      expect(activeActual2).toEqual(activeExpected2);
    });

    it("updates the tileset statistics byte lengths for loaded and unloaded content", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        dynamicContentTilesetUrl,
      );

      // Assign the dynamic content URI condition. The properties
      // of this object will be changed, and the spec will check that
      // the corresponding content URIs become "active"
      const dynamicContentProperties = {};
      const dynamicContentsUriCondition = (keys) => {
        if (
          keys.exampleTimeStamp !== dynamicContentProperties.exampleTimeStamp
        ) {
          return false;
        }
        if (keys.exampleRevision !== dynamicContentProperties.exampleRevision) {
          return false;
        }
        return true;
      };
      tileset.dynamicContentUriCondition = dynamicContentsUriCondition;

      // Pretend this was a unit test
      fitCameraForSpec(scene.camera);
      await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      const content = tileset.root.content;

      // The texture- and geometry sizes of the tile content
      // in the spec tileset
      const singleTextureByteLength = 1048576;
      const singleGeometryByteLength = 156;

      // Activate one specific content and wait for it to be ready
      dynamicContentProperties.exampleTimeStamp = "2025-09-25";
      dynamicContentProperties.exampleRevision = "revision0";
      await waitForActiveLoadedContentsReady(scene, content, 1);

      // Expect the active content to be taken into account
      // in the tileset statistics
      expect(tileset.statistics.geometryByteLength).toEqual(
        singleGeometryByteLength,
      );
      expect(tileset.statistics.texturesByteLength).toEqual(
        singleTextureByteLength,
      );

      // Activate another content and wait for it to be ready
      dynamicContentProperties.exampleTimeStamp = "2025-09-26";
      dynamicContentProperties.exampleRevision = "revision1";
      await waitForActiveLoadedContentsReady(scene, content, 1);

      // Expect the statistics to reflect the size of BOTH contents
      // (they are both loaded and in memory!)
      expect(tileset.statistics.geometryByteLength).toEqual(
        singleGeometryByteLength * 2,
      );
      expect(tileset.statistics.texturesByteLength).toEqual(
        singleTextureByteLength * 2,
      );

      // For spec: Force unloading the first content
      content._loadedContentHandles.trimToSize(1);

      // There should now only be ONE content tracked in the statistics
      await waitForActiveLoadedContentsReady(scene, content, 1);
      expect(tileset.statistics.geometryByteLength).toEqual(
        singleGeometryByteLength,
      );
      expect(tileset.statistics.texturesByteLength).toEqual(
        singleTextureByteLength,
      );
    });

    it("tracks the 'attempted' (i.e. failed) requests in the tileset statistics for whatever reason", async function () {
      // For spec: Try to load the  tileset with the invalid content
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        invalidDynamicContentTilesetUrl,
      );

      // Assign the dynamic content URI condition. The properties
      // of this object will be changed, and the spec will check that
      // the corresponding content URIs become "active"
      const dynamicContentProperties = {};
      const dynamicContentsUriCondition = (keys) => {
        if (
          keys.exampleTimeStamp !== dynamicContentProperties.exampleTimeStamp
        ) {
          return false;
        }
        if (keys.exampleRevision !== dynamicContentProperties.exampleRevision) {
          return false;
        }
        return true;
      };
      tileset.dynamicContentUriCondition = dynamicContentsUriCondition;

      // Pretend this was a unit test
      fitCameraForSpec(scene.camera);
      await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      const content = tileset.root.content;

      // Set the content properties for a VALID content URI
      dynamicContentProperties.exampleTimeStamp = "2025-09-25";
      dynamicContentProperties.exampleRevision = "revision0";

      // Try to "render", and Wait until the pending request is resolved
      scene.renderForSpecs();
      await content.waitForSpecs();

      // Check that the expected (valid) content URI is active, and there
      // are no "attempted" (i.e. failed) requests
      const activeActual = content._activeContentUris;
      const activeExpected = ["content-2025-09-25-revision0.glb"];
      expect(activeActual).toEqual(activeExpected);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(0);

      // Set the content properties for an INVALID content URI
      dynamicContentProperties.exampleTimeStamp = "2025-09-27";
      dynamicContentProperties.exampleRevision = "revision0";

      // Try to "render", and Wait until the pending request is resolved
      scene.renderForSpecs();
      await content.waitForSpecs();

      // Check that the expected (invalid) content URI is active, and there
      // are is one "attempted" (i.e. failed) request
      const activeActual1 = content._activeContentUris;
      const activeExpected1 = [
        "INVALID-URI-FOR-content-2025-09-27-revision0.glb-FOR-SPEC",
      ];
      expect(activeActual1).toEqual(activeExpected1);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
    });

    it("provides the right content metadata for the active content", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        dynamicContentTilesetUrl,
      );

      // Assign the dynamic content URI condition. The properties
      // of this object will be changed, and the spec will check that
      // the corresponding content URIs become "active"
      const dynamicContentProperties = {};
      const dynamicContentsUriCondition = (keys) => {
        if (
          keys.exampleTimeStamp !== dynamicContentProperties.exampleTimeStamp
        ) {
          return false;
        }
        if (keys.exampleRevision !== dynamicContentProperties.exampleRevision) {
          return false;
        }
        return true;
      };
      tileset.dynamicContentUriCondition = dynamicContentsUriCondition;

      // Pretend this was a unit test
      fitCameraForSpec(scene.camera);
      await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      const content = tileset.root.content;

      // Activate one specific content and wait for it to be ready
      dynamicContentProperties.exampleTimeStamp = "2025-09-25";
      dynamicContentProperties.exampleRevision = "revision0";
      await waitForActiveLoadedContentsReady(scene, content, 1);

      // Check that the metadata of the activated content is provided
      const activeLoadedContentA = content._activeLoadedContents[0];
      const metadataA = activeLoadedContentA.metadata;
      expect(metadataA).toBeDefined();
      expect(metadataA.getProperty("exampleFloatProperty")).toEqual(0.0);
      expect(metadataA.getProperty("exampleStringProperty")).toEqual(
        "Example_0_0",
      );

      // Activate another content and wait for it to be ready
      dynamicContentProperties.exampleTimeStamp = "2025-09-26";
      dynamicContentProperties.exampleRevision = "revision1";
      await waitForActiveLoadedContentsReady(scene, content, 1);

      // Check that the metadata of the new activated content is provided
      const activeLoadedContentB = content._activeLoadedContents[0];
      const metadataB = activeLoadedContentB.metadata;
      expect(metadataB).toBeDefined();
      expect(metadataB.getProperty("exampleFloatProperty")).toEqual(1.1);
      expect(metadataB.getProperty("exampleStringProperty")).toEqual(
        "Example_1_1",
      );
    });

    it("destroys. That's simple...", function () {
      return Cesium3DTilesTester.tileDestroys(scene, dynamicContentTilesetUrl);
    });
  },
  "WebGL",
);

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
