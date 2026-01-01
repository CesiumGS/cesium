import { Cartesian3, Math as CesiumMath, Matrix4 } from "../../index.js";
import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

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

    it("XXX_DYNAMIC_WORKS", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        invalidDynamicContentTilesetUrl,
      );

      const dynamicContentProperties = {};
      const dynamicContentsPropertyProvider = () => {
        return dynamicContentProperties;
      };
      tileset.dynamicContentPropertyProvider = dynamicContentsPropertyProvider;
      /*
      const dynamicContentsPropertyProvider = () => {
        console.log("Here we go, providing properties");
        return  {
          exampleTimeStamp: '2025-09-25',
          exampleRevision: 'revision0'
        };
      };
      tileset.dynamicContentPropertyProvider = dynamicContentsPropertyProvider;
      */

      fitCameraForSpec(scene.camera);
      scene.renderForSpecs();
      await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      const content = tileset.root.content;

      const allActual = content._allContentUris;
      const allExpected = [
        "content-2025-09-25-revision0.glb",
        "content-2025-09-26-revision0.glb",
        "INVALID-URI-FOR-content-2025-09-27-revision0.glb-FOR-SPEC",
        "content-2025-09-25-revision1.glb",
        "content-2025-09-26-revision1.glb",
        "content-2025-09-27-revision1.glb",
        "content-2025-09-25-revision2.glb",
        "content-2025-09-26-revision2.glb",
        "content-2025-09-27-revision2.glb",
      ];

      expect(allActual).toEqual(allExpected);

      console.log("Here we go, something loaded?");

      dynamicContentProperties.exampleTimeStamp = "2025-09-25";
      dynamicContentProperties.exampleRevision = "revision0";
      await waitForActiveLoadedContentsReady(scene, content, 1);

      const activeActual = content._activeContentUris;
      const activeExpected = ["content-2025-09-25-revision0.glb"];
      expect(activeActual).toEqual(activeExpected);

      const singleTextureByteLength = 1048576;
      const singleGeometryByteLength = 156;

      await waitForActiveLoadedContentsReady(scene, content, 1);

      expect(tileset.statistics.geometryByteLength).toEqual(
        singleGeometryByteLength,
      );
      expect(tileset.statistics.texturesByteLength).toEqual(
        singleTextureByteLength,
      );

      console.log("Before failing:");
      console.log(tileset.statistics);

      dynamicContentProperties.exampleTimeStamp = "2025-09-27";
      dynamicContentProperties.exampleRevision = "revision0";
      const activeActual1 = content._activeContentUris;
      const activeExpected1 = [
        "INVALID-URI-FOR-content-2025-09-27-revision0.glb-FOR-SPEC",
      ];
      expect(activeActual1).toEqual(activeExpected1);

      scene.renderForSpecs();
      await content.waitForSpecs();

      console.log("After failing:");
      console.log(tileset.statistics);
      expect(tileset.statistics.numberOfAttemptedRequests).toBe(1);
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

    it("does not consider any content to be 'active' without a dynamicContentPropertyProvider", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        dynamicContentTilesetUrl,
      );

      // For spec: No dynamicContentPropertyProvider
      tileset.dynamicContentPropertyProvider = undefined;

      // Pretend this was a unit test
      fitCameraForSpec(scene.camera);
      await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      const content = tileset.root.content;

      // There should be no active URIs without a dynamicContentPropertyProvider
      const activeActual = content._activeContentUris;
      const activeExpected = [];
      expect(activeActual).toEqual(activeExpected);
    });

    it("does not consider any content to be 'active' when dynamicContentPropertyProvider returns undefined", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        dynamicContentTilesetUrl,
      );

      // For spec: The dynamicContentPropertyProvider returns undefined
      const dynamicContentsPropertyProvider = () => {
        return undefined;
      };
      tileset.dynamicContentPropertyProvider = dynamicContentsPropertyProvider;

      // Pretend this was a unit test
      fitCameraForSpec(scene.camera);
      await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
      const content = tileset.root.content;

      // There should be no active URIs for undefined content properties
      const activeActual = content._activeContentUris;
      const activeExpected = [];
      expect(activeActual).toEqual(activeExpected);
    });

    it("considers contents to be active when their key properties match the ones from the dynamicContentPropertyProvider", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        dynamicContentTilesetUrl,
      );

      // Assign the dynamic content properties provider. The properties
      // of this object will be changed, and the spec will check that
      // the corresponding content URIs become "active"
      const dynamicContentProperties = {};
      const dynamicContentsPropertyProvider = () => {
        return dynamicContentProperties;
      };
      tileset.dynamicContentPropertyProvider = dynamicContentsPropertyProvider;

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

      // Assign the dynamic content properties provider. The properties
      // of this object will be changed, and the spec will check that
      // the activation of the corresponding contents works
      const dynamicContentProperties = {};
      const dynamicContentsPropertyProvider = () => {
        return dynamicContentProperties;
      };
      tileset.dynamicContentPropertyProvider = dynamicContentsPropertyProvider;

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

      // Assign the dynamic content properties provider. The properties
      // of this object will be changed, and the spec will check that
      // the activation of the corresponding contents works
      const dynamicContentProperties = {};
      const dynamicContentsPropertyProvider = () => {
        return dynamicContentProperties;
      };
      tileset.dynamicContentPropertyProvider = dynamicContentsPropertyProvider;

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

    it("destroys. That's simple...", function () {
      return Cesium3DTilesTester.tileDestroys(scene, dynamicContentTilesetUrl);
    });

    // XXX_DYNAMIC From Multiple3DTileContent - try to shoehorn for Dynamic3DTileContent...
    /*
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
    });
    */
  },
  "WebGL",
);
